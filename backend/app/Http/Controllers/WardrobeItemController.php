<?php

namespace App\Http\Controllers;

use App\Models\OutfitDetectedItem;
use App\Models\WardrobeItem;
use App\Services\BackgroundRemovalService;
use App\Helpers\StorageHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WardrobeItemController extends Controller
{
    public function index(Request $request)
    {
        $userId = $request->user()->id;

        $items = WardrobeItem::query()
            ->where('user_id', $userId)
            ->orderByDesc('id')
            ->limit(200)
            ->get();

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = StorageHelper::disk();

        return response()->json([
            'items' => $items->map(fn ($i) => [
                'id' => $i->id,
                'label' => $i->label,
                'category' => $i->category,
                'colors' => $i->colors,
                'cover_image_url' => $i->cover_image_path ? $disk->url($i->cover_image_path) : null,
                'created_at' => $i->created_at,
            ]),
        ]);
    }

    public function store(Request $request)
    {
        $userId = $request->user()->id;

        $detectedId = $request->input('detected_item_id');
        if ($detectedId) {
            /** @var OutfitDetectedItem|null $detected */
            $detected = OutfitDetectedItem::query()
                ->where('user_id', $userId)
                ->where('id', (int) $detectedId)
                ->first();

            if (!$detected) {
                return response()->json(['message' => 'Detected item not found.'], 404);
            }

            $label = (string) $detected->label;
            $category = $detected->category ? (string) $detected->category : null;
            $colors = is_array($detected->colors) ? $detected->colors : null;
            $coverImagePath = (string) data_get($detected->meta, 'cover_image_path', '');
            if ($coverImagePath === '') {
                $coverImagePath = null;
            }

            $canonicalKey = $this->canonicalKey($label, $category);

            $item = WardrobeItem::firstOrCreate(
                [
                    'user_id' => $userId,
                    'canonical_key' => $canonicalKey,
                ],
                [
                    'label' => $label,
                    'category' => $category,
                    'colors' => $colors,
                    'cover_image_path' => $coverImagePath,
                ]
            );

            // Background removal (graceful fallback)
            if ($item->wasRecentlyCreated && $item->cover_image_path) {
                $bgService = app(BackgroundRemovalService::class);
                $processed = $bgService->removeBackground($item->cover_image_path);
                $item->processed_image_path = $processed; // null if failed = graceful fallback
                $item->save();
            }

            return response()->json([
                'created' => $item->wasRecentlyCreated,
                'item' => [
                    'id' => $item->id,
                    'label' => $item->label,
                    'category' => $item->category,
                    'colors' => $item->colors,
                    'cover_image_path' => $item->cover_image_path,
                    'created_at' => $item->created_at,
                ],
            ], $item->wasRecentlyCreated ? 201 : 200);
        }

        $label = (string) $request->input('label', '');
        $category = $request->input('category');
        $category = $category === null ? null : (string) $category;

        if (trim($label) === '') {
            return response()->json(['message' => 'label is required.'], 422);
        }

        $canonicalKey = $this->canonicalKey($label, $category);

        $item = WardrobeItem::firstOrCreate(
            [
                'user_id' => $userId,
                'canonical_key' => $canonicalKey,
            ],
            [
                'label' => $label,
                'category' => $category,
            ]
        );

        return response()->json([
            'created' => $item->wasRecentlyCreated,
            'item' => [
                'id' => $item->id,
                'label' => $item->label,
                'category' => $item->category,
                'colors' => $item->colors,
                'cover_image_path' => $item->cover_image_path,
                'created_at' => $item->created_at,
            ],
        ], $item->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * POST /wardrobe-items/from-scan — bulk add detected items to closet.
     */
    public function fromScan(Request $request)
    {
        $userId = $request->user()->id;

        $ids = (array) $request->input('detected_item_ids', []);
        if (count($ids) === 0) {
            return response()->json(['message' => 'detected_item_ids is required.'], 422);
        }

        $detectedItems = OutfitDetectedItem::query()
            ->where('user_id', $userId)
            ->whereIn('id', $ids)
            ->get();

        if ($detectedItems->isEmpty()) {
            return response()->json(['message' => 'No valid detected items found.'], 404);
        }

        $created = [];
        foreach ($detectedItems as $detected) {
            $label = trim((string) $detected->label);
            if ($label === '') continue;

            $category = $detected->category ? (string) $detected->category : null;
            $colors = is_array($detected->colors) ? $detected->colors : null;
            $coverImagePath = (string) data_get($detected->meta, 'cover_image_path', '');
            if ($coverImagePath === '') {
                $coverImagePath = null;
            }

            $canonicalKey = $this->canonicalKey($label, $category);

            $item = WardrobeItem::firstOrCreate(
                [
                    'user_id' => $userId,
                    'canonical_key' => $canonicalKey,
                ],
                [
                    'label' => $label,
                    'category' => $category,
                    'colors' => $colors,
                    'cover_image_path' => $coverImagePath,
                ]
            );

            // Background removal for new items
            if ($item->wasRecentlyCreated && $item->cover_image_path) {
                try {
                    $bgService = app(BackgroundRemovalService::class);
                    $processed = $bgService->removeBackground($item->cover_image_path);
                    $item->processed_image_path = $processed;
                    $item->save();
                } catch (\Throwable $ignored) {}
            }

            $created[] = [
                'id' => $item->id,
                'label' => $item->label,
                'category' => $item->category,
                'colors' => $item->colors,
                'was_created' => $item->wasRecentlyCreated,
            ];
        }

        return response()->json(['items' => $created], 201);
    }

    public function update(Request $request, WardrobeItem $wardrobeItem)
    {
        $userId = $request->user()->id;
        if ($wardrobeItem->user_id !== $userId) {
            return response()->json(['message' => 'Wardrobe item not found.'], 404);
        }

        $label = (string) $request->input('label', '');
        $label = trim($label);
        if ($label === '') {
            return response()->json(['message' => 'label is required.'], 422);
        }
        if (mb_strlen($label) > 64) {
            return response()->json(['message' => 'label must be at most 64 characters.'], 422);
        }

        $category = $wardrobeItem->category ? (string) $wardrobeItem->category : null;
        $canonicalKey = $this->canonicalKey($label, $category);

        $duplicate = WardrobeItem::query()
            ->where('user_id', $userId)
            ->where('canonical_key', $canonicalKey)
            ->where('id', '!=', $wardrobeItem->id)
            ->exists();
        if ($duplicate) {
            return response()->json(['message' => 'An item with this name already exists in your closet.'], 409);
        }

        $wardrobeItem->label = $label;
        $wardrobeItem->canonical_key = $canonicalKey;
        $wardrobeItem->save();

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = StorageHelper::disk();

        return response()->json([
            'item' => [
                'id' => $wardrobeItem->id,
                'label' => $wardrobeItem->label,
                'category' => $wardrobeItem->category,
                'colors' => $wardrobeItem->colors,
                'cover_image_url' => $wardrobeItem->cover_image_path ? $disk->url($wardrobeItem->cover_image_path) : null,
                'created_at' => $wardrobeItem->created_at,
            ],
        ]);
    }

    public function markWorn(Request $request, WardrobeItem $wardrobeItem)
    {
        $userId = $request->user()->id;
        if ($wardrobeItem->user_id !== $userId) {
            return response()->json(['message' => 'Wardrobe item not found.'], 404);
        }

        $wardrobeItem->increment('wear_count');
        $wardrobeItem->update(['last_worn_at' => now()]);

        return response()->json([
            'item' => [
                'id' => $wardrobeItem->id,
                'wear_count' => $wardrobeItem->wear_count,
                'last_worn_at' => $wardrobeItem->last_worn_at,
            ],
        ]);
    }

    public function destroy(Request $request, WardrobeItem $wardrobeItem)
    {
        $userId = $request->user()->id;
        if ($wardrobeItem->user_id !== $userId) {
            return response()->json(['message' => 'Wardrobe item not found.'], 404);
        }

        $wardrobeItem->delete();

        return response()->noContent();
    }

    private function canonicalKey(string $label, ?string $category): string
    {
        $label = trim(mb_strtolower($label));
        $category = $category ? trim(mb_strtolower($category)) : '';
        $label = preg_replace('/\s+/', ' ', $label) ?? $label;
        $category = preg_replace('/\s+/', ' ', $category) ?? $category;

        return $label.'|'.$category;
    }
}
