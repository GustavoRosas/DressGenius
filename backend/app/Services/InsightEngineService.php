<?php

namespace App\Services;

use App\Models\OutfitScan;
use App\Models\UserAnalyticsCache;
use App\Models\WardrobeItem;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class InsightEngineService
{
    /**
     * Generate 3-5 personalized style insights for a user.
     * Results are cached for 24 hours. Falls back to generic insights on failure.
     */
    public function generateInsights(int $userId): array
    {
        return Cache::remember("insights:{$userId}", 86400, function () use ($userId) {
            try {
                $provider = config('services.ai.text_provider', 'gemini');
                return $provider === 'anthropic'
                    ? $this->fetchFromAnthropic($userId)
                    : $this->fetchFromGemini($userId);
            } catch (\Throwable $e) {
                Log::warning('InsightEngine: Gemini failed, returning generic insights', [
                    'user_id' => $userId,
                    'error' => $e->getMessage(),
                ]);

                return $this->genericInsights();
            }
        });
    }

    private function fetchFromGemini(int $userId): array
    {
        $userData = $this->aggregateUserData($userId);

        if (empty($userData['total_scans']) && empty($userData['wardrobe_count'])) {
            return $this->genericInsights();
        }

        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        $prompt = <<<PROMPT
You are a fashion analyst. Based on this user's data, generate 3-5 personalized style insights.

User data:
{$this->toJson($userData)}

Return ONLY a valid JSON array (no markdown, no explanation) with this shape:
[
  {
    "type": "tip|warning|achievement",
    "emoji": "💡",
    "title": "Short title",
    "message": "Actionable message in 1-2 sentences.",
    "priority": 1
  }
]

Rules:
- type must be one of: tip, warning, achievement
- emoji should match the insight type (💡 for tips, ⚠️ for warnings, 🏆/🎯/⭐ for achievements)
- priority: 1 = highest, 5 = lowest
- Messages should be specific and actionable based on the data
- Return between 3 and 5 insights
PROMPT;

        $configuredModel = (string) config('services.gemini.model', 'gemini-1.5-flash-latest');
        $models = $this->buildModelFallbackList($configuredModel);
        $apiVersions = ['v1beta', 'v1'];

        $payload = [
            'contents' => [
                ['parts' => [['text' => $prompt]]],
            ],
            'generationConfig' => [
                'temperature' => 0.7,
                'maxOutputTokens' => 1024,
            ],
        ];

        foreach ($apiVersions as $apiVersion) {
            foreach ($models as $model) {
                $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models/{$model}:generateContent?key={$apiKey}";

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

                    $json = $this->extractJsonArray($text);
                    $decoded = json_decode($json, true);

                    if (is_array($decoded) && count($decoded) >= 1) {
                        return $this->validateInsights($decoded);
                    }

                    throw new \RuntimeException('Gemini returned invalid insights JSON.');
                }

                $status = $res->status();
                if ($status === 429) {
                    throw new \RuntimeException('Gemini quota exceeded (429).');
                }
                // 404 / 400 → try next model
            }
        }

        throw new \RuntimeException('All Gemini models failed for insights.');
    }

    private function aggregateUserData(int $userId): array
    {
        // Recent analytics cache
        $cache = UserAnalyticsCache::where('user_id', $userId)
            ->orderByDesc('generated_at')
            ->first();

        // Last 10 scans
        $recentScans = OutfitScan::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit(10)
            ->get();

        $scores = $recentScans->pluck('score')->filter()->values()->toArray();

        // Wardrobe stats
        $wardrobeCount = WardrobeItem::where('user_id', $userId)->count();
        $wardrobeByCategory = WardrobeItem::where('user_id', $userId)
            ->selectRaw("COALESCE(category, 'uncategorized') as cat, COUNT(*) as cnt")
            ->groupBy('cat')
            ->pluck('cnt', 'cat')
            ->toArray();

        $neverWorn = WardrobeItem::where('user_id', $userId)
            ->where(function ($q) {
                $q->whereNull('wear_count')->orWhere('wear_count', 0);
            })
            ->count();

        return [
            'total_scans' => $cache->total_analyses ?? $recentScans->count(),
            'avg_score' => $cache->avg_score ?? ($scores ? round(array_sum($scores) / count($scores), 1) : null),
            'dominant_style' => $cache->dominant_style ?? null,
            'top_colors' => $cache->top_colors ?? null,
            'recent_scores' => $scores,
            'wardrobe_count' => $wardrobeCount,
            'wardrobe_categories' => $wardrobeByCategory,
            'never_worn_count' => $neverWorn,
        ];
    }

    private function validateInsights(array $insights): array
    {
        $valid = [];
        $allowedTypes = ['tip', 'warning', 'achievement'];

        foreach ($insights as $item) {
            if (!is_array($item)) {
                continue;
            }

            $type = $item['type'] ?? 'tip';
            if (!in_array($type, $allowedTypes, true)) {
                $type = 'tip';
            }

            $valid[] = [
                'type' => $type,
                'emoji' => is_string($item['emoji'] ?? null) ? $item['emoji'] : '💡',
                'title' => is_string($item['title'] ?? null) ? $item['title'] : 'Style Insight',
                'message' => is_string($item['message'] ?? null) ? $item['message'] : '',
                'priority' => max(1, min(5, (int) ($item['priority'] ?? 3))),
            ];
        }

        return !empty($valid) ? array_slice($valid, 0, 5) : $this->genericInsights();
    }

    private function genericInsights(): array
    {
        return [
            [
                'type' => 'tip',
                'emoji' => '💡',
                'title' => 'Build Your Wardrobe',
                'message' => 'A versatile wardrobe starts with strong basics — invest in neutral tops and well-fitting bottoms.',
                'priority' => 1,
            ],
            [
                'type' => 'tip',
                'emoji' => '🎨',
                'title' => 'Explore Color Harmony',
                'message' => 'Try combining complementary colors for a more polished look. Analogous palettes create cohesion.',
                'priority' => 2,
            ],
            [
                'type' => 'achievement',
                'emoji' => '⭐',
                'title' => 'Getting Started',
                'message' => 'You\'re on the right track! Keep analyzing outfits to unlock personalized insights.',
                'priority' => 3,
            ],
        ];
    }

    private function extractJsonArray(string $text): string
    {
        $start = strpos($text, '[');
        $end = strrpos($text, ']');

        if ($start === false || $end === false || $end <= $start) {
            throw new \RuntimeException('Gemini response did not contain a JSON array.');
        }

        return substr($text, $start, $end - $start + 1);
    }

    private function buildModelFallbackList(string $configuredModel): array
    {
        $candidates = array_filter(array_map('trim', explode(',', $configuredModel)));
        $fallbacks = [
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-1.5-flash-latest',
            'gemini-1.5-flash',
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

    private function toJson(array $data): string
    {
        return json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    private function fetchFromAnthropic(int $userId): array
    {
        $prompt = $this->buildPrompt($userId);
        $anthropic = app(\App\Services\AI\AnthropicService::class);
        $result = $anthropic->textPrompt($prompt, 1024);

        // Normalize — same as Gemini path
        $insights = is_array($result) && isset($result[0]) ? $result : (array) data_get($result, 'insights', [$result]);
        return !empty($insights) ? array_slice($insights, 0, 5) : $this->genericInsights();
    }
}
