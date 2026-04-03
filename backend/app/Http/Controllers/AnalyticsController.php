<?php

namespace App\Http\Controllers;

use App\Models\OutfitAnalysisProcess;
use App\Models\OutfitScan;
use App\Models\UserAnalyticsCache;
use App\Models\WardrobeItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    // ─── Endpoint 1: GET /analytics/summary ───────────────────────────

    public function summary(Request $request): JsonResponse
    {
        $user = $request->user();
        $period = $request->query('period', '30d');

        // Try cache first (map period to cache key)
        $cacheKey = $this->periodToCacheKey($period);
        $cache = UserAnalyticsCache::where('user_id', $user->id)
            ->where('period', $cacheKey)
            ->where('generated_at', '>=', now()->subHours(6))
            ->first();

        if ($cache) {
            return response()->json($this->buildSummaryFromCache($cache, $user));
        }

        // Calculate on-the-fly
        [$start, $end] = $this->periodToRange($period);

        $scansQuery = OutfitScan::where('user_id', $user->id);
        if ($start) {
            $scansQuery->whereBetween('created_at', [$start, $end]);
        }

        $scans = $scansQuery->get();

        $totalAnalyses = $scans->count();
        $avgScore = $totalAnalyses > 0 ? round($scans->avg('score'), 1) : 0;

        // Dominant style from OutfitAnalysisProcess occasions
        $dominantStyle = $this->getDominantStyle($user->id, $start, $end);

        // Palette type from color analysis
        $paletteType = $this->getPaletteType($scans);

        // Style DNA label
        $label = $this->buildStyleDnaLabel($dominantStyle, $paletteType);

        // Current streak
        $currentStreak = $this->calculateStreak($user->id);

        return response()->json([
            'style_dna' => [
                'label' => $label,
                'dominant_style' => $dominantStyle ?? 'unknown',
                'palette_type' => $paletteType,
            ],
            'total_analyses' => $totalAnalyses,
            'avg_score' => $avgScore,
            'member_since' => $user->created_at->toDateString(),
            'current_streak' => $currentStreak,
        ]);
    }

    // ─── Endpoint 2: GET /analytics/score-trend ───────────────────────

    public function scoreTrend(Request $request): JsonResponse
    {
        $user = $request->user();
        $weeks = (int) $request->query('weeks', 8);
        $weeks = max(1, min($weeks, 52));

        $start = now()->subWeeks($weeks)->startOfWeek();
        $previousStart = (clone $start)->subWeeks($weeks);

        // Current period data
        $scans = OutfitScan::where('user_id', $user->id)
            ->where('created_at', '>=', $start)
            ->orderBy('created_at')
            ->get();

        // Group by ISO week
        $grouped = $scans->groupBy(function ($scan) {
            $date = Carbon::parse($scan->created_at);
            return $date->isoFormat('YYYY') . '-W' . str_pad($date->isoWeek(), 2, '0', STR_PAD_LEFT);
        });

        $data = [];
        foreach ($grouped as $weekKey => $weekScans) {
            $data[] = [
                'date' => $weekKey,
                'avg_score' => round($weekScans->avg('score'), 1),
                'count' => $weekScans->count(),
            ];
        }

        $overallAvg = $scans->count() > 0 ? round($scans->avg('score'), 1) : 0;

        // Previous period for trend calculation
        $previousAvg = OutfitScan::where('user_id', $user->id)
            ->whereBetween('created_at', [$previousStart, $start])
            ->avg('score');

        $trend = '0';
        if ($previousAvg !== null && $previousAvg > 0) {
            $diff = round($overallAvg - $previousAvg, 1);
            $trend = ($diff >= 0 ? '+' : '') . $diff;
        }

        return response()->json([
            'data' => $data,
            'overall_avg' => $overallAvg,
            'trend' => $trend,
        ]);
    }

    // ─── Endpoint 3: GET /analytics/color-breakdown ───────────────────

    public function colorBreakdown(Request $request): JsonResponse
    {
        $user = $request->user();

        $scans = OutfitScan::where('user_id', $user->id)->get();

        $colorCounts = [];

        foreach ($scans as $scan) {
            $analysis = $scan->analysis ?? [];
            $dominantColors = data_get($analysis, 'color_analysis.dominant_colors', []);

            foreach ((array) $dominantColors as $color) {
                $hex = data_get($color, 'hex', '');
                $name = data_get($color, 'name', $hex);
                if ($hex === '') {
                    continue;
                }

                $key = $this->normalizeHex($hex);
                if (!isset($colorCounts[$key])) {
                    $colorCounts[$key] = ['hex' => strtoupper($key), 'name' => $name, 'count' => 0];
                }
                $colorCounts[$key]['count']++;
            }
        }

        // Group similar colors (within threshold of ~30 in RGB distance)
        $merged = $this->mergeCloseColors($colorCounts);

        // Sort by count desc, take top 8
        usort($merged, fn ($a, $b) => $b['count'] <=> $a['count']);
        $top = array_slice($merged, 0, 8);

        $totalColorsDetected = array_sum(array_column($merged, 'count'));

        // Add percentages
        foreach ($top as &$c) {
            $c['percentage'] = $totalColorsDetected > 0
                ? round(($c['count'] / $totalColorsDetected) * 100, 0)
                : 0;
        }
        unset($c);

        // Palette summary
        $paletteSummary = $this->determinePaletteSummary($top);

        return response()->json([
            'colors' => array_values($top),
            'palette_summary' => $paletteSummary,
            'total_colors_detected' => $totalColorsDetected,
        ]);
    }

    // ─── Endpoint 4: GET /analytics/style-distribution ────────────────

    public function styleDistribution(Request $request): JsonResponse
    {
        $user = $request->user();

        $processes = OutfitAnalysisProcess::where('user_id', $user->id)
            ->whereNotNull('intake')
            ->get();

        $occasions = [];
        foreach ($processes as $proc) {
            $occasion = data_get($proc->intake, 'occasion');
            if (!is_string($occasion) || $occasion === '') {
                continue;
            }
            $key = mb_strtolower(trim($occasion));
            $occasions[$key] = ($occasions[$key] ?? 0) + 1;
        }

        $total = array_sum($occasions);
        $distribution = [];

        if ($total > 0) {
            arsort($occasions);
            foreach ($occasions as $style => $count) {
                $distribution[] = [
                    'style' => $style,
                    'percentage' => round(($count / $total) * 100, 0),
                    'count' => $count,
                ];
            }
        }

        return response()->json([
            'distribution' => $distribution,
        ]);
    }

    // ─── Endpoint 5: GET /analytics/closet-intelligence ───────────────

    public function closetIntelligence(Request $request): JsonResponse
    {
        $user = $request->user();

        $items = WardrobeItem::where('user_id', $user->id)->get();
        $totalItems = $items->count();

        if ($totalItems === 0) {
            return response()->json([
                'total_items' => 0,
                'by_category' => [],
                'gaps' => [],
                'unused_items' => [],
                'most_worn' => [],
            ]);
        }

        // By category
        $byCategory = $items->groupBy(fn ($item) => $item->category ?? 'uncategorized')
            ->map(fn ($group, $cat) => [
                'category' => $cat,
                'count' => $group->count(),
                'percentage' => round(($group->count() / $totalItems) * 100, 1),
            ])
            ->sortByDesc('count')
            ->values()
            ->toArray();

        // Gap analysis
        $gaps = $this->analyzeGaps($byCategory, $totalItems);

        // Unused items (wear_count = 0 or last_worn_at > 60 days ago)
        $unusedItems = $items->filter(function ($item) {
            if ($item->wear_count === 0 || $item->wear_count === null) {
                return true;
            }
            if ($item->last_worn_at && $item->last_worn_at->lt(now()->subDays(60))) {
                return true;
            }
            return false;
        })
        ->sortByDesc(function ($item) {
            if (!$item->last_worn_at) {
                return 9999;
            }
            return now()->diffInDays($item->last_worn_at);
        })
        ->take(10)
        ->map(function ($item) {
            $daysSinceWorn = $item->last_worn_at
                ? (int) now()->diffInDays($item->last_worn_at)
                : null;

            return [
                'id' => $item->id,
                'label' => $item->label ?? $item->category ?? 'Unknown item',
                'days_since_worn' => $daysSinceWorn,
            ];
        })
        ->values()
        ->toArray();

        // Most worn
        $mostWorn = $items->where('wear_count', '>', 0)
            ->sortByDesc('wear_count')
            ->take(5)
            ->map(fn ($item) => [
                'id' => $item->id,
                'label' => $item->label ?? $item->category ?? 'Unknown item',
                'wear_count' => $item->wear_count,
            ])
            ->values()
            ->toArray();

        return response()->json([
            'total_items' => $totalItems,
            'by_category' => $byCategory,
            'gaps' => $gaps,
            'unused_items' => $unusedItems,
            'most_worn' => $mostWorn,
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────

    private function periodToRange(string $period): array
    {
        return match ($period) {
            '90d' => [now()->subDays(90), now()],
            'all' => [null, null],
            default => [now()->subDays(30), now()], // 30d
        };
    }

    private function periodToCacheKey(string $period): string
    {
        return match ($period) {
            'all' => 'all',
            '90d' => now()->subDays(90)->format('Y-m') . '_90d',
            default => now()->format('Y-m'),
        };
    }

    private function buildSummaryFromCache(UserAnalyticsCache $cache, $user): array
    {
        $paletteType = 'neutral';
        if (!empty($cache->top_colors)) {
            $paletteType = $this->determinePaletteSummary($cache->top_colors);
        }

        $dominantStyle = $cache->dominant_style ?? 'unknown';
        $label = $this->buildStyleDnaLabel($dominantStyle, $paletteType);

        return [
            'style_dna' => [
                'label' => $label,
                'dominant_style' => $dominantStyle,
                'palette_type' => $paletteType,
            ],
            'total_analyses' => $cache->total_analyses,
            'avg_score' => (float) $cache->avg_score,
            'member_since' => $user->created_at->toDateString(),
            'current_streak' => $this->calculateStreak($user->id),
        ];
    }

    private function getDominantStyle(int $userId, ?Carbon $start, ?Carbon $end): ?string
    {
        $query = OutfitAnalysisProcess::where('user_id', $userId)->whereNotNull('intake');
        if ($start) {
            $query->whereBetween('created_at', [$start, $end]);
        }

        $processes = $query->get();
        $occasions = [];

        foreach ($processes as $proc) {
            $occasion = data_get($proc->intake, 'occasion');
            if (is_string($occasion) && $occasion !== '') {
                $key = mb_strtolower(trim($occasion));
                $occasions[$key] = ($occasions[$key] ?? 0) + 1;
            }
        }

        if (empty($occasions)) {
            return null;
        }

        arsort($occasions);
        return array_key_first($occasions);
    }

    private function getPaletteType($scans): string
    {
        $warmCount = 0;
        $coolCount = 0;

        foreach ($scans as $scan) {
            $dominantColors = data_get($scan->analysis, 'color_analysis.dominant_colors', []);
            foreach ((array) $dominantColors as $color) {
                $hex = data_get($color, 'hex', '');
                if ($hex === '') {
                    continue;
                }
                if ($this->isWarmColor($hex)) {
                    $warmCount++;
                } else {
                    $coolCount++;
                }
            }
        }

        if ($warmCount === 0 && $coolCount === 0) {
            return 'neutral';
        }

        $total = $warmCount + $coolCount;
        $warmRatio = $warmCount / $total;

        if ($warmRatio > 0.6) {
            return 'warm';
        }
        if ($warmRatio < 0.4) {
            return 'cool';
        }
        return 'neutral';
    }

    private function isWarmColor(string $hex): bool
    {
        $hex = ltrim($hex, '#');
        if (strlen($hex) !== 6) {
            return false;
        }

        $r = hexdec(substr($hex, 0, 2));
        $g = hexdec(substr($hex, 2, 2));
        $b = hexdec(substr($hex, 4, 2));

        // Warm colors: red-dominant or yellow-ish (R > B significantly)
        return ($r > $b + 30) || ($r > 150 && $g > 100 && $b < 100);
    }

    private function buildStyleDnaLabel(?string $dominantStyle, string $paletteType): string
    {
        $style = ucfirst($dominantStyle ?? 'versatile');
        $palette = ucfirst($paletteType);
        return "{$palette} {$style} Minimalist";
    }

    private function calculateStreak(int $userId): int
    {
        $dates = OutfitScan::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->pluck('created_at')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->unique()
            ->values();

        if ($dates->isEmpty()) {
            return 0;
        }

        $streak = 0;
        $expected = now()->toDateString();

        // Allow today or yesterday as starting point
        if ($dates->first() !== $expected) {
            $expected = now()->subDay()->toDateString();
            if ($dates->first() !== $expected) {
                return 0;
            }
        }

        foreach ($dates as $date) {
            if ($date === $expected) {
                $streak++;
                $expected = Carbon::parse($expected)->subDay()->toDateString();
            } else {
                break;
            }
        }

        return $streak;
    }

    private function normalizeHex(string $hex): string
    {
        $hex = ltrim(strtoupper(trim($hex)), '#');
        if (strlen($hex) === 3) {
            $hex = $hex[0] . $hex[0] . $hex[1] . $hex[1] . $hex[2] . $hex[2];
        }
        return '#' . $hex;
    }

    private function mergeCloseColors(array $colorCounts): array
    {
        $merged = [];
        $threshold = 45; // RGB Euclidean distance threshold

        foreach ($colorCounts as $key => $color) {
            $matched = false;
            foreach ($merged as &$existing) {
                if ($this->colorDistance($color['hex'], $existing['hex']) < $threshold) {
                    $existing['count'] += $color['count'];
                    $matched = true;
                    break;
                }
            }
            unset($existing);

            if (!$matched) {
                $merged[] = $color;
            }
        }

        return $merged;
    }

    private function colorDistance(string $hex1, string $hex2): float
    {
        $hex1 = ltrim($hex1, '#');
        $hex2 = ltrim($hex2, '#');

        if (strlen($hex1) !== 6 || strlen($hex2) !== 6) {
            return 999;
        }

        $r1 = hexdec(substr($hex1, 0, 2));
        $g1 = hexdec(substr($hex1, 2, 2));
        $b1 = hexdec(substr($hex1, 4, 2));

        $r2 = hexdec(substr($hex2, 0, 2));
        $g2 = hexdec(substr($hex2, 2, 2));
        $b2 = hexdec(substr($hex2, 4, 2));

        return sqrt(($r1 - $r2) ** 2 + ($g1 - $g2) ** 2 + ($b1 - $b2) ** 2);
    }

    private function determinePaletteSummary(array $colors): string
    {
        $warm = 0;
        $cool = 0;

        foreach ($colors as $color) {
            $hex = data_get($color, 'hex', '');
            if ($this->isWarmColor($hex)) {
                $warm += data_get($color, 'count', 1);
            } else {
                $cool += data_get($color, 'count', 1);
            }
        }

        $total = $warm + $cool;
        if ($total === 0) {
            return 'neutral';
        }

        $warmRatio = $warm / $total;
        if ($warmRatio > 0.6) {
            return 'warm';
        }
        if ($warmRatio < 0.4) {
            return 'cool';
        }
        return 'neutral';
    }

    private function analyzeGaps(array $byCategory, int $totalItems): array
    {
        $gaps = [];
        $categoryCounts = [];
        foreach ($byCategory as $cat) {
            $categoryCounts[$cat['category']] = $cat['count'];
        }

        // Define expected categories and their ideal minimum ratios
        $expectedCategories = ['top', 'bottom', 'shoes', 'outerwear', 'accessory', 'dress'];

        foreach ($expectedCategories as $expected) {
            if (!isset($categoryCounts[$expected]) || $categoryCounts[$expected] === 0) {
                $gaps[] = "You don't have any {$expected} items — consider adding some.";
            }
        }

        // Detect imbalances between tops and bottoms
        $tops = $categoryCounts['top'] ?? 0;
        $bottoms = $categoryCounts['bottom'] ?? 0;

        if ($tops > 0 && $bottoms > 0 && $tops > $bottoms * 3) {
            $gaps[] = "You have {$tops} tops but only {$bottoms} bottoms — consider adding more bottoms.";
        } elseif ($bottoms > 0 && $tops > 0 && $bottoms > $tops * 3) {
            $gaps[] = "You have {$bottoms} bottoms but only {$tops} tops — consider adding more tops.";
        }

        // Low shoe count
        $shoes = $categoryCounts['shoes'] ?? 0;
        if ($shoes > 0 && $shoes < 2 && $totalItems > 10) {
            $gaps[] = "You only have {$shoes} pair(s) of shoes — adding more variety could help.";
        }

        return $gaps;
    }
}
