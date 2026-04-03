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

        // Build weather string from object or legacy string
        $rawWeather = data_get($intake, 'weather');
        if (is_array($rawWeather)) {
            $weatherParts = array_filter([
                data_get($rawWeather, 'condition'),
                data_get($rawWeather, 'temperature_c') !== null ? data_get($rawWeather, 'temperature_c') . '°C' : null,
                data_get($rawWeather, 'source') ? '(source: ' . data_get($rawWeather, 'source') . ')' : null,
            ]);
            $weatherStr = implode(', ', $weatherParts);
        } else {
            $weatherStr = (string) ($rawWeather ?? '');
        }

        $context = [
            'occasion' => (string) data_get($intake, 'occasion', ''),
            'weather' => $weatherStr,
            'dress_code' => (string) data_get($intake, 'dress_code', ''),
            'budget' => (string) data_get($intake, 'budget', ''),
            'desired_vibe' => (string) data_get($intake, 'desired_vibe', ''),
            'comfort_level' => (string) data_get($intake, 'comfort_level', ''),
            'extra_context' => (string) data_get($intake, 'extra_context', ''),
        ];
        $context = array_map(fn ($v) => is_string($v) && trim($v) === '' ? null : $v, $context);
        $contextJson = json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (!is_string($contextJson)) {
            $contextJson = '{}';
        }

        // Build contextual hints for the prompt
        $occasionHint = '';
        if (!empty($context['occasion'])) {
            $occasionHint = "\nThe user stated the occasion is: \"{$context['occasion']}\". Use this for occasion_assessment (fit_score, verdict, works/doesn't work).";
        }
        $weatherHint = '';
        if (!empty($context['weather'])) {
            $weatherHint = "\nThe user stated the weather/climate is: \"{$context['weather']}\". Use this for climate_assessment (fit_score, note, risk).";
        }
        $comfortHint = '';
        if (!empty($context['comfort_level'])) {
            $comfortHint = "\nThe user's comfort preference is: \"{$context['comfort_level']}\". Factor this into score_breakdown (e.g., if comfort_first, weigh cohesion/balance higher than strict fashion rules).";
        }

        $prompt = <<<PROMPT
You are an expert fashion stylist analyzing an outfit photo.

User context (may be partial): {$contextJson}
{$occasionHint}{$weatherHint}{$comfortHint}

Return ONLY valid JSON (no markdown, no code fences) matching this EXACT schema:
{
  "items": {
    "tops": ["item description"],
    "bottoms": ["item description"],
    "shoes": ["item description"],
    "outerwear": ["item description"],
    "accessories": ["item description"]
  },
  "colors": ["#hex or color name"],
  "patterns": ["pattern name"],
  "materials": ["material name"],
  "style_tags": ["tag"],
  "description": "Objective neutral description of the outfit in 1-2 sentences.",
  "score": 8.3,
  "score_label": "Great Look",
  "score_summary": "One sentence explaining the overall assessment.",
  "score_breakdown": {
    "color_harmony": 9.0,
    "style_balance": 8.5,
    "occasion_fit": 7.5,
    "overall_cohesion": 8.2
  },
  "strengths": [
    { "title": "Strength Name", "description": "Specific explanation of why this works." }
  ],
  "style_level": {
    "detected": "Smart Casual",
    "formality_score": 6.5,
    "balance_note": "Context note about the formality balance."
  },
  "occasion_assessment": {
    "fit_score": 7.0,
    "verdict": "Good Fit",
    "verdict_note": "Explanation of how well this works for the occasion.",
    "would_work_for": ["Weekend Brunch", "Casual Office"],
    "would_not_work_for": ["Formal Interview", "Black Tie"]
  },
  "improvements": [
    { "priority": "high", "area": "Footwear", "suggestion": "Specific actionable suggestion.", "impact": "Expected impact description" }
  ],
  "climate_assessment": {
    "fit_score": 8.0,
    "note": "Assessment of how the outfit handles the weather.",
    "risk": null
  }
}

