<?php

namespace App\Http\Controllers;

use App\Services\WeatherStylingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WeatherController extends Controller
{
    public function __construct(
        private WeatherStylingService $weatherStylingService,
    ) {}

    public function suggest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'latitude'  => 'required|numeric|between:-90,90',
            'longitude' => 'required|numeric|between:-180,180',
        ]);

        try {
            $result = $this->weatherStylingService->suggestForWeather(
                userId: $request->user()->id,
                lat: (float) $validated['latitude'],
                lon: (float) $validated['longitude'],
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            Log::error('Weather styling error', [
                'user_id' => $request->user()->id,
                'error'   => $e->getMessage(),
            ]);

            return response()->json([
                'message' => 'Unable to generate weather-based suggestions. Please try again later.',
            ], 503);
        }
    }
}
