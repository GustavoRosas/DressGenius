<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outfit_chat_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title')->nullable();
            $table->string('image_path');
            $table->json('intake')->nullable();
            $table->json('vision')->nullable();
            $table->json('analysis')->nullable();
            $table->unsignedTinyInteger('score')->nullable();
            $table->unsignedTinyInteger('turns_used')->default(0);
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('outfit_chat_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('outfit_chat_sessions')->cascadeOnDelete();
            $table->string('role');
            $table->text('content');
            $table->json('meta')->nullable();
            $table->timestamps();
        });

        Schema::create('outfit_chat_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('session_id')->constrained('outfit_chat_sessions')->cascadeOnDelete();
            $table->foreignId('message_id')->nullable()->constrained('outfit_chat_messages')->nullOnDelete();
            $table->string('kind');
            $table->string('path');
            $table->string('mime')->nullable();
            $table->unsignedInteger('size')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outfit_chat_attachments');
        Schema::dropIfExists('outfit_chat_messages');
        Schema::dropIfExists('outfit_chat_sessions');
    }
};
