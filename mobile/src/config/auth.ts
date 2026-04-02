/**
 * DressGenius — Social Auth Configuration
 *
 * Placeholder client IDs for Google and Apple Sign-In.
 * Replace with real values from Google Cloud Console / Apple Developer.
 */

// TODO: Replace with real Google OAuth 2.0 client IDs from Google Cloud Console
// https://console.cloud.google.com/apis/credentials
export const GOOGLE_IOS_CLIENT_ID = '';
export const GOOGLE_ANDROID_CLIENT_ID = '';
export const GOOGLE_WEB_CLIENT_ID = '';

// TODO: Replace with real Apple Service ID (for web redirect)
// https://developer.apple.com/account/resources/identifiers
export const APPLE_SERVICE_ID = '';

/**
 * Whether Google Sign-In is configured (has at least a web client ID).
 */
export const isGoogleAuthConfigured =
  GOOGLE_WEB_CLIENT_ID.length > 0;

/**
 * Whether Apple Sign-In is configured (native on iOS, no extra config needed).
 * Apple Sign-In works out of the box on iOS with expo-apple-authentication.
 */
export const isAppleAuthConfigured = true;
