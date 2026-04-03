/**
 * DressGenius — API Error Helper
 *
 * Maps HTTP errors to i18n-friendly error keys.
 */

import { AxiosError } from 'axios';

export type ErrorKey =
  | 'errors.timeout'
  | 'errors.quotaExceeded'
  | 'errors.serviceUnavailable'
  | 'errors.noConnection'
  | 'errors.imageTooLarge'
  | 'errors.sessionExpired'
  | 'errors.generic'
  | 'errors.limitReached'
  | 'errors.analysisFailed'
  | 'errors.imageCorrupted';

/**
 * Returns the i18n key for a given error.
 * Use with t(getErrorKey(error)) in components.
 */
export function getErrorKey(error: unknown): ErrorKey {
  if (!error) return 'errors.generic';

  // Network / timeout
  if (error instanceof AxiosError) {
    // No response = network error
    if (!error.response) {
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        return 'errors.timeout';
      }
      return 'errors.noConnection';
    }

    const status = error.response.status;
    const message = (error.response.data as any)?.message ?? '';

    switch (status) {
      case 401:
        return 'errors.sessionExpired';
      case 413:
        return 'errors.imageTooLarge';
      case 429:
        return 'errors.quotaExceeded';
      case 502:
      case 503:
        return 'errors.serviceUnavailable';
      case 504:
        return 'errors.timeout';
      default:
        // Check message content for specific hints
        if (message.includes('quota') || message.includes('rate limit')) {
          return 'errors.quotaExceeded';
        }
        if (message.includes('timeout') || message.includes('timed out')) {
          return 'errors.timeout';
        }
        if (status >= 500) {
          return 'errors.serviceUnavailable';
        }
        return 'errors.generic';
    }
  }

  // Generic Error
  if (error instanceof Error) {
    if (error.message.includes('Network') || error.message.includes('network')) {
      return 'errors.noConnection';
    }
  }

  return 'errors.generic';
}

/**
 * Extract HTTP status code from error (if available).
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof AxiosError) {
    return error.response?.status;
  }
  return undefined;
}
