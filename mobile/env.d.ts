/** Types for Expo-injected env vars (EXPO_PUBLIC_* prefix). */
declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_APP_ENV?: string;
    EXPO_PUBLIC_API_URL?: string;
  }
}