RULES:
1. "score" MUST be 0.0-10.0 (NOT 0-100). Use one decimal place.
2. "score_label" MUST be one of: "Poor Look" (0-2.9), "Fair Look" (3-4.9), "Good Look" (5-6.9), "Great Look" (7-8.9), "Perfect Look" (9-10).
3. "score_summary" = 1 sentence explaining the score.
4. "score_breakdown" = 4 dimensions, each 0.0-10.0.
5. "strengths" = 2-4 items with specific title + description about THIS outfit.
6. "style_level": detected style name + formality_score 0-10 + context balance_note.
7. "occasion_assessment": Always provide this. If no occasion given, infer likely occasions. verdict must be "Poor Fit", "Fair Fit", "Good Fit", or "Great Fit".
8. "improvements" = 2-3 items, priority "high"/"medium"/"low", with specific area, suggestion, and impact.
9. "climate_assessment": Always provide this. If no weather given, assess for moderate weather. "risk" is null or a string warning.
10. Be specific to THIS outfit — reference actual colors, items, and combinations you see.
11. If something is not visible, use empty arrays for items/colors/etc.
12. Return ONLY the JSON object. No extra text before or after.
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
                'temperature' => 0.3,
                'maxOutputTokens' => 2048,
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
        // Items detection
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

        // Rich analysis fields — normalize with safe defaults
        $decoded['score'] = $this->clampScore((float) data_get($decoded, 'score', 5.0));
        $decoded['score_label'] = (string) data_get($decoded, 'score_label', $this->scoreLabelFromScore($decoded['score']));
        $decoded['score_summary'] = (string) data_get($decoded, 'score_summary', '');

        $decoded['score_breakdown'] = [
            'color_harmony' => $this->clampScore((float) data_get($decoded, 'score_breakdown.color_harmony', $decoded['score'])),
            'style_balance' => $this->clampScore((float) data_get($decoded, 'score_breakdown.style_balance', $decoded['score'])),
            'occasion_fit' => $this->clampScore((float) data_get($decoded, 'score_breakdown.occasion_fit', $decoded['score'])),
            'overall_cohesion' => $this->clampScore((float) data_get($decoded, 'score_breakdown.overall_cohesion', $decoded['score'])),
        ];

        $decoded['strengths'] = $this->normalizeArrayOfObjects(
            data_get($decoded, 'strengths', []),
            ['title', 'description']
        );

        $styleLevel = data_get($decoded, 'style_level');
        $decoded['style_level'] = is_array($styleLevel) ? [
            'detected' => (string) data_get($styleLevel, 'detected', 'Casual'),
            'formality_score' => $this->clampScore((float) data_get($styleLevel, 'formality_score', 5.0)),
            'balance_note' => (string) data_get($styleLevel, 'balance_note', ''),
        ] : [
            'detected' => 'Casual',
            'formality_score' => 5.0,
            'balance_note' => '',
        ];

        $occasionAssessment = data_get($decoded, 'occasion_assessment');
        $decoded['occasion_assessment'] = is_array($occasionAssessment) ? [
            'fit_score' => $this->clampScore((float) data_get($occasionAssessment, 'fit_score', 5.0)),
            'verdict' => (string) data_get($occasionAssessment, 'verdict', 'Fair Fit'),
            'verdict_note' => (string) data_get($occasionAssessment, 'verdict_note', ''),
            'would_work_for' => array_values(array_filter((array) data_get($occasionAssessment, 'would_work_for', []))),
            'would_not_work_for' => array_values(array_filter((array) data_get($occasionAssessment, 'would_not_work_for', []))),
        ] : null;

        $decoded['improvements'] = $this->normalizeArrayOfObjects(
            data_get($decoded, 'improvements', []),
            ['priority', 'area', 'suggestion', 'impact']
        );

        $climateAssessment = data_get($decoded, 'climate_assessment');
        $decoded['climate_assessment'] = is_array($climateAssessment) ? [
            'fit_score' => $this->clampScore((float) data_get($climateAssessment, 'fit_score', 5.0)),
            'note' => (string) data_get($climateAssessment, 'note', ''),
            'risk' => data_get($climateAssessment, 'risk'),
        ] : null;

        return $decoded;
    }

    private function clampScore(float $score): float
    {
        // If Gemini returned 0-100 scale by mistake, convert to 0-10
        if ($score > 10) {
            $score = $score / 10;
        }
        return round(max(0, min(10, $score)), 1);
    }

    private function scoreLabelFromScore(float $score): string
    {
        if ($score >= 9) return 'Perfect Look';
        if ($score >= 7) return 'Great Look';
        if ($score >= 5) return 'Good Look';
        if ($score >= 3) return 'Fair Look';
        return 'Poor Look';
    }

    private function normalizeArrayOfObjects(mixed $items, array $requiredKeys): array
    {
        if (!is_array($items)) {
            return [];
        }

        $result = [];
        foreach ($items as $item) {
            if (!is_array($item)) continue;
            $normalized = [];
            foreach ($requiredKeys as $key) {
                $normalized[$key] = (string) data_get($item, $key, '');
            }
            $result[] = $normalized;
        }
        return $result;
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
