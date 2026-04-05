<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('feedback_reports', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));

            // User
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Content
            $table->string('type', 20); // bug, suggestion, question
            $table->text('description');
            $table->string('severity', 20)->nullable(); // critical, high, medium, low
            $table->string('screenshot_path', 500)->nullable();

            // Auto context
            $table->string('app_version', 50)->nullable();
            $table->string('device_model', 100)->nullable();
            $table->string('os_name', 50)->nullable();
            $table->string('os_version', 50)->nullable();
            $table->string('current_screen', 150)->nullable();
            $table->jsonb('context')->nullable();

            // Triage
            $table->string('status', 30)->default('new'); // new, triaged, in_progress, resolved, closed, duplicate
            $table->string('priority', 10)->nullable(); // p0, p1, p2, p3
            $table->text('admin_notes')->nullable();
            $table->uuid('duplicate_of')->nullable();

            $table->timestamps();
            $table->timestamp('triaged_at')->nullable();
            $table->timestamp('resolved_at')->nullable();

            // Indexes
            $table->index('status');
            $table->index('type');
            $table->index('user_id');
            $table->index('current_screen');
            $table->index(['created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('feedback_reports');
    }
};
