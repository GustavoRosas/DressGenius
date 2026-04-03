/**
 * DressGenius — Error Logger
 *
 * In-memory error log buffer with async backend flush.
 * Falls back to AsyncStorage when backend is unreachable.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const STORAGE_KEY = 'dressgenius_error_logs';
const MAX_LOGS = 50;
const FLUSH_DEBOUNCE_MS = 10_000; // batch every 10s

export interface ErrorLog {
  timestamp: string;
  screen: string;
  action: string;
  error: string;
  statusCode?: number;
  userId?: string;
}

class ErrorLoggerService {
  private buffer: ErrorLog[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Log an error. Saves to in-memory buffer and schedules a backend flush.
   */
  logError(screen: string, action: string, error: unknown, statusCode?: number): void {
    const entry: ErrorLog = {
      timestamp: new Date().toISOString(),
      screen,
      action,
      error: this.extractMessage(error),
      statusCode,
    };

    this.buffer.push(entry);

    // Trim oldest if over limit
    if (this.buffer.length > MAX_LOGS) {
      this.buffer = this.buffer.slice(-MAX_LOGS);
    }

    this.scheduleFlush();
  }

  /**
   * Return the most recent errors (up to 50).
   */
  getRecentErrors(): ErrorLog[] {
    return [...this.buffer];
  }

  /**
   * Flush buffered + persisted errors to the backend in one batch.
   */
  async sendErrorsToBackend(): Promise<void> {
    // Merge any previously persisted logs
    const persisted = await this.loadFromStorage();
    const allLogs = [...persisted, ...this.buffer];

    if (allLogs.length === 0) return;

    try {
      await api.post('/error-logs', { logs: allLogs });
      // Success — clear everything
      this.buffer = [];
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Backend unreachable — persist to local storage for later
      await this.saveToStorage(allLogs.slice(-MAX_LOGS));
      this.buffer = [];
    }
  }

  // ── Internals ───────────────────────────────────────────────────────

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.sendErrorsToBackend().catch(() => {});
    }, FLUSH_DEBOUNCE_MS);
  }

  private extractMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }

  private async loadFromStorage(): Promise<ErrorLog[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as ErrorLog[];
    } catch {
      return [];
    }
  }

  private async saveToStorage(logs: ErrorLog[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // Storage full or unavailable — silently drop
    }
  }
}

/** Singleton instance */
export const ErrorLogger = new ErrorLoggerService();
