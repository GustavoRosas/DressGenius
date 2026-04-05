<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedbackReport extends Model
{
    use HasUuids;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'user_id',
        'type',
        'description',
        'severity',
        'screenshot_path',
        'app_version',
        'device_model',
        'os_name',
        'os_version',
        'current_screen',
        'context',
        'status',
        'priority',
        'admin_notes',
        'duplicate_of',
        'triaged_at',
        'resolved_at',
    ];

    protected $casts = [
        'context' => 'array',
        'triaged_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function duplicate(): BelongsTo
    {
        return $this->belongsTo(self::class, 'duplicate_of');
    }
}
