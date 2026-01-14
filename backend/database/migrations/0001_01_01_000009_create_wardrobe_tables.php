<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('outfit_detected_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('source_type');
            $table->unsignedBigInteger('source_id');
            $table->foreignId('process_id')->nullable()->constrained('outfit_analysis_processes')->nullOnDelete();
            $table->string('label');
            $table->string('category')->nullable();
            $table->json('colors')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'source_type', 'source_id']);
        });

        Schema::create('wardrobe_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('canonical_key');
            $table->string('label');
            $table->string('category')->nullable();
            $table->json('colors')->nullable();
            $table->string('cover_image_path')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'canonical_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wardrobe_items');
        Schema::dropIfExists('outfit_detected_items');
    }
};
