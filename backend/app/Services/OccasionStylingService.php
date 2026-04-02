<?php

namespace App\Services;

use App\Models\User;
use App\Models\WardrobeItem;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class OccasionStylingService
{
    public function suggestOutfit(int $userId, string $occasion, ?string $notes = null): array
    {
        $user = User::findOrFail($userId);
        $preferences = (array) ($user->ai_preferences ?? []);

        $items = WardrobeItem::where('user_id', $userId)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'label' => $i->label,
                'category' => $i->category,
                'colors' => $i->colors,
            ])
            ->toArray();

        if (empty($items)) {
            return [
                'occasion' => $occasion,
                'suggested_items' => [],
                'styling_tips' => ['Your wardrobe is empty. Add some items first!'],
                'missing_items' => ['Start by adding your basic wardrobe pieces.'],
                'confidence' => 0,
            ];
        }

        $prompt = $this->buildPrompt($occasion, $notes, $items, $preferences);
        $result = $this->callGemini($prompt);

        return $this->normalize($result, $occasion, $items);
    }

    private function buildPrompt(string $occasion, ?string $notes, array $items, array $preferences): string
    {
        $itemsList = collect($items)->map(fn ($i) =>
            "- ID:{$i['id']} | {$i['label']} ({$i['category']}) | Colors: " . (is_array($i['colors']) ? implode(', ', $i['colors']) : 'unknown')
        )->implode("\n");

        $prefsText = '';
        if (!empty($preferences)) {
            $prefsText = "\n\nUser style preferences:\n";
            if (!empty($preferences['style'])) $prefsText .= "- Preferred styles: " . implode(', ', (array) $preferences['style']) . "\n";
            if (!empty($preferences['body_type'])) $prefsText .= "- Body type: {$preferences['body_type']}\n";
            if (!empty($preferences['colors'])) $prefsText .= "- Favorite colors: " . implode(', ', (array) $preferences['colors']) . "\n";
            if (!empty($preferences['occasions'])) $prefsText .= "- Usual occasions: " . implode(', ', (array) $preferences['occasions']) . "\n";
            if (!empty($preferences['budget'])) $prefsText .= "- Budget level: {$preferences['budget']}\n";
        }

        $notesText = $notes ? "\n\nAdditional notes from user: {$notes}" : '';

        return <<<PROMPT
You are an expert fashion stylist. A user needs an outfit for a specific occasion.

Occasion: {$occasion}{$notesText}
{$prefsText}

Available wardrobe items:
{$itemsList}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:

{
  "suggested_item_ids": [1, 5, 12],
  "styling_tips": ["Tip about how to wear the outfit...", "Accessory suggestion..."],
  "missing_items": ["Items the user might want to buy for this occasion..."],
  "confidence": 8.5
}

Instructions:
- suggested_item_ids: Pick 2-6 items from the wardrobe that form a complete outfit for the occasion. Use the item IDs provided.
- styling_tips: 2-3 specific tips about how to style/wear the suggested items together.
- missing_items: 0-2 items the user doesn't have but might need. Be specific (e.g., "A formal black belt" not "accessories").
- confidence: 1-10 rating of how well the wardrobe covers this occasion (10 = perfect outfit available).

Pick items that work well together in terms of color harmony, style appropriateness, and occasion fit.
Return ONLY the JSON object.
PROMPT;
    }

    private function callGemini(string $prompt): array
    {
        $apiKey = config('services.gemini.api_key');
        if (!$apiKey) {
            throw new \RuntimeException('Missing GEMINI_API_KEY.');
        }

        $model = (string) config('services.gemini.model', 'gemini-2.5-flash');
        $model = preg_replace('/^models\//', '', $model);

        $payload = [
            'contents' => [['parts' => [['text' => $prompt]]]],
            'generationConfig' => ['temperature' => 0.4, 'maxOutputTokens' => 1024],
        ];

        $apiVersions = ['v1beta', 'v1'];
        foreach ($apiVersions as $version) {
            $url = "https://generativelanguage.googleapis.com/{$version}/models/{$model}:generateContent?key={$apiKey}";
            $res = Http::connectTimeout(8)->timeout(30)->post($url, $payload);

            if ($res->ok()) {
                $text = data_get($res->json(), 'candidates.0.content.parts.0.text', '');
                return $this->parseJson($text);
            }

            if ($res->status() === 404 || $res->status() === 400) continue;
            if ($res->status() === 429) throw new \RuntimeException('Gemini quota exceeded (429).');
        }

        throw new \RuntimeException('Gemini occasion styling failed.');
    }

    private function parseJson(string $text): array
    {
        $text = trim($text);
        if (str_starts_with($text, '```')) {
            $text = preg_replace('/^```[a-zA-Z]*\n/', '', $text);
            $text = preg_replace('/\n```$/', '', $text);
            $text = trim($text);
        }

        $start = strpos($text, '{');
        $end = strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $text = substr($text, $start, $end - $start + 1);
        }

        $decoded = json_decode($text, true);
        if (!is_array($decoded)) {
            $repaired = preg_replace('/,\s*([}\]])/', '$1', $text) ?? $text;
            $decoded = json_decode($repaired, true);
        }

        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON from Gemini.');
        }

        return $decoded;
    }

    private function normalize(array $data, string $occasion, array $wardrobeItems): array
    {
        $suggestedIds = array_map('intval', (array) data_get($data, 'suggested_item_ids', []));
        $itemsById = collect($wardrobeItems)->keyBy('id');

        $suggestedItems = collect($suggestedIds)
            ->filter(fn ($id) => $itemsById->has($id))
            ->map(fn ($id) => $itemsById->get($id))
            ->values()
            ->toArray();

        return [
            'occasion' => $occasion,
            'suggested_items' => $suggestedItems,
            'styling_tips' => array_values(array_filter((array) data_get($data, 'styling_tips', []), 'is_string')),
            'missing_items' => array_values(array_filter((array) data_get($data, 'missing_items', []), 'is_string')),
            'confidence' => round(max(1, min(10, (float) data_get($data, 'confidence', 5))), 1),
        ];
    }
}
