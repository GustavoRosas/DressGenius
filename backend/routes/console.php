<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('gemini:list-models {--v= : API version to use (v1 or v1beta)}', function () {
    $apiKey = config('services.gemini.api_key');
    if (!$apiKey) {
        $this->error('Missing GEMINI_API_KEY.');
        return 1;
    }

    $versions = [];
    $v = $this->option('v');
    if (is_string($v) && trim($v) !== '') {
        $versions[] = trim($v);
    } else {
        $versions = ['v1', 'v1beta'];
    }

    foreach ($versions as $apiVersion) {
        $this->info("\n== Gemini ListModels ({$apiVersion}) ==");
        $url = "https://generativelanguage.googleapis.com/{$apiVersion}/models?key={$apiKey}";

        try {
            $res = Http::connectTimeout(8)->timeout(30)->get($url);
        } catch (\Throwable $e) {
            $this->error("Request failed: {$e->getMessage()}");
            continue;
        }

        $this->line('Status: '.$res->status());
        if (!$res->ok()) {
            $this->line($res->body());
            continue;
        }

        $json = $res->json();
        $models = data_get($json, 'models', []);
        if (!is_array($models) || count($models) === 0) {
            $this->warn('No models returned.');
            continue;
        }

        foreach ($models as $m) {
            $name = (string) data_get($m, 'name', '');
            $methods = data_get($m, 'supportedGenerationMethods', []);
            if (is_array($methods)) {
                $methods = implode(', ', $methods);
            } else {
                $methods = (string) $methods;
            }
            $this->line(trim($name).($methods ? "  [{$methods}]" : ''));
        }
    }

    return 0;
})->purpose('List Gemini models available for the configured API key');
