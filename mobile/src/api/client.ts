import axios, { type AxiosError } from 'axios';
import { apiUrl } from '../config/env';
import { getStoredAccessToken } from './secureStorage';
import { ErrorLogger } from '../services/ErrorLogger';

export const api = axios.create({
  baseURL: apiUrl || undefined,
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── Request interceptor ─────────────────────────────────────────────────────

api.interceptors.request.use(
  async (config) => {
    const token = await getStoredAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ── Response interceptor — auto-log every API error ─────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const url = error.config?.url ?? 'unknown';

    ErrorLogger.logError('api', `${error.config?.method?.toUpperCase()} ${url}`, error, status);

    return Promise.reject(error);
  },
);

// ── Error message mapper ────────────────────────────────────────────────────

/**
 * Maps an Axios error (or generic error) to an i18n translation key
 * that the caller can pass to `t()`.
 */
export function getErrorKey(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return 'errors.generic';
  }

  const axiosErr = error as AxiosError<{ message?: string }>;

  // Network / no response
  if (!axiosErr.response) {
    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) {
      return 'errors.timeout';
    }
    return 'errors.noConnection';
  }

  const status = axiosErr.response.status;
  const serverMsg = (axiosErr.response.data as any)?.message ?? '';

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
      break;
  }

  // Backend may signal limit reached in 403/422 body
  if (
    status === 403 ||
    status === 422 ||
    (typeof serverMsg === 'string' && /limit|quota|exceeded/i.test(serverMsg))
  ) {
    if (/limit|exceeded|quota/i.test(serverMsg)) {
      return 'errors.limitReached';
    }
  }

  return 'errors.generic';
}
