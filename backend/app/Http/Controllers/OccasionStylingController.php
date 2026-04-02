<?php

namespace App\Http\Controllers;

use App\Services\OccasionStylingService;
use Illuminate\Http\Request;

class OccasionStylingController extends Controller
{
    public function suggest(Request $request, OccasionStylingService $service)
    {
        $request->validate([
            'occasion' => 'required|string|max:200',
            'notes' => 'nullable|string|max:500',
        ]);

        $userId = $request->user()->id;

        try {
            $result = $service->suggestOutfit(
                $userId,
                $request->input('occasion'),
                $request->input('notes'),
            );

            return response()->json($result);
        } catch (\Throwable $e) {
            $status = str_contains($e->getMessage(), '429') ? 429 : 502;

            return response()->json([
                'message' => $status === 429
                    ? 'AI quota exceeded. Please retry shortly.'
                    : 'Styling suggestion failed. Please try again.',
            ], $status);
        }
    }
}
