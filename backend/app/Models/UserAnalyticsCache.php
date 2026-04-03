<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserAnalyticsCache extends Model
{
    use HasFactory;

    protected $table = 'user_analytics_cache';

    protected $fillable = [
        'user_id',
        'period',
        'total_analyses',
        'avg_score',
        'dominant_style',
        'top_colors',
        'style_distribution',
        'closet_gaps',
        'occasion_distribution',
        'generated_at',
    ];

    protected $casts = [
        'avg_score' => 'decimal:2',
        'top_colors' => 'array',
        'style_distribution' => 'array',
        'closet_gaps' => 'array',
        'occasion_distribution' => 'array',
        'generated_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
