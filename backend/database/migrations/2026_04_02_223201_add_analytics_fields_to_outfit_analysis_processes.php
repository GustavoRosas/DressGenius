<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('outfit_analysis_processes', function (Blueprint $table) {
            $table->json('items_used')->nullable()->after('scan_id');
            $table->boolean('has_accessories')->nullable()->after('items_used');
            $table->string('season', 20)->nullable()->after('has_accessories');
        });
    }

    public function down(): void
    {
        Schema::table('outfit_analysis_processes', function (Blueprint $table) {
            $table->dropColumn(['items_used', 'has_accessories', 'season']);
        });
    }
};
