<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AIPreferencesController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user();

        return response()->json(
            $user->ai_preferences ?? (object) [],
        );
    }

    public function update(Request $request)
    {
        $user = $request->user();

        // Accept any JSON — mobile is source of truth for schema
        // Can contain: styles[], colors[], occasions[], bodyType, budget, etc.
        $prefs = $request->all();

        // Remove Laravel internal fields
        unset($prefs['_token'], $prefs['_method']);

        $user->ai_preferences = $prefs;
        $user->save();

        return response()->json($prefs);
    }
}
