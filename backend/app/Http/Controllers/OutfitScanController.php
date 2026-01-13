<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOutfitScanRequest;
use App\Models\OutfitScan;
use App\Services\GeminiChatService;
use App\Services\GeminiVisionService;
use App\Services\OutfitAnalysisService;
use Illuminate\Support\Facades\Storage;

class OutfitScanController extends Controller
{
    public function store(StoreOutfitScanRequest $request, GeminiVisionService $vision, OutfitAnalysisService $analysis, GeminiChatService $chat)
    {
        $user = $request->user();

        $image = $request->file('image');
        $intake = $request->input('intake') ?? [];

        $path = $image->store('outfit-scans/'.$user->id, 'public');

        try {
            $visionResult = $vision->analyzeOutfitImage($image, (array) $intake);
            $analysisResult = $analysis->analyze($visionResult, (array) $intake);

            try {
                $aiContextFeedback = $chat->contextFeedback([
                    'intake' => $intake,
                    'vision' => $visionResult,
                    'analysis' => $analysisResult,
                ]);
                if (is_array($aiContextFeedback)) {
                    $analysisResult['context_feedback'] = $aiContextFeedback;
                }
            } catch (\Throwable $ignored) {
            }
        } catch (\Throwable $e) {
            if ((bool) config('services.gemini.debug', false)) {
                \Illuminate\Support\Facades\Log::error('OutfitScanController analyze failed', [
                    'message' => $e->getMessage(),
                    'class' => get_class($e),
                ]);
            }
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
