<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AIPreferencesController;
use App\Http\Controllers\OutfitChatController;
use App\Http\Controllers\OutfitScanController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\WardrobeItemController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::get('/ai-preferences', [AIPreferencesController::class, 'show']);
    Route::put('/ai-preferences', [AIPreferencesController::class, 'update']);

    Route::patch('/profile', [ProfileController::class, 'update']);
    Route::patch('/profile/password', [ProfileController::class, 'updatePassword']);
    Route::post('/profile/photo', [ProfileController::class, 'uploadPhoto']);

    Route::get('/outfit-chats', [OutfitChatController::class, 'index']);
    Route::get('/outfit-chats/{session}', [OutfitChatController::class, 'show']);
    Route::post('/outfit-chats/analyze', [OutfitChatController::class, 'analyze']);
    Route::post('/outfit-chats/{session}/messages', [OutfitChatController::class, 'storeMessage']);
    Route::post('/outfit-chats/{session}/finish', [OutfitChatController::class, 'finish']);
    Route::post('/outfit-chats/{session}/feedback', [OutfitChatController::class, 'storeFeedback']);

    Route::post('/outfit-scans', [OutfitScanController::class, 'store']);

    Route::get('/wardrobe-items', [WardrobeItemController::class, 'index']);
    Route::post('/wardrobe-items', [WardrobeItemController::class, 'store']);
    Route::patch('/wardrobe-items/{wardrobeItem}', [WardrobeItemController::class, 'update']);
    Route::delete('/wardrobe-items/{wardrobeItem}', [WardrobeItemController::class, 'destroy']);
});