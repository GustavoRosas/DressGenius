<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AIPreferencesController;
use App\Http\Controllers\OutfitScanController;
use App\Http\Controllers\ProfileController;
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

    Route::post('/outfit-scans', [OutfitScanController::class, 'store']);
});