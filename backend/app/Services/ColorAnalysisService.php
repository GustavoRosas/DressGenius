<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ColorAnalysisService
{
    /**
     * Analyze colors from a stored outfit image.
     *
     * @param string $imagePath  Storage path (relative to 'public' disk), e.g. "outfit-scans/1/abc.jpg"
     * @return array  Color analysis payload
     */
    public function analyzeColors(string $imagePath): array
    {
        // Check if we should use Anthropic
        $provider = config('services.ai.vision_provider', 'gemini');
        if ($provider === 'anthropic') {
            return $this->analyzeViaAnthropic($imagePath);
        }

        $apiKey = config('services.gemini.api_key');
        $debug = (bool) config('services.gemini.debug', false);

        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        if (!$disk->exists($imagePath)) {
            throw new \RuntimeException('Image not found at path: ' . $imagePath);
        }

        $imageContents = $disk->get($imagePath);
        $mimeType = $disk->mimeType($imagePath) ?: 'image/jpeg';
        $imageBase64 = base64_encode($imageContents);

        $prompt = $this->buildPrompt();

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
                'maxOutputTokens' => 1024,
            ],
        ];

        $configuredModel = (string) config('services.gemini.model', 'gemini-2.5-flash');
        $modelsToTry = $this->buildModelFallbackList($configuredModel);
        $apiVersionsToTry = ['v1beta', 'v1'];

        $lastError = null;
        $lastStatus = null;
        $resJson = null;

        foreach ($apiVersionsToTry as $apiVersion) {
            foreach ($modelsToTry as $model) {
                $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key={$apiKey}";

                if ($debug) {
                    Log::info('ColorAnalysisService request', [
                        'api_version' => $apiVersion,
                        'model' => $model,
                    ]);
                }

                /** @var \Illuminate\Http\Client\Response $res */
                $res = Http::connectTimeout(8)->timeout(30)->post($url, $payload);

                if ($res->ok()) {
                    $resJson = $res->json();
                    break 2;
                }

                $lastStatus = $res->status();
                $lastError = $res->body();

                if ($debug) {
                    Log::warning('ColorAnalysisService request failed', [
                        'model' => $model,
                        'status' => $lastStatus,
                        'error' => mb_substr((string) $lastError, 0, 600),
                    ]);
                }

                if ($lastStatus === 429) {
                    throw new \RuntimeException('Gemini quota exceeded (429). Details: ' . $lastError);
                }

                if ($lastStatus === 404 || $lastStatus === 400) {
                    continue;
                }

                throw new \RuntimeException('Gemini color analysis failed: ' . $lastStatus . ' ' . $lastError);
            }
        }

        if (!is_array($resJson)) {
            throw new \RuntimeException('Gemini color analysis failed: ' . ($lastStatus ?? 0) . ' ' . ($lastError ?? 'Unknown'));
        }

        $text = data_get($resJson, 'candidates.0.content.parts.0.text');
        if (!is_string($text) || trim($text) === '') {
            throw new \RuntimeException('Gemini returned empty color analysis response.');
        }

        return $this->parseResponse($text);
    }

    private function buildPrompt(): string
    {
        return <<<'PROMPT'
You are an expert color theory analyst specializing in fashion and outfit styling.

Analyze the outfit in this image and return ONLY valid JSON (no markdown, no code fences) with this exact structure:

{
  "dominant_colors": ["#HEXCODE", "#HEXCODE", "#HEXCODE"],
  "color_names": ["Color Name", "Color Name", "Color Name"],
  "palette_type": "warm|cool|neutral",
  "season": "spring|summer|autumn|winter",
  "harmony": {
    "type": "complementary|analogous|triadic|monochromatic|split-complementary",
    "score": 8.5,
    "feedback": "One sentence explaining the harmony evaluation."
  },
  "suggestions": [
    "First actionable suggestion about color improvement.",
    "Second actionable suggestion."
  ]
}

Instructions:
- dominant_colors: Identify the 2-5 most prominent colors in the outfit as hex codes. Focus on clothing items only, not skin or background.
- color_names: Human-readable names matching each hex code (e.g., "Navy Blue", "Burgundy", "Cream").
- palette_type: Classify overall palette temperature.
  - "warm" = reds, oranges, yellows, warm browns, warm greens
  - "cool" = blues, purples, cool grays, cool greens, silvers
  - "neutral" = blacks, whites, beiges, tans, grays dominate
- season: Based on color analysis theory:
  - "spring" = warm + bright/clear (coral, peach, golden yellow, warm green)
  - "summer" = cool + muted/soft (lavender, dusty rose, powder blue, soft gray)
  - "autumn" = warm + muted/deep (rust, olive, mustard, chocolate brown)
  - "winter" = cool + bright/high-contrast (black, white, jewel tones, true red)
- harmony.type: Identify which color harmony principle the outfit follows:
  - "monochromatic" = variations of one hue
  - "analogous" = adjacent colors on the color wheel
  - "complementary" = opposite colors on the color wheel
  - "split-complementary" = one base + two adjacent to its complement
  - "triadic" = three evenly spaced colors on the wheel
  If none fits perfectly, pick the closest match.
- harmony.score: Rate 1-10 how well the colors work together (10 = perfect harmony).
  Consider contrast, balance, visual coherence, and fashion context.
- harmony.feedback: One clear sentence about why the score is what it is.
- suggestions: 1-3 actionable tips to improve color coordination.
  Reference specific colors or items when possible.

Return ONLY the JSON object.
PROMPT;
    }

    private function parseResponse(string $text): array
    {
        $text = trim($text);

        // Strip markdown fences
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```[a-zA-Z]*\n/', '', $text);
            $text = preg_replace('/\n```$/', '', $text);
            $text = trim($text);
        }

        // Extract JSON object
        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $text = substr($text, $start, $end - $start + 1);
        }

        $decoded = json_decode($text, true);
        if (!is_array($decoded)) {
            // Try repairing trailing commas
            $repaired = preg_replace('/,\s*([}\]])/', '$1', $text) ?? $text;
            $decoded = json_decode($repaired, true);
        }

        if (!is_array($decoded)) {
            throw new \RuntimeException('Gemini returned invalid JSON for color analysis. Snippet: ' . mb_substr($text, 0, 300));
        }

        return $this->normalize($decoded);
    }

    private function normalize(array $data): array
    {
        $harmony = (array) data_get($data, 'harmony', []);

        return [
            'dominant_colors' => array_values(array_filter((array) data_get($data, 'dominant_colors', []), 'is_string')),
            'color_names' => array_values(array_filter((array) data_get($data, 'color_names', []), 'is_string')),
            'palette_type' => in_array(data_get($data, 'palette_type'), ['warm', 'cool', 'neutral'], true)
                ? $data['palette_type']
                : 'neutral',
            'season' => in_array(data_get($data, 'season'), ['spring', 'summer', 'autumn', 'winter'], true)
                ? $data['season']
                : 'neutral',
            'harmony' => [
                'type' => in_array(data_get($harmony, 'type'), [
                    'complementary', 'analogous', 'triadic', 'monochromatic', 'split-complementary',
                ], true) ? $harmony['type'] : 'analogous',
                'score' => round(
                    max(1, min(10, (float) data_get($harmony, 'score', 5))),
                    1
                ),
                'feedback' => (string) data_get($harmony, 'feedback', ''),
            ],
            'suggestions' => array_values(array_filter((array) data_get($data, 'suggestions', []), 'is_string')),
        ];
    }

    private function buildModelFallbackList(string $configuredModel): array
    {
        $candidates = array_filter(array_map('trim', explode(',', trim($configuredModel))));
        $fallbacks = [
            'gemini-2.5-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
            'gemini-1.5-pro-latest',
            'gemini-1.0-pro-vision-latest',
        ];

        $all = array_merge($candidates, $fallbacks);
        $normalized = [];
        foreach ($all as $m) {
            $m = preg_replace('/^models\//', '', $m);
            if ($m && !in_array($m, $normalized, true)) {
                $normalized[] = $m;
            }
        }

        return array_slice($normalized, 0, 5);
    }

    private function analyzeViaAnthropic(string $imagePath): array
    {
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        if (!$disk->exists($imagePath)) {
            throw new \RuntimeException('Image not found: ' . $imagePath);
        }

        $base64 = base64_encode($disk->get($imagePath));
        $mimeType = $disk->mimeType($imagePath) ?: 'image/jpeg';
        $prompt = $this->buildPrompt();

        $anthropic = app(\App\Services\AI\AnthropicService::class);
        $result = $anthropic->analyzeImage($base64, $mimeType, $prompt, 1024);

        return $this->normalize($result);
    }
}
