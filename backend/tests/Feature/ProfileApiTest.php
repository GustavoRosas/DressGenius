<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_endpoints_require_auth(): void
    {
        $this->patchJson('/api/profile', ['name' => 'X', 'email' => 'x@example.com'])->assertStatus(401);
        $this->patchJson('/api/profile/password', [
            'current_password' => 'password',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(401);

        $this->postJson('/api/profile/photo', [
            'photo' => UploadedFile::fake()->create('p.jpg', 10, 'image/jpeg'),
        ])->assertStatus(401);
    }

    public function test_update_profile_updates_name_and_email(): void
    {
        $user = User::factory()->create([
            'name' => 'Old Name',
            'email' => 'old@example.com',
        ]);

        $token = $user->createToken('api')->plainTextToken;

        $res = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/profile', [
                'name' => 'New Name',
                'email' => 'new@example.com',
            ]);

        $res
            ->assertStatus(200)
            ->assertJson([
                'user' => [
                    'id' => $user->id,
                    'name' => 'New Name',
                    'email' => 'new@example.com',
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'email' => 'new@example.com',
        ]);
    }

    public function test_update_profile_rejects_duplicate_email(): void
    {
        $user = User::factory()->create([
            'email' => 'user@example.com',
        ]);

        User::factory()->create([
            'email' => 'taken@example.com',
        ]);

        $token = $user->createToken('api')->plainTextToken;

        $res = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/profile', [
                'name' => $user->name,
                'email' => 'taken@example.com',
            ]);

        $res->assertStatus(422);
    }

    public function test_update_password_rejects_wrong_current_password(): void
    {
        $user = User::factory()->create([
            'password' => 'password123',
        ]);

        $token = $user->createToken('api')->plainTextToken;

        $res = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/profile/password', [
                'current_password' => 'wrong-password',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ]);

        $res
            ->assertStatus(422)
            ->assertJson([
                'message' => 'Current password is incorrect.',
            ]);
    }

    public function test_update_password_updates_hash_and_returns_message(): void
    {
        $user = User::factory()->create([
            'password' => 'password123',
        ]);

        $token = $user->createToken('api')->plainTextToken;

        $res = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->patchJson('/api/profile/password', [
                'current_password' => 'password123',
                'password' => 'newpassword123',
                'password_confirmation' => 'newpassword123',
            ]);

        $res
            ->assertStatus(200)
            ->assertJson([
                'message' => 'Password updated.',
                'user' => [
                    'id' => $user->id,
                    'email' => $user->email,
                ],
            ]);

        $user->refresh();
        $this->assertTrue(Hash::check('newpassword123', (string) $user->password));
    }

    public function test_upload_photo_stores_file_and_updates_user(): void
    {
        Storage::fake('public');

        $user = User::factory()->create([
            'profile_photo_path' => null,
        ]);

        $token = $user->createToken('api')->plainTextToken;

        $file = UploadedFile::fake()->create('avatar.jpg', 10, 'image/jpeg');

        $res = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/profile/photo', [
                'photo' => $file,
            ]);

        $res
            ->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name', 'email', 'profile_photo_url'],
            ]);

        $user->refresh();
        $this->assertNotNull($user->profile_photo_path);
        $this->assertTrue(Storage::disk('public')->exists($user->profile_photo_path));
    }

    public function test_upload_photo_rejects_invalid_mime_type(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $token = $user->createToken('api')->plainTextToken;

        $file = UploadedFile::fake()->create('bad.txt', 2, 'text/plain');

        $res = $this->withHeader('Accept', 'application/json')
            ->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/profile/photo', [
                'photo' => $file,
            ]);

        $res->assertStatus(422);
    }
}
