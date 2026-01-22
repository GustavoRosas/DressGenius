<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOutfitChatFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ratings' => ['required', 'array'],
            'ratings.helpfulness' => ['required', 'integer', 'min:1', 'max:5'],
            'ratings.clarity' => ['required', 'integer', 'min:1', 'max:5'],
            'ratings.relevance' => ['required', 'integer', 'min:1', 'max:5'],
            'ratings.tone' => ['required', 'integer', 'min:1', 'max:5'],
            'comment' => ['nullable', 'string', 'max:500'],
        ];
    }
}
