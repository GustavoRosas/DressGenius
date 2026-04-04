<?php

namespace App\Http\Controllers;

use App\Helpers\StorageHelper;
use Illuminate\Http\Request;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
        ]);

        $user->fill($validated);
        $user->save();

        return response()->json([
            'user' => $this->serializeUser($user),
        ]);
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        if (!Hash::check($validated['current_password'], (string) $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        $user->password = $validated['password'];
        $user->save();

        return response()->json([
            'message' => 'Password updated.',
            'user' => $this->serializeUser($user),
        ]);
    }

    public function uploadPhoto(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'photo' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        if ($user->profile_photo_path) {
            StorageHelper::disk()->delete($user->profile_photo_path);
        }

        $path = StorageHelper::disk()->putFile('profile-photos', $validated['photo']);
        $user->profile_photo_path = $path;
        $user->save();

        return response()->json([
            'user' => $this->serializeUser($user),
        ]);
    }

    private function serializeUser($user): array
    {
        $data = $user->toArray();

        /** @var FilesystemAdapter $disk */
        $disk = StorageHelper::disk();
        $data['profile_photo_url'] = $user->profile_photo_path ? $disk->url($user->profile_photo_path) : null;
        return $data;
    }
}
