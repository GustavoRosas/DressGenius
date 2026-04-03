<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_analytics_cache', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('period', 7); // format: '2026-04' (YYYY-MM) or 'all'
            $table->integer('total_analyses')->default(0);
            $table->decimal('avg_score', 4, 2)->nullable();
            $table->string('dominant_style', 50)->nullable();
            $table->json('top_colors')->nullable();
            $table->json('style_distribution')->nullable();
            $table->json('closet_gaps')->nullable();
            $table->json('occasion_distribution')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();
            $table->unique(['user_id', 'period']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_analytics_cache');
    }
};
