<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BackgroundRemovalService
{
    /**
     * Remove background from an image stored on the public disk.
     *
     * Returns the storage-relative path of the processed image (PNG without
     * background). On any failure — or when no API key is configured — the
     * original path is returned untouched (graceful fallback).
     */
    public function removeBackground(string $imagePath): ?string
    {
        $apiKey = config('services.removebg.key');

        if (empty($apiKey)) {
            Log::debug('BackgroundRemovalService: no REMOVEBG_API_KEY configured, skipping.');

            return null;
        }

        try {
            return $this->viaRemoveBg($imagePath, $apiKey);
        } catch (\Throwable $e) {
            Log::warning('BackgroundRemovalService: Remove.bg failed — '.$e->getMessage());

            return null;
        }
    }

    /**
     * Call the Remove.bg API and store the resulting PNG.
     */
    private function viaRemoveBg(string $imagePath, string $apiKey): ?string
    {
        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        $absolutePath = $disk->path($imagePath);

        if (! file_exists($absolutePath)) {
            Log::warning("BackgroundRemovalService: source file not found at {$absolutePath}");

            return null;
        }

        $response = Http::timeout(30)
            ->withHeaders([
                'X-Api-Key' => $apiKey,
            ])
            ->attach('image_file', file_get_contents($absolutePath), basename($absolutePath))
            ->post('https://api.remove.bg/v1.0/removebg', [
                'size' => 'auto',
            ]);

        if (! $response->successful()) {
            Log::warning('BackgroundRemovalService: Remove.bg returned '.$response->status());

            return null;
        }

        // Build processed file path: same directory, filename suffixed with _nobg, always .png
        $directory = pathinfo($imagePath, PATHINFO_DIRNAME);
        $filename = pathinfo($imagePath, PATHINFO_FILENAME);
        $processedPath = $directory.'/'.$filename.'_nobg.png';

        $disk->put($processedPath, $response->body());

        Log::info("BackgroundRemovalService: saved processed image to {$processedPath}");

        return $processedPath;
    }
}
