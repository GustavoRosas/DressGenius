<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outfit_analysis_processes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('kind');
            $table->string('status')->default('processing');

            $table->string('image_path')->nullable();
            $table->json('intake')->nullable();
            $table->json('ai_preferences')->nullable();

            $table->json('vision')->nullable();
            $table->json('analysis')->nullable();
            $table->json('context_feedback')->nullable();
            $table->longText('assistant_text')->nullable();

            $table->foreignId('chat_session_id')->nullable()->constrained('outfit_chat_sessions')->nullOnDelete();
            $table->foreignId('scan_id')->nullable()->constrained('outfit_scans')->nullOnDelete();

            $table->unsignedInteger('error_status')->nullable();
            $table->text('error_message')->nullable();

            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('outfit_analysis_processes');
    }
};
