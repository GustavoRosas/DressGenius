<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOutfitScanRequest;
use App\Models\OutfitAnalysisProcess;
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
        $aiPreferences = (array) ($user->ai_preferences ?? []);

        $image = $request->file('image');
        $intake = $request->input('intake') ?? [];

        $path = $image->store('outfit-scans/'.$user->id, 'public');

        $process = OutfitAnalysisProcess::create([
            'user_id' => $user->id,
            'kind' => 'scan_analyze',
            'status' => 'processing',
            'image_path' => $path,
            'intake' => (array) $intake,
            'ai_preferences' => (array) $aiPreferences,
            'started_at' => now(),
        ]);

        try {
            $visionResult = $vision->analyzeOutfitImage($image, (array) $intake);
            $analysisResult = $analysis->analyze($visionResult, (array) $intake);

            $process->vision = $visionResult;
            $process->analysis = $analysisResult;
            $process->save();

            try {
                $aiContextFeedback = $chat->contextFeedback([
                    'intake' => $intake,
                    'ai_preferences' => $aiPreferences,
                    'vision' => $visionResult,
                    'analysis' => $analysisResult,
                ]);
                if (is_array($aiContextFeedback)) {
                    $analysisResult['context_feedback'] = $aiContextFeedback;
                }
            } catch (\Throwable $ignored) {
            }

            $process->context_feedback = (array) data_get($analysisResult, 'context_feedback');
            $process->analysis = $analysisResult;
            $process->save();
        } catch (\Throwable $e) {
            $process->status = 'failed';
            $process->error_status = 502;
            $process->error_message = $e->getMessage();
            $process->completed_at = now();
            $process->save();

            if ((bool) config('services.gemini.debug', false)) {
                \Illuminate\Support\Facades\Log::error('OutfitScanController analyze failed', [
                    'message' => $e->getMessage(),
                    'class' => get_class($e),
                ]);
            }
            return response()->json([
                'message' => 'Vision analysis failed. Please try again.',
                'process_id' => $process->id,
            ], 502);
        }

        $scan = OutfitScan::create([
            'user_id' => $user->id,
            'image_path' => $path,
            'vision' => $visionResult,
            'analysis' => $analysisResult,
            'score' => data_get($analysisResult, 'score'),
        ]);

        $process->scan_id = $scan->id;
        $process->status = 'completed';
        $process->completed_at = now();
        $process->save();

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
            'process_id' => $process->id,
        ], 201);
    }
}
