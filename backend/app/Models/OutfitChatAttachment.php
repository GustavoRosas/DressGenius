<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OutfitChatAttachment extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'message_id',
        'kind',
        'path',
        'mime',
        'size',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function session()
    {
        return $this->belongsTo(OutfitChatSession::class, 'session_id');
    }

    public function message()
    {
        return $this->belongsTo(OutfitChatMessage::class, 'message_id');
    }
}
