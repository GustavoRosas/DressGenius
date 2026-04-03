<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WardrobeItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'canonical_key',
        'label',
        'category',
        'colors',
        'cover_image_path',
        'processed_image_path',
        'meta',
        'price',
        'wear_count',
        'last_worn_at',
        'season_tags',
        'purchase_date',
    ];

    protected $casts = [
        'colors' => 'array',
        'meta' => 'array',
        'price' => 'decimal:2',
        'wear_count' => 'integer',
        'last_worn_at' => 'datetime',
        'season_tags' => 'array',
        'purchase_date' => 'date',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
