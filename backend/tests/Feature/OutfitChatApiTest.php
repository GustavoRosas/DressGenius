<?php

namespace Tests\Feature;

use App\Models\OutfitChatSession;
use App\Models\User;
use App\Services\GeminiChatService;
use App\Services\GeminiVisionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OutfitChatApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_outfit_chat_endpoints_require_auth(): void
    {
        $this->getJson('/api/outfit-chats')->assertStatus(401);
        $this->postJson('/api/outfit-chats/analyze')->assertStatus(401);
    }

    public function test_analyze_creates_session_messages_and_attachment(): void
    {
        Storage::fake('public');

        $this->mock(GeminiVisionService::class, function ($mock) {
            $mock->shouldReceive('analyzeOutfitImage')->andReturn([
                'items' => ['tops' => ['t-shirt'], 'bottoms' => ['jeans'], 'shoes' => ['sneakers'], 'outerwear' => [], 'accessories' => []],
                'colors' => ['blue'],
                'patterns' => [],
                'materials' => [],
                'style_tags' => [],
                'description' => 'A blue t-shirt with jeans and sneakers.',
            ]);
        });

        $this->mock(GeminiChatService::class, function ($mock) {
            $mock->shouldReceive('reply')->andReturn('Mock assistant reply.');
        });

        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $file = UploadedFile::fake()->create('outfit.jpg', 10, 'image/jpeg');

        $res = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/outfit-chats/analyze', [
                'image' => $file,
                'intake' => [
                    'occasion' => 'Work',
                    'weather' => 'Warm',
                    'dress_code' => 'Business casual',
                    'budget' => 'Medium',
                    'desired_vibe' => 'Clean and modern',
                ],
                'message' => 'Analyze my outfit.',
            ]);

        $res
            ->assertStatus(201)
            ->assertJsonStructure([
                'session' => [
                    'id',
                    'intake',
                    'vision',
                    'analysis',
                    'score',
                    'turns_used',
                    'turns_max',
                    'status',
                    'image_url',
                    'messages',
                ],
            ]);

        $sessionId = $res->json('session.id');
        $this->assertIsInt($sessionId);

        $session = OutfitChatSession::query()->findOrFail($sessionId);
        $this->assertSame($user->id, $session->user_id);
        $this->assertSame(1, (int) $session->turns_used);

        $this->assertDatabaseHas('outfit_chat_messages', [
            'session_id' => $sessionId,
            'role' => 'user',
        ]);

        $this->assertDatabaseHas('outfit_chat_messages', [
            'session_id' => $sessionId,
            'role' => 'assistant',
        ]);

        $this->assertDatabaseHas('outfit_chat_attachments', [
            'session_id' => $sessionId,
            'kind' => 'image',
        ]);

        $session->refresh();
        $this->assertTrue(Storage::disk('public')->exists($session->image_path));
    }

    public function test_store_message_increments_turns_and_enforces_limit(): void
    {
        Storage::fake('public');

        $this->mock(GeminiChatService::class, function ($mock) {
            $mock->shouldReceive('reply')->andReturn('Mock follow-up reply.');
        });

        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $session = OutfitChatSession::create([
            'user_id' => $user->id,
            'title' => null,
            'image_path' => 'outfit-chats/'.$user->id.'/x.jpg',
            'intake' => ['occasion' => 'Work'],
            'vision' => ['description' => 'desc'],
            'analysis' => ['score' => 70],
            'score' => 70,
            'turns_used' => 1,
            'status' => 'active',
        ]);

        // Use up turns 2..10 (9 requests)
        for ($i = 0; $i < 9; $i++) {
            $res = $this->withHeader('Accept', 'application/json')
                ->withHeader('Authorization', "Bearer {$token}")
                ->postJson("/api/outfit-chats/{$session->id}/messages", [
                    'content' => 'Question '.$i,
                ]);

            $res
                ->assertStatus(200)
                ->assertJsonStructure([
                    'messages',
                    'turns_used',
                    'turns_max',
                ]);
        }

        $session->refresh();
        $this->assertSame(10, (int) $session->turns_used);
        $this->assertSame('closed', (string) $session->status);

        // 11th turn should be blocked
        $blocked = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson("/api/outfit-chats/{$session->id}/messages", [
                'content' => 'One more',
            ]);

        $blocked
            ->assertStatus(429)
            ->assertJson([
                'message' => 'This chat has reached the 10-turn limit.',
                'turns_used' => 10,
                'turns_max' => 10,
            ]);
    }

    public function test_index_and_show_only_return_users_own_sessions(): void
    {
        Storage::fake('public');

        $userA = User::factory()->create();
        $tokenA = $userA->createToken('api')->plainTextToken;

        $userB = User::factory()->create();
        $tokenB = $userB->createToken('api')->plainTextToken;

        $a = OutfitChatSession::create([
            'user_id' => $userA->id,
            'title' => 'A',
            'image_path' => 'outfit-chats/'.$userA->id.'/a.jpg',
            'turns_used' => 1,
            'status' => 'active',
        ]);

        $b = OutfitChatSession::create([
            'user_id' => $userB->id,
            'title' => 'B',
            'image_path' => 'outfit-chats/'.$userB->id.'/b.jpg',
            'turns_used' => 1,
            'status' => 'active',
        ]);

        $listA = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson('/api/outfit-chats');

        $listA
            ->assertStatus(200)
            ->assertJsonCount(1, 'sessions')
            ->assertJsonPath('sessions.0.id', $a->id);

        $showA = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson("/api/outfit-chats/{$a->id}");

        $showA
            ->assertStatus(200)
            ->assertJsonPath('session.id', $a->id);

        $cantSeeB = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$tokenA}")
            ->getJson("/api/outfit-chats/{$b->id}");

        $cantSeeB->assertStatus(404);

        Auth::forgetGuards();
        $this->flushSession();

        // sanity for user B list
        $listB = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$tokenB}")
            ->getJson('/api/outfit-chats');

        $listB
            ->assertStatus(200)
            ->assertJsonCount(1, 'sessions')
            ->assertJsonPath('sessions.0.id', $b->id);
    }
}
