<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'removebg' => [
        'key' => env('REMOVEBG_API_KEY'),
    ],

    'ai' => [
        'vision_provider' => env('AI_VISION_PROVIDER', 'anthropic'),
        'text_provider' => env('AI_TEXT_PROVIDER', 'anthropic'),
    ],

    'anthropic' => [
        'api_key' => env('ANTHROPIC_API_KEY'),
        'vision_model' => env('ANTHROPIC_VISION_MODEL', 'claude-haiku-4-5'),
        'text_model' => env('ANTHROPIC_TEXT_MODEL', 'claude-haiku-4-5'),
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => env('GEMINI_MODEL', 'gemini-2.5-flash'),
        'debug' => (bool) env('GEMINI_DEBUG', false),
    ],

    'open_meteo' => [
        'base_url' => 'https://api.open-meteo.com/v1',
    ],

];
