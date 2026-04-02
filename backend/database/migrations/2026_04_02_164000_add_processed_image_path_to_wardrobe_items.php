<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('wardrobe_items', function (Blueprint $table) {
            $table->string('processed_image_path')->nullable()->after('cover_image_path');
        });
    }

    public function down(): void
    {
        Schema::table('wardrobe_items', function (Blueprint $table) {
            $table->dropColumn('processed_image_path');
        });
    }
};
