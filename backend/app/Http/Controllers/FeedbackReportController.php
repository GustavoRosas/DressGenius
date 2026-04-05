<?php

namespace App\Http\Controllers;

use App\Helpers\StorageHelper;
use App\Models\FeedbackReport;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FeedbackReportController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', 'string', 'in:bug,suggestion,question'],
            'description' => ['required', 'string', 'max:5000'],
            'severity' => ['nullable', 'string', 'in:critical,high,medium,low'],
            'screenshot' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'app_version' => ['nullable', 'string', 'max:50'],
            'device_model' => ['nullable', 'string', 'max:100'],
            'os_name' => ['nullable', 'string', 'max:50'],
            'os_version' => ['nullable', 'string', 'max:50'],
            'current_screen' => ['nullable', 'string', 'max:150'],
            'context' => ['nullable', 'string'], // JSON string
        ]);

        $user = $request->user();

        // Upload screenshot
        $screenshotPath = null;
        if ($request->hasFile('screenshot')) {
            $screenshotPath = StorageHelper::disk()->putFile(
                'feedback-screenshots/' . $user->id,
                $request->file('screenshot')
            );
        }

        // Check for duplicate (same screen + similar description in last 7 days)
        $duplicate = null;
        if ($validated['type'] === 'bug') {
            $duplicate = FeedbackReport::query()
                ->where('type', 'bug')
                ->where('status', '!=', 'closed')
                ->where('created_at', '>=', now()->subDays(7))
                ->when($validated['current_screen'] ?? null, function ($q, $screen) {
                    $q->where('current_screen', $screen);
                })
                ->orderByDesc('created_at')
                ->first();
        }

        // Parse context JSON
        $context = null;
        if (!empty($validated['context'])) {
            $context = json_decode($validated['context'], true);
        }

        $report = FeedbackReport::create([
            'user_id' => $user->id,
            'type' => $validated['type'],
            'description' => $validated['description'],
            'severity' => $validated['severity'] ?? null,
            'screenshot_path' => $screenshotPath,
            'app_version' => $validated['app_version'] ?? null,
            'device_model' => $validated['device_model'] ?? null,
            'os_name' => $validated['os_name'] ?? null,
            'os_version' => $validated['os_version'] ?? null,
            'current_screen' => $validated['current_screen'] ?? null,
            'context' => $context,
            'status' => $duplicate ? 'duplicate' : 'new',
            'duplicate_of' => $duplicate?->id,
        ]);

        $typeEmoji = match ($validated['type']) {
            'bug' => '🐛',
            'suggestion' => '💡',
            'question' => '❓',
            default => '📝',
        };

        return response()->json([
            'id' => $report->id,
            'message' => $duplicate
                ? 'Already aware of this issue! We\'ll notify you when resolved 👀'
                : 'Report sent! Thank you for your feedback 🙏',
            'duplicate_found' => (bool) $duplicate,
        ], 201);
    }

    public function index(Request $request)
    {
        $reports = FeedbackReport::query()
            ->with('user:id,name,email')
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($reports);
    }
}
