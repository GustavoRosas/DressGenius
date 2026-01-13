<?php

namespace App\Services;

class OutfitAnalysisService
{
    public function analyze(array $vision, array $intake = []): array
    {
        $items = data_get($vision, 'items', []);

        $tops = data_get($items, 'tops', []);
        $bottoms = data_get($items, 'bottoms', []);
        $shoes = data_get($items, 'shoes', []);
        $outerwear = data_get($items, 'outerwear', []);
        $accessories = data_get($items, 'accessories', []);

        $colors = data_get($vision, 'colors', []);
        $styleTags = array_map('strtolower', (array) data_get($vision, 'style_tags', []));
        $description = strtolower((string) data_get($vision, 'description', ''));

        $intakeOccasion = trim((string) data_get($intake, 'occasion', ''));
        $intakeWeather = trim((string) data_get($intake, 'weather', ''));
        $intakeDressCode = trim((string) data_get($intake, 'dress_code', ''));
        $intakeBudget = trim((string) data_get($intake, 'budget', ''));
        $intakeVibe = trim((string) data_get($intake, 'desired_vibe', ''));

        $contextFeedback = [];
        $addFeedback = function (string $key, string $status, string $message) use (&$contextFeedback): void {
            $contextFeedback[$key] = [
                'status' => $status,
                'message' => $message,
            ];
        };

        $score = 70;
        $pros = [];
        $issues = [];
        $suggestions = [];

        if ($intakeOccasion !== '') {
            $o = strtolower($intakeOccasion);
            $shoesText = strtolower(implode(' ', array_map('strval', (array) $shoes)));

            if (str_contains($o, 'gym') || str_contains($o, 'workout') || str_contains($o, 'training')) {
                if (str_contains($shoesText, 'sneaker') || str_contains($shoesText, 'trainer') || str_contains($shoesText, 'running')) {
                    $addFeedback('occasion', 'positive', 'For a workout/gym occasion, sneakers look appropriate.');
                } else {
                    $addFeedback('occasion', 'negative', 'For a workout/gym occasion, consider athletic shoes (sneakers/trainers) for practicality.');
                }
            } elseif (str_contains($o, 'office') || str_contains($o, 'work') || str_contains($o, 'business')) {
                if (in_array('smart', $styleTags, true) || in_array('classic', $styleTags, true) || str_contains($description, 'blazer') || count($outerwear) > 0) {
                    $addFeedback('occasion', 'positive', 'For work/office, the outfit reads structured enough.');
                } else {
                    $addFeedback('occasion', 'neutral', 'For work/office, you may want a bit more structure (blazer, tailored layer) depending on your workplace.');
                }
            } else {
                $addFeedback('occasion', 'neutral', 'Occasion noted. I will tailor suggestions to it, but I may need more details about the venue/time.');
            }
        }

        if ($intakeWeather !== '') {
            $w = strtolower($intakeWeather);
            $isCold = str_contains($w, 'cold') || str_contains($w, 'chilly') || str_contains($w, 'winter') || str_contains($w, 'rain');
            $isHot = str_contains($w, 'hot') || str_contains($w, 'warm') || str_contains($w, 'summer');

            if ($isCold) {
                if (count($outerwear) > 0) {
                    $addFeedback('weather', 'positive', 'For colder/rainy weather, having an outer layer is a good choice.');
                } else {
                    $addFeedback('weather', 'negative', 'For colder/rainy weather, consider adding an outer layer (jacket/coat) or warmer fabrics.');
                }
            } elseif ($isHot) {
                if (count($outerwear) > 0) {
                    $addFeedback('weather', 'negative', 'For hot weather, outerwear may feel too warm; consider a lighter layer or removing it.');
                } else {
                    $addFeedback('weather', 'positive', 'For warm weather, skipping heavy outerwear looks comfortable.');
                }
            } else {
                $addFeedback('weather', 'neutral', 'Weather noted. I will factor in comfort and layering, but the photo alone can’t confirm temperature.');
            }
        }

        if ($intakeDressCode !== '') {
            $d = strtolower($intakeDressCode);
            $isFormal = str_contains($d, 'formal') || str_contains($d, 'black tie') || str_contains($d, 'cocktail');
            $isBusiness = str_contains($d, 'business') || str_contains($d, 'smart casual') || str_contains($d, 'business casual');

            if ($isFormal) {
                if (count($outerwear) > 0 || in_array('elegant', $styleTags, true) || in_array('classic', $styleTags, true)) {
                    $addFeedback('dress_code', 'positive', 'For a more formal dress code, the outfit has some polished elements.');
                } else {
                    $addFeedback('dress_code', 'negative', 'For a formal dress code, you may need more polished pieces (tailoring, elevated shoes, refined accessories).');
                }
            } elseif ($isBusiness) {
                if (count($outerwear) > 0 || in_array('smart', $styleTags, true) || in_array('minimal', $styleTags, true)) {
                    $addFeedback('dress_code', 'positive', 'For business/smart-casual, the outfit reads reasonably put-together.');
                } else {
                    $addFeedback('dress_code', 'neutral', 'For business/smart-casual, consider adding a structured layer or cleaner lines if needed.');
                }
            } else {
                $addFeedback('dress_code', 'neutral', 'Dress code noted. If you share examples (e.g., “cocktail”, “casual”), I can be more specific.');
            }
        }

        if ($intakeBudget !== '') {
            $addFeedback('budget', 'neutral', 'Budget noted. I’ll prioritize cost-effective upgrades (styling/rewearing) before recommending new purchases.');
        }

        if ($intakeVibe !== '') {
            $v = strtolower($intakeVibe);
            $matchesTag = false;
            foreach ($styleTags as $tag) {
                if ($tag !== '' && str_contains($v, $tag)) {
                    $matchesTag = true;
                    break;
                }
            }

            if ($matchesTag) {
                $addFeedback('desired_vibe', 'positive', 'The detected style tags align with your desired vibe.');
            } else {
                $addFeedback('desired_vibe', 'neutral', 'Desired vibe noted. The photo doesn’t clearly confirm it; I’ll suggest tweaks (color, accessories, silhouette) to move toward it.');
            }
        }

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
            'context_feedback' => $contextFeedback,
        ];
    }
}
