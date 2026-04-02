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
            'image' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'intake' => ['nullable', 'array'],
            'intake.occasion' => ['nullable', 'string', 'max:100'],
            'intake.weather' => ['nullable'],  // string (legacy) or object
            'intake.weather.source' => ['nullable', 'string', 'max:60'],
            'intake.weather.temperature_c' => ['nullable', 'numeric'],
            'intake.weather.condition' => ['nullable', 'string', 'max:120'],
            'intake.dress_code' => ['nullable', 'string', 'max:120'],
            'intake.budget' => ['nullable', 'string', 'max:120'],
            'intake.desired_vibe' => ['nullable', 'string', 'max:120'],
            'intake.comfort_level' => ['nullable', 'string', 'in:comfort_first,balanced,style_first'],
            'intake.extra_context' => ['nullable', 'string', 'max:500'],
        ];
    }
}
