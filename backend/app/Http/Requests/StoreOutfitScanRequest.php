<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOutfitScanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png', 'max:5120'],
            'intake' => ['nullable', 'array'],
            'intake.occasion' => ['nullable', 'string', 'max:120'],
            'intake.weather' => ['nullable', 'string', 'max:120'],
            'intake.dress_code' => ['nullable', 'string', 'max:120'],
            'intake.budget' => ['nullable', 'string', 'max:120'],
            'intake.desired_vibe' => ['nullable', 'string', 'max:120'],
        ];
    }
}
