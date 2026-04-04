<?php
require __DIR__.'/vendor/autoload.php';
$app = require __DIR__.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

// Add plan column if missing
if (!Schema::hasColumn('users', 'plan')) {
    Schema::table('users', function ($table) {
        $table->string('plan', 20)->default('free')->after('email');
    });
    echo "Added plan column\n";
}

DB::table('users')->where('id', 4)->update(['plan' => 'premium']);
echo "User 4 set to premium\n";

// Also delete scans to reset count for testing
$count = DB::table('outfit_scans')->where('user_id', 4)->count();
echo "User has {$count} scans this month\n";
