/**
 * Environment config (.env.development / .env.production).
 * Always use literal process.env.EXPO_PUBLIC_* names (Metro/Expo requirement).
 * Do not put secrets in EXPO_PUBLIC_* — they are embedded in the app bundle.
 */
export const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

export const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? '';

export const isProduction = appEnv === 'production';
