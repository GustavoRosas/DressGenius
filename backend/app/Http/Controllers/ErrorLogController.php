<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class ErrorLogController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'logs' => 'required|array|max:50',
            'logs.*.screen' => 'required|string|max:100',
            'logs.*.action' => 'required|string|max:100',
            'logs.*.error' => 'required|string|max:2000',
            'logs.*.statusCode' => 'nullable|integer',
            'logs.*.timestamp' => 'nullable|string|max:50',
        ]);

        $userId = $request->user()->id;

        // Log to Laravel log channel (always works, even without migration)
        foreach ($request->input('logs', []) as $log) {
            Log::channel('stack')->warning('ClientError', [
                'user_id' => $userId,
                'screen' => $log['screen'] ?? 'unknown',
                'action' => $log['action'] ?? 'unknown',
                'error' => $log['error'] ?? '',
                'status_code' => $log['statusCode'] ?? null,
                'client_timestamp' => $log['timestamp'] ?? null,
            ]);
        }

        // Also persist to DB if table exists
        if (Schema::hasTable('error_logs')) {
            $rows = collect($request->input('logs'))->map(fn ($log) => [
                'user_id' => $userId,
                'screen' => substr($log['screen'] ?? 'unknown', 0, 100),
                'action' => substr($log['action'] ?? 'unknown', 0, 100),
                'error_message' => substr($log['error'] ?? '', 0, 2000),
                'status_code' => $log['statusCode'] ?? null,
                'meta' => json_encode(['client_timestamp' => $log['timestamp'] ?? null]),
                'created_at' => now(),
                'updated_at' => now(),
            ])->toArray();

            DB::table('error_logs')->insert($rows);
        }

        return response()->json(['received' => count($request->input('logs'))]);
    }
}
