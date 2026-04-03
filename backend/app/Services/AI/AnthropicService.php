<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AnthropicService
{
    private string $apiKey;
    private string $visionModel;
    private string $textModel;

    public function __construct()
    {
        $this->apiKey = (string) config('services.anthropic.api_key');
        $this->visionModel = (string) config('services.anthropic.vision_model', 'claude-haiku-4-5');
        $this->textModel = (string) config('services.anthropic.text_model', 'claude-haiku-4-5');
    }

    /**
     * Analyze an image with a text prompt. Returns parsed JSON array.
     */
    public function analyzeImage(string $base64, string $mimeType, string $prompt, int $maxTokens = 2048): array
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => '2023-06-01',
        ])->timeout(90)->post('https://api.anthropic.com/v1/messages', [
            'model' => $this->visionModel,
            'max_tokens' => $maxTokens,
            'messages' => [[
                'role' => 'user',
                'content' => [
                    ['type' => 'image', 'source' => [
                        'type' => 'base64',
                        'media_type' => $mimeType,
                        'data' => $base64,
                    ]],
                    ['type' => 'text', 'text' => $prompt],
                ],
            ]],
        ]);

        if (!$response->ok()) {
            $status = $response->status();
            $body = $response->body();
            Log::error("Anthropic vision failed: {$status}", ['body' => mb_substr($body, 0, 500)]);

            if ($status === 429) {
                throw new \RuntimeException("Anthropic quota exceeded (429). {$body}");
            }
            throw new \RuntimeException("Anthropic vision failed: {$status}");
        }

        $text = data_get($response->json(), 'content.0.text', '');
        return $this->parseJson($text);
    }

    /**
     * Text-only prompt. Returns parsed JSON array.
     */
    public function textPrompt(string $prompt, int $maxTokens = 1024): array
    {
        $response = Http::withHeaders([
            'x-api-key' => $this->apiKey,
            'anthropic-version' => '2023-06-01',
        ])->timeout(60)->post('https://api.anthropic.com/v1/messages', [
            'model' => $this->textModel,
            'max_tokens' => $maxTokens,
            'messages' => [[
                'role' => 'user',
                'content' => $prompt,
            ]],
        ]);

        if (!$response->ok()) {
            $status = $response->status();
            Log::error("Anthropic text failed: {$status}", ['body' => mb_substr($response->body(), 0, 500)]);
            throw new \RuntimeException("Anthropic text failed: {$status}");
        }

        $text = data_get($response->json(), 'content.0.text', '');
        return $this->parseJson($text);
    }

    /**
     * Parse JSON from Claude response. Much simpler than Gemini — Claude is consistent.
     */
    private function parseJson(string $text): array
    {
        $text = trim($text);

        // Strip markdown fences (rare with Claude, but safety)
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```[a-zA-Z]*\n/', '', $text);
            $text = preg_replace('/\n```$/', '', $text);
            $text = trim($text);
        }

        // Extract JSON object/array
        $start = strpos($text, '{');
        $startArr = strpos($text, '[');
        if ($startArr !== false && ($start === false || $startArr < $start)) {
            $start = $startArr;
            $end = strrpos($text, ']');
        } else {
            $end = strrpos($text, '}');
        }

        if ($start !== false && $end !== false && $end > $start) {
            $text = substr($text, $start, $end - $start + 1);
        }

        $decoded = json_decode($text, true);
        if (!is_array($decoded)) {
            throw new \RuntimeException('Claude returned invalid JSON. Snippet: ' . mb_substr($text, 0, 300));
        }

        return $decoded;
    }
}
