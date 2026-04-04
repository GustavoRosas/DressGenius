<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreOutfitScanRequest;
use App\Models\OutfitAnalysisProcess;
use App\Models\OutfitDetectedItem;
use App\Models\OutfitScan;
use App\Services\AnalyticsAggregatorService;
use App\Services\ColorAnalysisService;
use App\Services\GeminiChatService;
use App\Services\GeminiVisionService;
use App\Services\OutfitAnalysisService;
use App\Helpers\StorageHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OutfitScanController extends Controller
{
    /**
     * GET /outfit-scans — paginated list of user's scans (newest first).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = StorageHelper::disk();

        $scans = OutfitScan::query()
            ->where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->paginate(20);

        // Attach the process intake for each scan (occasion lives there)
        $scanIds = $scans->pluck('id');
        $processes = OutfitAnalysisProcess::query()
            ->whereIn('scan_id', $scanIds)
            ->get()
            ->keyBy('scan_id');

        $items = $scans->getCollection()->map(function (OutfitScan $scan) use ($disk, $processes) {
            $process = $processes->get($scan->id);
            $analysis = is_array($scan->analysis) ? $scan->analysis : [];

            return [
                'id' => $scan->id,
                'image_url' => $disk->url($scan->image_path),
                'score' => $scan->score,
                'score_label' => data_get($analysis, 'score_label'),
                'occasion' => data_get($process?->intake ?? [], 'occasion'),
                'created_at' => $scan->created_at,
            ];
        });

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $scans->currentPage(),
                'last_page' => $scans->lastPage(),
                'per_page' => $scans->perPage(),
                'total' => $scans->total(),
            ],
        ]);
    }

    /**
     * GET /outfit-scans/{outfitScan} — full detail of a single scan (owner only).
     */
    public function show(Request $request, OutfitScan $outfitScan)
    {
        $user = $request->user();

        if ($outfitScan->user_id !== $user->id) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = StorageHelper::disk();

        $process = OutfitAnalysisProcess::query()
            ->where('scan_id', $outfitScan->id)
            ->first();

        $detectedItems = OutfitDetectedItem::query()
            ->where('source_type', 'scan')
            ->where('source_id', $outfitScan->id)
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'label' => $row->label,
                'category' => $row->category,
                'colors' => $row->colors,
            ])
            ->all();

        return response()->json([
            'scan' => [
                'id' => $outfitScan->id,
                'image_url' => $disk->url($outfitScan->image_path),
                'vision' => $outfitScan->vision,
                'analysis' => $outfitScan->analysis,
                'score' => $outfitScan->score,
                'intake' => $process?->intake,
                'created_at' => $outfitScan->created_at,
            ],
            'detected_items' => $detectedItems,
        ]);
    }

    public function store(StoreOutfitScanRequest $request, GeminiVisionService $vision, OutfitAnalysisService $analysis, GeminiChatService $chat)
    {
        $user = $request->user();

        // Enforce free tier limit (5 analyses/month)
        $isPremium = !empty($user->plan) && $user->plan !== 'free';
        if (!$isPremium) {
            $monthlyCount = OutfitScan::where('user_id', $user->id)
                ->where('created_at', '>=', now()->startOfMonth())
                ->count();
            $freeLimit = 5;
            if ($monthlyCount >= $freeLimit) {
                return response()->json([
                    'message' => 'You have reached your free limit of ' . $freeLimit . ' analyses this month. Upgrade to Premium for unlimited analyses.',
                    'limit_reached' => true,
                    'analyses_used' => $monthlyCount,
                    'analyses_limit' => $freeLimit,
                ], 429);
            }
        }

        $aiPreferences = (array) ($user->ai_preferences ?? []);

        $image = $request->file('image');
        $intake = $request->input('intake') ?? [];

        $path = StorageHelper::disk()->putFile('outfit-scans/'.$user->id, $image);

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

        // Color Theory Analysis (graceful — non-blocking)
        try {
            $colorService = app(ColorAnalysisService::class);
            $language = data_get($intake, 'language', 'en');
            $colorAnalysis = $colorService->analyzeColors($path, $language);
            $analysisResult['color_analysis'] = $colorAnalysis;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Color analysis failed (non-blocking): ' . $e->getMessage());
            $analysisResult['color_analysis'] = null;
        }

        // Use the rich Gemini score (0-10) if available
        // Score stored as decimal(5,1)
        $rawScore = data_get($analysisResult, 'score');
        $finalScore = $rawScore !== null ? round((float) $rawScore, 1) : null;

        $scan = OutfitScan::create([
            'user_id' => $user->id,
            'image_path' => $path,
            'vision' => $visionResult,
            'analysis' => $analysisResult,
            'score' => $finalScore,
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
        $disk = StorageHelper::disk();

        // Fire analytics aggregation (non-blocking)
        try {
            app(AnalyticsAggregatorService::class)->aggregate($user->id);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Analytics aggregation failed: ' . $e->getMessage());
        }

        return response()->json([
            'scan' => [
                'id' => $scan->id,
                'image_url' => $disk->url($path),
                'vision' => $scan->vision,
                'analysis' => $scan->analysis,
                'score' => $scan->score,
                'intake' => $process->intake,
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
