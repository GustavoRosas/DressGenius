<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OutfitChatSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'image_path',
        'intake',
        'vision',
        'analysis',
        'score',
        'turns_used',
        'status',
    ];

    protected $casts = [
        'intake' => 'array',
        'vision' => 'array',
        'analysis' => 'array',
        'score' => 'integer',
        'turns_used' => 'integer',
    ];

    public function messages()
    {
        return $this->hasMany(OutfitChatMessage::class, 'session_id');
    }

    public function attachments()
    {
        return $this->hasMany(OutfitChatAttachment::class, 'session_id');
    }
}
