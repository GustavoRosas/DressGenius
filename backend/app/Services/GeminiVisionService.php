<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class GeminiVisionService
{
    public function analyzeOutfitImage(UploadedFile $image, array $intake = []): array
    {
        $apiKey = config('services.gemini.api_key');
        $debug = (bool) config('services.gemini.debug', false);
        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        $configuredModel = (string) config('services.gemini.model', 'gemini-1.5-flash-latest');
        $modelsToTry = array_slice($this->buildModelFallbackList($configuredModel), 0, 5);

        $mimeType = $image->getMimeType() ?: 'image/jpeg';
        $imageBase64 = base64_encode(file_get_contents($image->getRealPath()));

        $context = [
            'occasion' => (string) data_get($intake, 'occasion', ''),
            'weather' => (string) data_get($intake, 'weather', ''),
            'dress_code' => (string) data_get($intake, 'dress_code', ''),
            'budget' => (string) data_get($intake, 'budget', ''),
            'desired_vibe' => (string) data_get($intake, 'desired_vibe', ''),
        ];
        $context = array_map(fn ($v) => trim($v) === '' ? null : $v, $context);
        $contextJson = json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($contextJson)) {
            $contextJson = '{}';
        }

        $prompt = <<<PROMPT
You are analyzing a fashion outfit photo.

User context (may be partial): {$contextJson}

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
            ],
        ];

        $lastError = null;
        $lastStatus = null;
        $lastApiVersion = null;
        $resJson = null;

        $apiVersionsToTry = ['v1beta', 'v1'];

        foreach ($apiVersionsToTry as $apiVersion) {
            foreach ($modelsToTry as $model) {
                if ($debug) {
                    Log::info('GeminiVisionService request start', [
                        'api_version' => $apiVersion,
                        'model' => $model,
                        'mime' => $mimeType,
                        'size_bytes' => $image->getSize(),
                    ]);
                }

                $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key={$apiKey}";

                $payloadForApi = $payload;

                /** @var \Illuminate\Http\Client\Response $res */
                $res = Http::connectTimeout(8)->timeout(30)->post($url, $payloadForApi);

                if ($debug) {
                    Log::info('GeminiVisionService request done', [
                        'api_version' => $apiVersion,
                        'model' => $model,
                        'status' => $res->status(),
                        'error' => $res->ok() ? null : mb_substr((string) $res->body(), 0, 1200),
                    ]);
                }

                if ($res->ok()) {
                    $resJson = $res->json();
                    break 2;
                }

                $lastApiVersion = $apiVersion;
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
        }

        if (!is_array($resJson)) {
            $details = trim((string) ($lastError ?? 'Unknown error'));
            throw new \RuntimeException('Gemini request failed: '.($lastStatus ?? 0).' (api='.($lastApiVersion ?? 'unknown').') '.$details);
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
            'gemini-2.5-flash',
            'gemini-1.0-pro-vision-latest',
            'gemini-pro-vision',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
            'gemini-1.5-pro',
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
