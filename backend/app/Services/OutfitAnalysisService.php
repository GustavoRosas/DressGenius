<?php

namespace App\Services;

class OutfitAnalysisService
{
    public function analyze(array $vision): array
    {
        $items = data_get($vision, 'items', []);

        $tops = data_get($items, 'tops', []);
        $bottoms = data_get($items, 'bottoms', []);
        $shoes = data_get($items, 'shoes', []);
        $outerwear = data_get($items, 'outerwear', []);
        $accessories = data_get($items, 'accessories', []);

        $colors = data_get($vision, 'colors', []);

        $score = 70;
        $pros = [];
        $issues = [];
        $suggestions = [];

        if (count($tops) > 0 && count($bottoms) > 0 && count($shoes) > 0) {
            $score += 10;
            $pros[] = 'Complete outfit detected (top, bottom, shoes).';
        } else {
            $score -= 15;
            $issues[] = 'Outfit appears incomplete or some key items were not detected clearly.';
            $suggestions[] = 'Try taking a full-body photo with shoes visible and good lighting.';
        }

        if (count($colors) >= 1 && count($colors) <= 4) {
            $score += 5;
            $pros[] = 'Color palette seems cohesive.';
        }

        if (count($colors) > 5) {
            $score -= 5;
            $issues[] = 'Many colors detected; outfit may feel visually busy.';
            $suggestions[] = 'Consider limiting the palette to 2-4 main colors.';
        }

        if (count($accessories) > 0) {
            $score += 3;
            $pros[] = 'Accessories detected.';
        }

        if (count($outerwear) > 0) {
            $score += 2;
            $pros[] = 'Outerwear detected, can add structure to the look.';
        }

        $score = max(0, min(100, $score));

        return [
            'score' => $score,
            'pros' => $pros,
            'issues' => $issues,
            'suggestions' => $suggestions,
        ];
    }
}
