<?php

namespace App\Helpers;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;

/**
 * Centralized storage access.
 *
 * Dev: uses 'public' disk (local filesystem).
 * Prod: uses 'r2' disk (Cloudflare R2 via S3 driver).
 *
 * Controlled by FILESYSTEM_DISK env variable.
 */
class StorageHelper
{
    public static function disk(): FilesystemAdapter
    {
        /** @var FilesystemAdapter $disk */
        $disk = Storage::disk(config('filesystems.default'));
        return $disk;
    }

    public static function url(string $path): string
    {
        return self::disk()->url($path);
    }

    public static function put(string $path, $contents, $options = []): bool
    {
        return self::disk()->put($path, $contents, $options);
    }

    public static function putFile(string $directory, $file): string|false
    {
        return self::disk()->putFile($directory, $file);
    }

    public static function delete(string|array $paths): bool
    {
        return self::disk()->delete($paths);
    }

    public static function exists(string $path): bool
    {
        return self::disk()->exists($path);
    }

    public static function get(string $path): ?string
    {
        return self::disk()->get($path);
    }
}
