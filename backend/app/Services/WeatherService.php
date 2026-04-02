<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WeatherService
{
    /**
     * WMO Weather interpretation codes → readable conditions.
     */
    private const WEATHER_MAP = [
        0  => ['condition' => 'sunny',  'description' => 'Clear sky'],
        1  => ['condition' => 'sunny',  'description' => 'Mainly clear'],
        2  => ['condition' => 'cloudy', 'description' => 'Partly cloudy'],
        3  => ['condition' => 'cloudy', 'description' => 'Overcast'],
        45 => ['condition' => 'cloudy', 'description' => 'Foggy'],
        48 => ['condition' => 'cloudy', 'description' => 'Depositing rime fog'],
        51 => ['condition' => 'rainy',  'description' => 'Light drizzle'],
        53 => ['condition' => 'rainy',  'description' => 'Moderate drizzle'],
        55 => ['condition' => 'rainy',  'description' => 'Dense drizzle'],
        56 => ['condition' => 'rainy',  'description' => 'Light freezing drizzle'],
        57 => ['condition' => 'rainy',  'description' => 'Dense freezing drizzle'],
        61 => ['condition' => 'rainy',  'description' => 'Slight rain'],
        63 => ['condition' => 'rainy',  'description' => 'Moderate rain'],
        65 => ['condition' => 'rainy',  'description' => 'Heavy rain'],
        66 => ['condition' => 'rainy',  'description' => 'Light freezing rain'],
        67 => ['condition' => 'rainy',  'description' => 'Heavy freezing rain'],
        71 => ['condition' => 'snowy',  'description' => 'Slight snowfall'],
        73 => ['condition' => 'snowy',  'description' => 'Moderate snowfall'],
        75 => ['condition' => 'snowy',  'description' => 'Heavy snowfall'],
        77 => ['condition' => 'snowy',  'description' => 'Snow grains'],
        80 => ['condition' => 'rainy',  'description' => 'Slight rain showers'],
        81 => ['condition' => 'rainy',  'description' => 'Moderate rain showers'],
        82 => ['condition' => 'stormy', 'description' => 'Violent rain showers'],
        85 => ['condition' => 'snowy',  'description' => 'Slight snow showers'],
        86 => ['condition' => 'snowy',  'description' => 'Heavy snow showers'],
        95 => ['condition' => 'stormy', 'description' => 'Thunderstorm'],
        96 => ['condition' => 'stormy', 'description' => 'Thunderstorm with slight hail'],
        99 => ['condition' => 'stormy', 'description' => 'Thunderstorm with heavy hail'],
    ];

    public function getWeather(float $lat, float $lon): array
    {
        $baseUrl = config('services.open_meteo.base_url', 'https://api.open-meteo.com/v1');

        $response = Http::connectTimeout(5)
            ->timeout(10)
            ->get("{$baseUrl}/forecast", [
                'latitude'      => $lat,
                'longitude'     => $lon,
                'current'       => 'temperature_2m,weathercode,windspeed_10m',
                'daily'         => 'temperature_2m_max,temperature_2m_min,weathercode',
                'timezone'      => 'auto',
                'forecast_days' => 1,
            ]);

        if (!$response->ok()) {
            Log::warning('Open-Meteo request failed', [
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
            throw new \RuntimeException('Failed to fetch weather data from Open-Meteo.');
        }

        $data = $response->json();

        $currentTemp  = (float) data_get($data, 'current.temperature_2m', 0);
        $windSpeed    = (float) data_get($data, 'current.windspeed_10m', 0);
        $weatherCode  = (int) data_get($data, 'current.weathercode', 0);
        $high         = (float) data_get($data, 'daily.temperature_2m_max.0', $currentTemp);
        $low          = (float) data_get($data, 'daily.temperature_2m_min.0', $currentTemp);

        $mapped      = self::WEATHER_MAP[$weatherCode] ?? ['condition' => 'cloudy', 'description' => 'Unknown'];
        $feelsLike   = $this->estimateFeelsLike($currentTemp, $windSpeed);

        return [
            'temperature' => round($currentTemp),
            'feels_like'  => round($feelsLike),
            'condition'   => $mapped['condition'],
            'wind_speed'  => round($windSpeed),
            'high'        => round($high),
            'low'         => round($low),
            'description' => "{$mapped['description']}, {$currentTemp}°C",
        ];
    }

    /**
     * Simple wind-chill / heat-index approximation.
     */
    private function estimateFeelsLike(float $temp, float $windKmh): float
    {
        if ($temp <= 10 && $windKmh > 4.8) {
            // Wind chill (Environment Canada formula)
            return 13.12 + 0.6215 * $temp - 11.37 * ($windKmh ** 0.16) + 0.3965 * $temp * ($windKmh ** 0.16);
        }

        return $temp;
    }
}
