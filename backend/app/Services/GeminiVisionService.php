<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GeminiVisionService
{
    public function analyzeOutfitImage(UploadedFile $image): array
    {
        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        $configuredModel = (string) config('services.gemini.model', 'gemini-1.5-flash-latest');
        $modelsToTry = array_slice($this->buildModelFallbackList($configuredModel), 0, 2);

        $mimeType = $image->getMimeType() ?: 'image/jpeg';
        $imageBase64 = base64_encode(file_get_contents($image->getRealPath()));

        $prompt = <<<'PROMPT'
You are analyzing a fashion outfit photo.

Return ONLY valid JSON (no markdown) matching this schema:
{
  "items": {
    "tops": ["..."],
    "bottoms": ["..."],
    "shoes": ["..."],
    "outerwear": ["..."],
    "accessories": ["..."]
  },
  "colors": ["..."],
  "patterns": ["..."],
  "materials": ["..."],
  "style_tags": ["..."] ,
  "description": "Objective neutral description of the outfit in 1-2 sentences."
}

Rules:
- Be objective and descriptive.
- If something is not visible, use an empty array.
PROMPT;

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $imageBase64,
                            ],
                        ],
                    ],
                ],
            ],
            'generationConfig' => [
                'temperature' => 0.2,
                'maxOutputTokens' => 1024,
                'response_mime_type' => 'application/json',
            ],
        ];

        $lastError = null;
        $lastStatus = null;
        $resJson = null;

        foreach ($modelsToTry as $model) {
            Log::info('GeminiVisionService request start', [
                'model' => $model,
                'mime' => $mimeType,
                'size_bytes' => $image->getSize(),
            ]);

            $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";

            /** @var \Illuminate\Http\Client\Response $res */
            $res = Http::connectTimeout(8)->timeout(30)->post($url, $payload);

            Log::info('GeminiVisionService request done', [
                'model' => $model,
                'status' => $res->status(),
            ]);

            if ($res->ok()) {
                $resJson = $res->json();
                break;
            }

            $lastStatus = $res->status();
            $lastError = $res->body();

            if ($lastStatus === 429) {
                throw new \RuntimeException(
                    'Gemini quota exceeded (429). Enable billing / adjust quotas in Google AI Studio, or choose a model with available limits. Details: '.$lastError
                );
            }

            if ($lastStatus === 404) {
                continue;
            }

            throw new \RuntimeException('Gemini request failed: '.$lastStatus.' '.$lastError);
        }

        if (!is_array($resJson)) {
            throw new \RuntimeException('Gemini request failed: '.($lastStatus ?? 0).' '.($lastError ?? 'Unknown error'));
        }

        $text = data_get($resJson, 'candidates.0.content.parts.0.text');
        if (!is_string($text) || trim($text) === '') {
            throw new \RuntimeException('Gemini returned an empty response.');
        }

        $json = $this->extractJson($text);
        $decoded = json_decode($json, true);

        if (!is_array($decoded)) {
            $repaired = $this->repairJson($json);
            $decoded = json_decode($repaired, true);
        }

        if (!is_array($decoded)) {
            $snippet = mb_substr($json, 0, 400);
            throw new \RuntimeException('Gemini returned invalid JSON. Snippet: '.$snippet);
        }

        return $this->normalizeVisionPayload($decoded);
    }

    private function normalizeVisionPayload(array $decoded): array
    {
        $decoded['items'] = is_array(data_get($decoded, 'items')) ? $decoded['items'] : [];
        $decoded['items']['tops'] = array_values(array_filter((array) data_get($decoded, 'items.tops', [])));
        $decoded['items']['bottoms'] = array_values(array_filter((array) data_get($decoded, 'items.bottoms', [])));
        $decoded['items']['shoes'] = array_values(array_filter((array) data_get($decoded, 'items.shoes', [])));
        $decoded['items']['outerwear'] = array_values(array_filter((array) data_get($decoded, 'items.outerwear', [])));
        $decoded['items']['accessories'] = array_values(array_filter((array) data_get($decoded, 'items.accessories', [])));

        $decoded['colors'] = array_values(array_filter((array) data_get($decoded, 'colors', [])));
        $decoded['patterns'] = array_values(array_filter((array) data_get($decoded, 'patterns', [])));
        $decoded['materials'] = array_values(array_filter((array) data_get($decoded, 'materials', [])));
        $decoded['style_tags'] = array_values(array_filter((array) data_get($decoded, 'style_tags', [])));
        $decoded['description'] = (string) data_get($decoded, 'description', '');

        return $decoded;
    }

    private function repairJson(string $json): string
    {
        $json = trim($json);

        // Remove obvious trailing commas before a closing bracket/brace.
        $json = preg_replace('/,\s*([}\]])/', '$1', $json) ?? $json;

        $openCurly = substr_count($json, '{');
        $closeCurly = substr_count($json, '}');
        $openSquare = substr_count($json, '[');
        $closeSquare = substr_count($json, ']');

        if ($closeSquare < $openSquare) {
            $json .= str_repeat(']', $openSquare - $closeSquare);
        }
        if ($closeCurly < $openCurly) {
            $json .= str_repeat('}', $openCurly - $closeCurly);
        }

        return $json;
    }

    private function buildModelFallbackList(string $configuredModel): array
    {
        $configuredModel = trim($configuredModel);

        $candidates = array_filter(array_map('trim', explode(',', $configuredModel)));
        $fallbacks = [
            'gemini-2.5-flash-lts',
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-flash-native-audio-dialog',
            'gemini-1.5-flash-latest',
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

    private function extractJson(string $text): string
    {
        $text = trim($text);

        if (Str::startsWith($text, '```')) {
            $text = preg_replace('/^```[a-zA-Z]*\n/', '', $text);
            $text = preg_replace('/\n```$/', '', $text);
            $text = trim($text);
        }

        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $candidate = substr($text, $start, $end - $start + 1);
            $candidate = trim($candidate);
            if ($candidate !== '') {
                return $candidate;
            }
        }

        return $text;
    }
}
