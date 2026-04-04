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

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function process()
    {
        return $this->hasOne(OutfitAnalysisProcess::class, 'scan_id');
    }

    public function detectedItems()
    {
        return $this->hasMany(OutfitDetectedItem::class, 'source_id')
            ->where('source_type', 'scan');
    }
}
