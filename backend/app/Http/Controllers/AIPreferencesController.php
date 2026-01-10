<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AIPreferencesController extends Controller
{
    private const KEYS = [
        'tone',
        'strictness',
        'detail',
        'creativity',
        'trendiness',
        'comfort',
        'weather',
        'budget',
    ];

    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json([
            'preferences' => $user->ai_preferences ?? null,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'preferences' => ['required', 'array'],
        ]);

        $prefs = $validated['preferences'];

        $clean = [];
        foreach (self::KEYS as $key) {
            if (!array_key_exists($key, $prefs)) {
                continue;
            }

            $val = $prefs[$key];
            if (!is_int($val) && !is_numeric($val)) {
                continue;
            }

            $num = (int) $val;
            if ($num < 0) {
                $num = 0;
            }
            if ($num > 100) {
                $num = 100;
            }

            $clean[$key] = $num;
        }

        $user = $request->user();
        $user->ai_preferences = $clean;
        $user->save();

        return response()->json([
            'preferences' => $user->ai_preferences,
        ]);
    }
}
