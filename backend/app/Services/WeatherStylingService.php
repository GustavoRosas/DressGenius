<?php

namespace App\Services;

use App\Models\User;
use App\Models\WardrobeItem;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeatherStylingService
{
    public function __construct(
        private WeatherService $weatherService,
    ) {}

    public function suggestForWeather(int $userId, float $lat, float $lon): array
    {
        // 1. Fetch weather
        $weather = $this->weatherService->getWeather($lat, $lon);

        // 2. Load user + wardrobe
        $user = User::findOrFail($userId);
        $preferences = (array) ($user->ai_preferences ?? []);

        $items = WardrobeItem::where('user_id', $userId)
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn ($i) => [
                'id'       => $i->id,
                'label'    => $i->label,
                'category' => $i->category,
                'colors'   => $i->colors,
            ])
            ->toArray();

        if (empty($items)) {
            return [
                'weather'        => $weather,
                'suggested_items' => [],
                'styling_tips'   => ['Your wardrobe is empty. Add some items first!'],
                'reasoning'      => 'No wardrobe items available to suggest an outfit.',
            ];
        }

        // 3. Build prompt & call Gemini
        $prompt = $this->buildPrompt($weather, $items, $preferences);

        try {
            $provider = config('services.ai.text_provider', 'gemini');
            $result = $provider === 'anthropic'
                ? app(\App\Services\AI\AnthropicService::class)->textPrompt($prompt, 1024)
                : $this->callGemini($prompt);
        } catch (\Throwable $e) {
            Log::error('Weather styling Gemini call failed', ['error' => $e->getMessage()]);
            return [
                'weather'        => $weather,
                'suggested_items' => [],
                'styling_tips'   => ['AI styling is temporarily unavailable. Please try again later.'],
                'reasoning'      => 'Could not generate AI suggestions at this time.',
            ];
        }

        return $this->normalize($result, $weather, $items);
    }

    private function buildPrompt(array $weather, array $items, array $preferences): string
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
            if (!empty($preferences['budget'])) $prefsText .= "- Budget level: {$preferences['budget']}\n";
        }

        $weatherBlock = <<<WEATHER
Current weather:
- Temperature: {$weather['temperature']}°C (feels like {$weather['feels_like']}°C)
- Condition: {$weather['condition']} ({$weather['description']})
- Wind: {$weather['wind_speed']} km/h
- High/Low: {$weather['high']}°C / {$weather['low']}°C
WEATHER;

        return <<<PROMPT
You are an expert fashion stylist. A user needs an outfit suggestion based on the current weather.

{$weatherBlock}
{$prefsText}

Available wardrobe items:
{$itemsList}

Return ONLY valid JSON (no markdown, no code fences) with this exact structure:

{
  "suggested_item_ids": [1, 5, 12],
  "styling_tips": ["Tip about the outfit...", "Weather-specific advice..."],
  "reasoning": "Brief explanation of why these items were chosen given the weather."
}

Instructions:
- suggested_item_ids: Pick 2-6 items that form a weather-appropriate complete outfit. Use the item IDs provided.
- styling_tips: 2-4 specific tips considering the weather (e.g., layering for cold, breathable fabrics for heat, waterproof for rain).
- reasoning: 1-2 sentences explaining the weather-outfit connection.
- Prioritize comfort and weather protection while maintaining style.
- For rainy/stormy: prefer waterproof or dark-colored items.
- For cold/snowy: prefer layering, warm fabrics.
- For hot/sunny: prefer light colors, breathable fabrics.
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
            'contents'         => [['parts' => [['text' => $prompt]]]],
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

        throw new \RuntimeException('Gemini weather styling failed.');
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
        $end   = strrpos($text, '}');
        if ($start !== false && $end !== false && $end > $start) {
            $text = substr($text, $start, $end - $start + 1);
        }

        $decoded = json_decode($text, true);
        if (!is_array($decoded)) {
            $repaired = preg_replace('/,\s*([}\]])/', '$1', $text) ?? $text;
            $decoded  = json_decode($repaired, true);
        }

        if (!is_array($decoded)) {
            throw new \RuntimeException('Invalid JSON from Gemini.');
        }

        return $decoded;
    }

    private function normalize(array $data, array $weather, array $wardrobeItems): array
    {
        $suggestedIds = array_map('intval', (array) data_get($data, 'suggested_item_ids', []));
        $itemsById    = collect($wardrobeItems)->keyBy('id');

        $suggestedItems = collect($suggestedIds)
            ->filter(fn ($id) => $itemsById->has($id))
            ->map(fn ($id) => $itemsById->get($id))
            ->values()
            ->toArray();

        return [
            'weather'        => $weather,
            'suggested_items' => $suggestedItems,
            'styling_tips'   => array_values(array_filter((array) data_get($data, 'styling_tips', []), 'is_string')),
            'reasoning'      => (string) data_get($data, 'reasoning', ''),
        ];
    }
}
