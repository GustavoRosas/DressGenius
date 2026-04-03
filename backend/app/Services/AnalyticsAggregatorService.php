<?php

namespace App\Services;

use App\Models\OutfitScan;
use App\Models\UserAnalyticsCache;
use App\Models\WardrobeItem;
use Carbon\Carbon;

class AnalyticsAggregatorService
{
    /**
     * Aggregate analytics for a user in a given period.
     *
     * @param int         $userId
     * @param string|null $period  'YYYY-MM', 'all', or null (defaults to current month)
     */
    public function aggregate(int $userId, ?string $period = null): UserAnalyticsCache
    {
        $period = $period ?? Carbon::now()->format('Y-m');

        $query = OutfitScan::where('user_id', $userId);

        if ($period !== 'all') {
            [$year, $month] = explode('-', $period);
            $start = Carbon::createFromDate((int) $year, (int) $month, 1)->startOfMonth();
            $end = (clone $start)->endOfMonth();
            $query->whereBetween('created_at', [$start, $end]);
        }

        $scans = $query->get();

        $totalAnalyses = $scans->count();
        $avgScore = $totalAnalyses > 0 ? round($scans->avg('score'), 2) : null;

        // Occasion / style distribution
        $occasions = [];
        $allColors = [];

        foreach ($scans as $scan) {
            $analysis = $scan->analysis ?? [];

            // Occasion
            $occasion = data_get($analysis, 'occasion')
                ?? data_get($analysis, 'style_category')
                ?? data_get($analysis, 'category');
            if (is_string($occasion) && $occasion !== '') {
                $key = mb_strtolower(trim($occasion));
                $occasions[$key] = ($occasions[$key] ?? 0) + 1;
            }

            // Colors from color_analysis.dominant_colors
            $dominantColors = data_get($analysis, 'color_analysis.dominant_colors', []);
            foreach ((array) $dominantColors as $color) {
                $hex = data_get($color, 'hex', '');
                $name = data_get($color, 'name', $hex);
                if ($hex === '') {
                    continue;
                }
                $colorKey = mb_strtolower($hex);
                if (!isset($allColors[$colorKey])) {
                    $allColors[$colorKey] = ['hex' => $hex, 'name' => $name, 'count' => 0];
                }
                $allColors[$colorKey]['count']++;
            }
        }

        // Dominant style = most frequent occasion
        $dominantStyle = null;
        if (!empty($occasions)) {
            arsort($occasions);
            $dominantStyle = array_key_first($occasions);
        }

        // Style / occasion distribution as percentages
        $styleDistribution = null;
        $occasionDistribution = null;
        if ($totalAnalyses > 0 && !empty($occasions)) {
            $dist = [];
            foreach ($occasions as $occ => $count) {
                $dist[$occ] = round(($count / $totalAnalyses) * 100, 1);
            }
            $styleDistribution = $dist;
            $occasionDistribution = $dist;
        }

        // Top 5 colors
        $topColors = null;
        if (!empty($allColors)) {
            usort($allColors, fn ($a, $b) => $b['count'] <=> $a['count']);
            $topColors = array_slice($allColors, 0, 5);
        }

        // Closet gaps: count wardrobe items by category
        $closetGaps = WardrobeItem::where('user_id', $userId)
            ->selectRaw("COALESCE(category, 'uncategorized') as cat, COUNT(*) as cnt")
            ->groupBy('cat')
            ->pluck('cnt', 'cat')
            ->toArray();

        $cache = UserAnalyticsCache::updateOrCreate(
            ['user_id' => $userId, 'period' => $period],
            [
                'total_analyses' => $totalAnalyses,
                'avg_score' => $avgScore,
                'dominant_style' => $dominantStyle,
                'top_colors' => $topColors,
                'style_distribution' => $styleDistribution,
                'closet_gaps' => !empty($closetGaps) ? $closetGaps : null,
                'occasion_distribution' => $occasionDistribution,
                'generated_at' => now(),
            ]
        );

        return $cache;
    }

    /**
     * Aggregate both the all-time and current-month caches.
     */
    public function aggregateAll(int $userId): void
    {
        $this->aggregate($userId, 'all');
        $this->aggregate($userId, Carbon::now()->format('Y-m'));
    }
}
