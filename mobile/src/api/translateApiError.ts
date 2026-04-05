/**
 * DressGenius — API Error Translator
 *
 * Maps common Laravel backend error messages to i18n keys.
 * Falls back to the raw message if no mapping found.
 */

import i18n from '../i18n';

const ERROR_MAP: Record<string, string> = {
  // Auth / Validation
  'The email has already been taken.': 'apiErrors.emailTaken',
  'The email has already been taken': 'apiErrors.emailTaken',
  'Invalid credentials.': 'apiErrors.invalidCredentials',
  'Invalid credentials': 'apiErrors.invalidCredentials',
  'The password field must be at least 8 characters.': 'apiErrors.passwordTooShort',
  'The password field confirmation does not match.': 'apiErrors.passwordMismatch',
  'The email field must be a valid email address.': 'apiErrors.emailInvalid',
  'The name field is required.': 'apiErrors.nameRequired',
  'The email field is required.': 'apiErrors.emailRequired',
  'The password field is required.': 'apiErrors.passwordRequired',

  // Rate limiting
  'Too Many Attempts.': 'apiErrors.tooManyAttempts',
  'Too many attempts, please slow down.': 'apiErrors.tooManyAttempts',

  // Auth state
  'Unauthenticated.': 'apiErrors.unauthenticated',
  'Token expired.': 'apiErrors.tokenExpired',

  // Server
  'Server Error': 'apiErrors.serverError',
  'Service Unavailable': 'apiErrors.serviceUnavailable',
};

/**
 * Translate a backend error message to the user's language.
 * Checks both exact match and partial match (contains).
 */
export function translateApiError(message: string | undefined | null, fallbackKey?: string): string {
  if (!message) return i18n.t(fallbackKey || 'apiErrors.generic');

  const trimmed = message.trim();

  // Exact match
  const exactKey = ERROR_MAP[trimmed];
  if (exactKey) return i18n.t(exactKey);

  // Partial match (for validation errors with field names)
  for (const [pattern, key] of Object.entries(ERROR_MAP)) {
    if (trimmed.toLowerCase().includes(pattern.toLowerCase())) {
      return i18n.t(key);
    }
  }

  // Check if it's a Laravel validation error with 'errors' object
  // These come as { message: "...", errors: { email: ["..."], ... } }
  // In that case the message is generic, but individual field errors are in errors

  // Fallback
  return i18n.t(fallbackKey || 'apiErrors.generic');
}

/**
 * Extract the first error message from a Laravel validation response.
 * Laravel returns: { message: "...", errors: { field: ["msg1", "msg2"] } }
 */
export function extractApiError(err: any, fallbackKey?: string): string {
  const data = err?.response?.data;
  if (!data) return i18n.t(fallbackKey || 'apiErrors.generic');

  // Check for validation errors object
  if (data.errors && typeof data.errors === 'object') {
    const firstField = Object.keys(data.errors)[0];
    if (firstField && Array.isArray(data.errors[firstField])) {
      return translateApiError(data.errors[firstField][0], fallbackKey);
    }
  }

  // Check message field
  if (data.message) {
    return translateApiError(data.message, fallbackKey);
  }

  // Check error field
  if (data.error) {
    return translateApiError(data.error, fallbackKey);
  }

  return i18n.t(fallbackKey || 'apiErrors.generic');
}
