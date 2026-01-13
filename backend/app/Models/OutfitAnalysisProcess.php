<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OutfitAnalysisProcess extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'kind',
        'status',
        'image_path',
        'intake',
        'ai_preferences',
        'vision',
        'analysis',
        'context_feedback',
        'assistant_text',
        'chat_session_id',
        'scan_id',
        'error_status',
        'error_message',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'intake' => 'array',
        'ai_preferences' => 'array',
        'vision' => 'array',
        'analysis' => 'array',
        'context_feedback' => 'array',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function chatSession()
    {
        return $this->belongsTo(OutfitChatSession::class, 'chat_session_id');
    }

    public function scan()
    {
        return $this->belongsTo(OutfitScan::class, 'scan_id');
    }
}
