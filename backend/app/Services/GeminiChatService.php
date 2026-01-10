<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class GeminiChatService
{
    public function reply(array $context): string
    {
        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        $configuredModel = (string) config('services.gemini.model', 'gemini-1.5-flash-latest');
        $modelsToTry = $this->buildModelFallbackList($configuredModel);

        $system = <<<'PROMPT'
You are DressGenius, an expert fashion stylist.

You will receive JSON context including:
- intake (occasion, weather, dress_code, budget, desired_vibe)
- vision (detected outfit items/colors/description)
- analysis (score, pros, issues, suggestions)
- recent_messages (a short list of conversation messages)

Write a helpful response in plain text.
Rules:
- Be concise but actionable.
- Respect the user's intake constraints.
- If the user asks for more than you can infer, ask 1-2 clarifying questions.
PROMPT;

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $system],
                        ['text' => json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)],
                    ],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.6,
                'maxOutputTokens' => 700,
            ],
        ];

        $lastError = null;
        $lastStatus = null;

        foreach ($modelsToTry as $model) {
            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

            /** @var \Illuminate\Http\Client\Response $res */
            $res = Http::connectTimeout(8)->timeout(30)->post($url, $payload);

            if ($res->ok()) {
                $text = data_get($res->json(), 'candidates.0.content.parts.0.text');
                if (!is_string($text) || trim($text) === '') {
                    throw new \RuntimeException('Gemini returned an empty response.');
                }

                return trim($text);
            }

            $lastStatus = $res->status();
            $lastError = $res->body();

            if ($lastStatus === 404) {
                continue;
            }

            if ($lastStatus === 429) {
                throw new \RuntimeException(
                    'Gemini quota exceeded (429). Enable billing / adjust quotas in Google AI Studio, or choose a model with available limits. Details: '.$lastError
                );
            }

            throw new \RuntimeException('Gemini chat request failed: '.$lastStatus.' '.$lastError);
        }

        throw new \RuntimeException('Gemini chat request failed: '.($lastStatus ?? 0).' '.($lastError ?? 'Unknown error'));
    }

    private function buildModelFallbackList(string $configuredModel): array
    {
        $configuredModel = trim($configuredModel);

        $candidates = array_filter(array_map('trim', explode(',', $configuredModel)));
        $fallbacks = [
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
        ];

        $all = array_merge($candidates, $fallbacks);

        $normalized = [];
        foreach ($all as $m) {
            $m = preg_replace('/^models\//', '', $m);
            if ($m && !in_array($m, $normalized, true)) {
                $normalized[] = $m;
            }
        }

        return $normalized;
    }
}
