<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wardrobe_items', function (Blueprint $table) {
            $table->decimal('price', 10, 2)->nullable()->after('meta');
            $table->integer('wear_count')->default(0)->after('price');
            $table->timestamp('last_worn_at')->nullable()->after('wear_count');
            $table->json('season_tags')->nullable()->after('last_worn_at');
            $table->date('purchase_date')->nullable()->after('season_tags');
        });
    }

    public function down(): void
    {
        Schema::table('wardrobe_items', function (Blueprint $table) {
            $table->dropColumn(['price', 'wear_count', 'last_worn_at', 'season_tags', 'purchase_date']);
        });
    }
};
