<?php

namespace App\Http\Controllers;

use App\Http\Requests\AnalyzeOutfitChatRequest;
use App\Http\Requests\StoreOutfitChatMessageRequest;
use App\Models\OutfitChatAttachment;
use App\Models\OutfitChatMessage;
use App\Models\OutfitChatSession;
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

        $image = $request->file('image');
        $intake = $request->input('intake') ?? [];

        $path = $image->store('outfit-chats/'.$user->id, 'public');

        try {
            $visionResult = $vision->analyzeOutfitImage($image);
            $analysisResult = $analysis->analyze($visionResult);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('OutfitChatController analyze failed', [
                'message' => $e->getMessage(),
                'class' => get_class($e),
            ]);
            return response()->json([
                'message' => 'Vision analysis failed. Please try again.',
            ], 502);
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
                'vision' => $visionResult,
                'analysis' => $analysisResult,
                'recent_messages' => [
                    ['role' => 'user', 'content' => $initialUserText],
                ],
            ]);
        } catch (\Throwable $e) {
            $assistantText = "Score: ".data_get($analysisResult, 'score')."\n\n".
                "Pros: ".implode(' ', (array) data_get($analysisResult, 'pros', []))."\n\n".
                "Issues: ".implode(' ', (array) data_get($analysisResult, 'issues', []))."\n\n".
                "Suggestions: ".implode(' ', (array) data_get($analysisResult, 'suggestions', []));
        }

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
        ], 201);
    }

    public function storeMessage(OutfitChatSession $session, StoreOutfitChatMessageRequest $request, GeminiChatService $chat)
    {
        $userId = $request->user()->id;
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

        $content = (string) $request->input('content');

        $userMsg = OutfitChatMessage::create([
            'session_id' => $session->id,
            'role' => 'user',
            'content' => $content,
        ]);

        $recent = OutfitChatMessage::query()
            ->where('session_id', $session->id)
            ->orderByDesc('id')
            ->limit(12)
            ->get()
            ->reverse()
            ->values()
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->all();

        $assistantText = $chat->reply([
            'intake' => $session->intake,
            'vision' => $session->vision,
            'analysis' => $session->analysis,
            'recent_messages' => $recent,
        ]);

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
            'messages' => $session->relationLoaded('messages')
                ? $session->messages->map(fn ($m) => $this->serializeMessage($m))->all()
                : [],
        ];
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
