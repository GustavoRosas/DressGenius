<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Laravel\Sanctum\PersonalAccessToken;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_register_creates_user_and_returns_token(): void
    {
        $payload = [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
        ];

        $response = $this->postJson('/api/register', $payload);

        $response
            ->assertStatus(201)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email'],
                'token',
            ]);

        $this->assertDatabaseHas('users', ['email' => 'test@example.com']);

        $token = $response->json('token');
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }

    public function test_login_returns_token_for_valid_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email'],
                'token',
            ]);

        $token = $response->json('token');
        $this->assertIsString($token);
        $this->assertNotEmpty($token);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        User::factory()->create([
            'email' => 'test@example.com',
            'password' => 'password',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'test@example.com',
            'password' => 'wrong-password',
        ]);

        $response
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Invalid credentials.',
            ]);
    }

    public function test_me_requires_auth_and_returns_user_when_authenticated(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $token = $user->createToken('api')->plainTextToken;

        $unauth = $this->getJson('/api/me');
        $unauth->assertStatus(401);

        $auth = $this->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me');

        $auth
            ->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);
    }

    public function test_logout_invalidates_current_token(): void
    {
        $user = User::factory()->create([
            'email' => 'test@example.com',
        ]);

        $token = $user->createToken('api')->plainTextToken;
        $tokenId = (int) explode('|', $token, 2)[0];

        $logout = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $logout
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Logged out.',
            ]);

        $this->assertNull(PersonalAccessToken::query()->find($tokenId));
        $this->assertNull(PersonalAccessToken::findToken($token));

        Auth::forgetGuards();
        $this->flushSession();

        $after = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->getJson('/api/me');

        $after->assertStatus(401);
    }
}
