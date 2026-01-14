<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyzeOutfitChatRequest;
use App\Http\Requests\StoreOutfitChatMessageRequest;
use App\Models\OutfitAnalysisProcess;
use App\Models\OutfitChatAttachment;
use App\Models\OutfitChatMessage;
use App\Models\OutfitChatSession;
use App\Models\OutfitDetectedItem;
use App\Services\GeminiChatService;
use App\Services\GeminiVisionService;
use App\Services\OutfitAnalysisService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class OutfitChatController extends Controller
{
    private const MAX_TURNS = 10;

    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $sessions = OutfitChatSession::query()
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->limit(50)
            ->get();

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return response()->json([
            'sessions' => $sessions->map(fn ($s) => [
                'id' => $s->id,
                'title' => $s->title,
                'score' => $s->score,
                'turns_used' => $s->turns_used,
                'status' => $s->status,
                'image_url' => $disk->url($s->image_path),
                'created_at' => $s->created_at,
            ]),
        ]);
    }

    public function show(Request $request, OutfitChatSession $session)
    {
        $userId = $request->user()->id;
        if ($session->user_id !== $userId) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        $session->load(['messages' => fn ($q) => $q->orderBy('id'), 'attachments']);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return response()->json([
            'session' => $this->serializeSession($session, $disk),
        ]);
    }

    public function analyze(AnalyzeOutfitChatRequest $request, GeminiVisionService $vision, OutfitAnalysisService $analysis, GeminiChatService $chat)
    {
        $user = $request->user();
        $aiPreferences = (array) ($user->ai_preferences ?? []);

        $image = $request->file('image');
        $intake = $request->input('intake') ?? [];

        $path = $image->store('outfit-chats/'.$user->id, 'public');

        $process = OutfitAnalysisProcess::create([
            'user_id' => $user->id,
            'kind' => 'chat_analyze',
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
                \Illuminate\Support\Facades\Log::error('OutfitChatController analyze failed', [
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

        $initialUserText = (string) ($request->input('message') ?: 'Analyze my outfit with the provided context.');

        $session = OutfitChatSession::create([
            'user_id' => $user->id,
            'title' => $intake['occasion'] ?? null,
            'image_path' => $path,
            'intake' => $intake,
            'vision' => $visionResult,
            'analysis' => $analysisResult,
            'score' => data_get($analysisResult, 'score'),
            'turns_used' => 1,
            'status' => 'active',
        ]);

        $detectedItems = $this->persistDetectedItems(
            userId: $user->id,
            sourceType: 'chat_session',
            sourceId: $session->id,
            processId: $process->id,
            vision: $visionResult,
            coverImagePath: $path,
        );

        $process->chat_session_id = $session->id;
        $process->status = 'completed';
        $process->completed_at = now();
        $process->save();

        $userMsg = OutfitChatMessage::create([
            'session_id' => $session->id,
            'role' => 'user',
            'content' => $initialUserText,
        ]);

        OutfitChatAttachment::create([
            'session_id' => $session->id,
            'message_id' => $userMsg->id,
            'kind' => 'image',
            'path' => $path,
            'mime' => $image->getMimeType(),
            'size' => $image->getSize(),
        ]);

        try {
            $assistantText = $chat->reply([
                'intake' => $intake,
                'ai_preferences' => $aiPreferences,
                'vision' => $visionResult,
                'analysis' => $analysisResult,
                'recent_messages' => [
                    ['role' => 'user', 'content' => $initialUserText],
                ],
            ]);
        } catch (\Throwable $e) {
            $contextLines = [];
            foreach ((array) data_get($analysisResult, 'context_feedback', []) as $key => $row) {
                $status = (string) data_get($row, 'status', 'neutral');
                $message = (string) data_get($row, 'message', '');
                if ($message !== '') {
                    $contextLines[] = ucfirst((string) $key)." (".$status."): ".$message;
                }
            }

            $assistantText = "Score: ".data_get($analysisResult, 'score')."\n\n".
                (count($contextLines) ? ("Context:\n".implode("\n", $contextLines)."\n\n") : '').
                "Pros: ".implode(' ', (array) data_get($analysisResult, 'pros', []))."\n\n".
                "Issues: ".implode(' ', (array) data_get($analysisResult, 'issues', []))."\n\n".
                "Suggestions: ".implode(' ', (array) data_get($analysisResult, 'suggestions', []));
        }

        $process->assistant_text = $assistantText;
        $process->save();

        OutfitChatMessage::create([
            'session_id' => $session->id,
            'role' => 'assistant',
            'content' => $assistantText,
            'meta' => [
                'score' => data_get($analysisResult, 'score'),
            ],
        ]);

        $session->load(['messages' => fn ($q) => $q->orderBy('id'), 'attachments']);

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        return response()->json([
            'session' => $this->serializeSession($session, $disk),
            'detected_items' => $detectedItems,
            'process_id' => $process->id,
        ], 201);
    }

    public function storeMessage(OutfitChatSession $session, StoreOutfitChatMessageRequest $request, GeminiChatService $chat)
    {
        $userId = $request->user()->id;
        $aiPreferences = (array) ($request->user()->ai_preferences ?? []);
        if ($session->user_id !== $userId) {
            return response()->json(['message' => 'Not found.'], 404);
        }

        if ($session->turns_used >= self::MAX_TURNS) {
            return response()->json([
                'message' => 'This chat has reached the 10-turn limit.',
                'turns_used' => $session->turns_used,
                'turns_max' => self::MAX_TURNS,
            ], 429);
        }

        $retryMessageId = $request->input('retry_message_id');
        $content = (string) $request->input('content');

        /** @var \App\Models\OutfitChatMessage|null $userMsg */
        $userMsg = null;
        if ($retryMessageId) {
            $userMsg = OutfitChatMessage::query()
                ->where('session_id', $session->id)
                ->where('role', 'user')
                ->where('id', (int) $retryMessageId)
                ->first();

            if (!$userMsg) {
                return response()->json(['message' => 'Message not found.'], 404);
            }

            if (!is_array($userMsg->meta) || ((string) data_get($userMsg->meta, 'status')) !== 'failed') {
                return response()->json(['message' => 'This message cannot be retried.'], 422);
            }

            $content = (string) $userMsg->content;
        } else {
            if (trim($content) === '') {
                return response()->json(['message' => 'Content is required.'], 422);
            }
        }

        $recent = OutfitChatMessage::query()
            ->where('session_id', $session->id)
            ->orderByDesc('id')
            ->limit(12)
            ->get()
            ->reverse()
            ->values()
            ->filter(fn ($m) => !is_array($m->meta) || ((string) data_get($m->meta, 'status')) !== 'failed')
            ->values()
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->all();

        $recentForAi = array_merge($recent, [
            ['role' => 'user', 'content' => $content],
        ]);

        try {
            $assistantText = $chat->reply([
                'intake' => $session->intake,
                'ai_preferences' => $aiPreferences,
                'vision' => $session->vision,
                'analysis' => $session->analysis,
                'recent_messages' => $recentForAi,
            ]);
        } catch (\RuntimeException $e) {
            $msg = $e->getMessage();
            $retryAfter = null;

            if (preg_match('/retry in ([0-9.]+)s/i', $msg, $m)) {
                $retryAfter = (int) ceil((float) $m[1]);
            } elseif (preg_match('/"retryDelay"\s*:\s*"([0-9]+)s"/i', $msg, $m)) {
                $retryAfter = (int) $m[1];
            }

            $statusCode = 502;
            $publicMessage = 'AI reply failed. Please try again.';
            if (str_contains($msg, 'quota exceeded (429)') || str_contains($msg, 'RESOURCE_EXHAUSTED') || str_contains($msg, 'generate_content_free_tier_requests')) {
                $statusCode = 429;
                $publicMessage = 'AI quota exceeded. Please wait a bit and try again.';
            }

            if (!$userMsg) {
                $userMsg = OutfitChatMessage::create([
                    'session_id' => $session->id,
                    'role' => 'user',
                    'content' => $content,
                    'meta' => [
                        'status' => 'failed',
                        'error_status' => $statusCode,
                        'error_message' => $publicMessage,
                        'retry_after' => $retryAfter,
                    ],
                ]);
            } else {
                $meta = (array) ($userMsg->meta ?? []);
                $meta['status'] = 'failed';
                $meta['error_status'] = $statusCode;
                $meta['error_message'] = $publicMessage;
                $meta['retry_after'] = $retryAfter;
                $userMsg->meta = $meta;
                $userMsg->save();
            }

            return response()->json([
                'message' => $publicMessage,
                'retry_after' => $retryAfter,
                'messages' => [$this->serializeMessage($userMsg)],
                'turns_used' => $session->turns_used,
                'turns_max' => self::MAX_TURNS,
            ], $statusCode);
        }

        if (!$userMsg) {
            $userMsg = OutfitChatMessage::create([
                'session_id' => $session->id,
                'role' => 'user',
                'content' => $content,
            ]);
        } else {
            $meta = (array) ($userMsg->meta ?? []);
            unset($meta['status'], $meta['error_status'], $meta['error_message'], $meta['retry_after']);
            $userMsg->meta = count($meta) ? $meta : null;
            $userMsg->save();
        }

        $assistantMsg = OutfitChatMessage::create([
            'session_id' => $session->id,
            'role' => 'assistant',
            'content' => $assistantText,
        ]);

        $session->turns_used = $session->turns_used + 1;
        if ($session->turns_used >= self::MAX_TURNS) {
            $session->status = 'closed';
        }
        $session->save();

        return response()->json([
            'messages' => [
                $this->serializeMessage($userMsg),
                $this->serializeMessage($assistantMsg),
            ],
            'turns_used' => $session->turns_used,
            'turns_max' => self::MAX_TURNS,
        ]);
    }

    private function serializeSession(OutfitChatSession $session, $disk): array
    {
        $detectedItems = OutfitDetectedItem::query()
            ->where('source_type', 'chat_session')
            ->where('source_id', $session->id)
            ->orderBy('id')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->id,
                'label' => $row->label,
                'category' => $row->category,
                'colors' => $row->colors,
            ])
            ->all();

        return [
            'id' => $session->id,
            'title' => $session->title,
            'intake' => $session->intake,
            'vision' => $session->vision,
            'analysis' => $session->analysis,
            'score' => $session->score,
            'turns_used' => $session->turns_used,
            'turns_max' => self::MAX_TURNS,
            'status' => $session->status,
            'image_url' => $disk->url($session->image_path),
            'created_at' => $session->created_at,
            'detected_items' => $detectedItems,
            'messages' => $session->relationLoaded('messages')
                ? $session->messages->map(fn ($m) => $this->serializeMessage($m))->all()
                : [],
        ];
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

    private function serializeMessage(OutfitChatMessage $m): array
    {
        return [
            'id' => $m->id,
            'role' => $m->role,
            'content' => $m->content,
            'meta' => $m->meta,
            'created_at' => $m->created_at,
        ];
    }
}
