<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change score column from smallint to decimal(5,1) to support values like 7.5
        DB::statement('ALTER TABLE outfit_scans ALTER COLUMN score TYPE DECIMAL(5,1) USING score::decimal(5,1)');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE outfit_scans ALTER COLUMN score TYPE SMALLINT USING ROUND(score)::smallint');
    }
};
