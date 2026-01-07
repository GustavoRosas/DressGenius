<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OutfitScan extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'image_path',
        'vision',
        'analysis',
        'score',
    ];

    protected $casts = [
        'vision' => 'array',
        'analysis' => 'array',
        'score' => 'integer',
    ];
}
