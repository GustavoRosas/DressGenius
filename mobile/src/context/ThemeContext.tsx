/**
 * DressGenius — Theme Context
 *
 * Provides dark/light mode with system detection and user persistence.
 * Usage: const { colors, isDark, toggleTheme } = useTheme();
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import { lightColors, darkColors, type ColorScheme } from '../theme/colors';

const THEME_KEY = 'dressgenius_theme';

type ThemePreference = 'light' | 'dark' | 'system';

export interface ThemeContextValue {
  isDark: boolean;
  colors: ColorScheme;
  preference: ThemePreference;
  toggleTheme: () => void;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(THEME_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      } catch {
        // ignore — default to system
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    try {
      await SecureStore.setItemAsync(THEME_KEY, pref);
    } catch {
      // ignore storage errors
    }
  }, []);

  const isDark = useMemo(() => {
    if (preference === 'system') {
      return systemScheme === 'dark';
    }
    return preference === 'dark';
  }, [preference, systemScheme]);

  const colors = useMemo(() => (isDark ? darkColors : lightColors), [isDark]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? 'light' : 'dark';
    setPreference(next);
  }, [isDark, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ isDark, colors, preference, toggleTheme, setPreference }),
    [isDark, colors, preference, toggleTheme, setPreference],
  );

  // Don't render until preference is loaded to avoid flash
  if (!ready) return null;

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
