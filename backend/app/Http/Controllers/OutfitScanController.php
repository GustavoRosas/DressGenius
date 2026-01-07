<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOutfitScanRequest;
use App\Models\OutfitScan;
use App\Services\GeminiVisionService;
use App\Services\OutfitAnalysisService;
use Illuminate\Support\Facades\Storage;

class OutfitScanController extends Controller
{
    public function store(StoreOutfitScanRequest $request, GeminiVisionService $vision, OutfitAnalysisService $analysis)
    {
        $user = $request->user();

        $image = $request->file('image');

        $path = $image->store('outfit-scans/'.$user->id, 'public');

        try {
            $visionResult = $vision->analyzeOutfitImage($image);
            $analysisResult = $analysis->analyze($visionResult);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Vision analysis failed. Please try again.',
            ], 502);
        }

        $scan = OutfitScan::create([
            'user_id' => $user->id,
            'image_path' => $path,
            'vision' => $visionResult,
            'analysis' => $analysisResult,
            'score' => data_get($analysisResult, 'score'),
        ]);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return response()->json([
            'scan' => [
                'id' => $scan->id,
                'image_url' => $disk->url($path),
                'vision' => $scan->vision,
                'analysis' => $scan->analysis,
                'score' => $scan->score,
                'created_at' => $scan->created_at,
            ],
        ], 201);
    }
}
