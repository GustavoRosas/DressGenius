<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GeminiChatService
{
    public function reply(array $context): string
    {
        $apiKey = config('services.gemini.api_key');
        $debug = (bool) config('services.gemini.debug', false);
        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        $configuredModel = (string) config('services.gemini.model', 'gemini-1.5-flash-latest');
        $modelsToTry = $this->buildModelFallbackList($configuredModel);

        $system = <<<'PROMPT'
You are DressGenius, an expert fashion stylist.

You will receive JSON context including:
- intake (occasion, weather, dress_code, budget, desired_vibe)
- ai_preferences (tone, strictness, detail, creativity, trendiness, comfort, weather, budget) as 0-100 sliders
- vision (detected outfit items/colors/description)
- analysis (score, pros, issues, suggestions)
- recent_messages (a short list of conversation messages)

Write a helpful response in plain text.
Rules:
- Be concise but actionable.
- Never cut off mid-sentence. If you are running out of space, finish the current sentence and provide a brief closing.
- Respect the user's intake constraints.
- Use ai_preferences as behavior controls:
  - tone: 0 = blunt/straight, 100 = warm/encouraging
  - strictness: 0 = flexible, 100 = strictly enforce occasion/dress-code fit
  - detail: 0 = brief, 100 = detailed
  - creativity: 0 = classic/safe, 100 = bold/experimental
  - trendiness: 0 = timeless, 100 = trend-forward
  - comfort: 0 = style-first, 100 = comfort-first
  - weather: 0 = ignore weather, 100 = heavily optimize for weather
  - budget: 0 = ignore budget, 100 = heavily optimize for budget
- Do NOT explicitly mention these preferences unless the user asks.
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
                'maxOutputTokens' => 2048,
            ],
        ];

        $lastError = null;
        $lastStatus = null;
        $lastApiVersion = null;
        $apiVersionsToTry = ['v1beta', 'v1'];

        foreach ($apiVersionsToTry as $apiVersion) {
            foreach ($modelsToTry as $model) {
                $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key={$apiKey}";

                /** @var \Illuminate\Http\Client\Response $res */
                $res = Http::connectTimeout(8)->timeout(30)->post($url, $payload);

                if ($res->ok()) {
                    $parts = (array) data_get($res->json(), 'candidates.0.content.parts', []);
                    $text = '';
                    foreach ($parts as $p) {
                        $t = data_get($p, 'text');
                        if (is_string($t)) {
                            $text .= $t;
                        }
                    }

                    if (trim($text) === '') {
                        throw new \RuntimeException('Gemini returned an empty response.');
                    }

                    return trim($text);
                }

                $lastApiVersion = $apiVersion;
                $lastStatus = $res->status();
                $lastError = $res->body();

                if ($debug) {
                    Log::warning('GeminiChatService reply failed', [
                        'api_version' => $apiVersion,
                        'model' => $model,
                        'status' => $lastStatus,
                        'error' => mb_substr((string) $lastError, 0, 1200),
                    ]);
                }

                if ($lastStatus === 404) {
                    continue;
                }

                if ($lastStatus === 400) {
                    continue;
                }

                if ($lastStatus === 429) {
                    throw new \RuntimeException(
                        'Gemini quota exceeded (429). Enable billing / adjust quotas in Google AI Studio, or choose a model with available limits. Details: '.$lastError
                    );
                }
            }
        }

        throw new \RuntimeException(
            'Gemini chat request failed: '.($lastStatus ?? 0).' (api='.($lastApiVersion ?? 'unknown').') '.($lastError ?? 'Unknown error')
        );
    }

    public function contextFeedback(array $context): array
    {
        $apiKey = config('services.gemini.api_key');
        $debug = (bool) config('services.gemini.debug', false);
        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        $configuredModel = (string) config('services.gemini.model', 'gemini-1.5-flash-latest');
        $modelsToTry = $this->buildModelFallbackList($configuredModel);

        $system = <<<'PROMPT'
You are DressGenius, an expert fashion stylist.

You will receive JSON context including:
- intake (occasion, weather, dress_code, budget, desired_vibe)
- ai_preferences (tone, strictness, detail, creativity, trendiness, comfort, weather, budget) as 0-100 sliders
- vision (detected outfit items/colors/description/style_tags)
- analysis (score, pros, issues, suggestions)

Task:
Evaluate the outfit AGAINST the user's intake fields.

Return ONLY valid JSON (no markdown) with this shape:
{
  "occasion": {"status": "positive|negative|neutral", "message": "..."},
  "weather": {"status": "positive|negative|neutral", "message": "..."},
  "dress_code": {"status": "positive|negative|neutral", "message": "..."},
  "budget": {"status": "positive|negative|neutral", "message": "..."},
  "desired_vibe": {"status": "positive|negative|neutral", "message": "..."}
}

Rules:
- ONLY include keys for fields the user actually provided (non-empty strings).
- Messages must be 1-2 sentences, clear and actionable.
- Adapt the wording and strictness to ai_preferences (especially tone, strictness, detail).
- Do NOT explicitly mention ai_preferences unless the user asks.
- If you cannot infer compatibility from the photo, use status "neutral" and ask for 1 missing detail.
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
                'temperature' => 0.4,
                'maxOutputTokens' => 700,
            ],
        ];

        $lastError = null;
        $lastStatus = null;
        $lastApiVersion = null;
        $apiVersionsToTry = ['v1beta', 'v1'];

        foreach ($apiVersionsToTry as $apiVersion) {
            foreach ($modelsToTry as $model) {
                $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key={$apiKey}";

                /** @var \Illuminate\Http\Client\Response $res */
                $res = Http::connectTimeout(8)->timeout(30)->post($url, $payload);

                if ($res->ok()) {
                    $parts = (array) data_get($res->json(), 'candidates.0.content.parts', []);
                    $text = '';
                    foreach ($parts as $p) {
                        $t = data_get($p, 'text');
                        if (is_string($t)) {
                            $text .= $t;
                        }
                    }

                    if (trim($text) === '') {
                        throw new \RuntimeException('Gemini returned an empty response.');
                    }

                    $json = $this->extractJsonObject($text);
                    $decoded = json_decode($json, true);
                    if (!is_array($decoded)) {
                        throw new \RuntimeException('Gemini returned invalid JSON.');
                    }

                    return $decoded;
                }

                $lastApiVersion = $apiVersion;
                $lastStatus = $res->status();
                $lastError = $res->body();

                if ($debug) {
                    Log::warning('GeminiChatService contextFeedback failed', [
                        'api_version' => $apiVersion,
                        'model' => $model,
                        'status' => $lastStatus,
                        'error' => mb_substr((string) $lastError, 0, 1200),
                    ]);
                }

                if ($lastStatus === 404) {
                    continue;
                }

                if ($lastStatus === 400) {
                    continue;
                }

                if ($lastStatus === 429) {
                    throw new \RuntimeException(
                        'Gemini quota exceeded (429). Enable billing / adjust quotas in Google AI Studio, or choose a model with available limits. Details: '.$lastError
                    );
                }
            }
        }

        throw new \RuntimeException(
            'Gemini context feedback request failed: '.($lastStatus ?? 0).' (api='.($lastApiVersion ?? 'unknown').') '.($lastError ?? 'Unknown error')
        );
    }

    private function buildModelFallbackList(string $configuredModel): array
    {
        $configuredModel = trim($configuredModel);

        $candidates = array_filter(array_map('trim', explode(',', $configuredModel)));
        $fallbacks = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
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

    private function extractJsonObject(string $text): string
    {
        $start = strpos($text, '{');
        $end = strrpos($text, '}');

        if ($start === false || $end === false || $end <= $start) {
            throw new \RuntimeException('Gemini response did not contain a JSON object.');
        }

        return substr($text, $start, $end - $start + 1);
    }
}
