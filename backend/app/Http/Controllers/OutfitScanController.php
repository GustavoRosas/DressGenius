<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOutfitScanRequest;
use App\Models\OutfitAnalysisProcess;
use App\Models\OutfitDetectedItem;
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
            $status = 502;
            $retryAfter = null;

            $msg = (string) $e->getMessage();
            if (str_contains($msg, 'Gemini quota exceeded (429)')) {
                $status = 429;
                $retryAfter = $this->parseRetryAfterSeconds($msg);
            }

            $process->status = 'failed';
            $process->error_status = $status;
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
                'message' => $status === 429 ? 'AI quota exceeded. Please retry shortly.' : 'Vision analysis failed. Please try again.',
                'process_id' => $process->id,
                'retry_after' => $retryAfter,
            ], $status);
        }

        $scan = OutfitScan::create([
            'user_id' => $user->id,
            'image_path' => $path,
            'vision' => $visionResult,
            'analysis' => $analysisResult,
            'score' => data_get($analysisResult, 'score'),
        ]);

        $detectedItems = $this->persistDetectedItems(
            userId: $user->id,
            sourceType: 'scan',
            sourceId: $scan->id,
            processId: $process->id,
            vision: $visionResult,
            coverImagePath: $path,
        );

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
            'detected_items' => $detectedItems,
            'process_id' => $process->id,
        ], 201);
    }

    private function persistDetectedItems(int $userId, string $sourceType, int $sourceId, int $processId, array $vision, string $coverImagePath): array
    {
        $items = [];
        $byCategory = (array) data_get($vision, 'items', []);

        foreach ($byCategory as $category => $labels) {
            foreach ((array) $labels as $label) {
                $label = trim((string) $label);
                if ($label === '') {
                    continue;
                }

                $items[] = OutfitDetectedItem::create([
                    'user_id' => $userId,
                    'source_type' => $sourceType,
                    'source_id' => $sourceId,
                    'process_id' => $processId,
                    'label' => $label,
                    'category' => is_string($category) && $category !== '' ? $category : null,
                    'colors' => data_get($vision, 'colors'),
                    'meta' => [
                        'cover_image_path' => $coverImagePath,
                    ],
                ]);
            }
        }

        return array_map(fn ($row) => [
            'id' => $row->id,
            'label' => $row->label,
            'category' => $row->category,
            'colors' => $row->colors,
        ], $items);
    }

    private function parseRetryAfterSeconds(string $message): ?int
    {
        if (preg_match('/Please retry in\s+([0-9.]+)\s*(ms|s)\./i', $message, $m) === 1) {
            $n = (float) $m[1];
            $unit = strtolower((string) $m[2]);
            if ($unit === 'ms') {
                return (int) max(1, (int) ceil($n / 1000));
            }
            return (int) max(1, (int) ceil($n));
        }

        if (preg_match('/"retryDelay"\s*:\s*"(\d+)s"/i', $message, $m) === 1) {
            return (int) max(1, (int) $m[1]);
        }

        return null;
    }
}
