import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import i18n from '../i18n';
import {
  clearAuthSession,
  getStoredAccessToken,
  getStoredUser,
  persistAuthSession,
} from '../api/secureStorage';
import { setOnSessionExpired } from '../api/client';
import type { AuthUser } from '../types/auth';

export type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (accessToken: string, user?: AuthUser | null) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getStoredAccessToken(),
          getStoredUser(),
        ]);
        if (!mounted) return;
        setToken(storedToken);
        setUser(storedUser);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = useCallback(async (accessToken: string, profile?: AuthUser | null) => {
    await persistAuthSession(accessToken, profile ?? null);
    setToken(accessToken);
    setUser(profile ?? null);
  }, []);

  const signOut = useCallback(async () => {
    await clearAuthSession();
    setToken(null);
    setUser(null);
  }, []);

  // Wire up 401 auto-signout with nice alert
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    setOnSessionExpired(() => {
      Alert.alert(
        '🔒 ' + i18n.t('apiErrors.unauthenticated'),
        i18n.t('apiErrors.tokenExpired'),
        [{ text: 'OK', onPress: () => signOutRef.current() }],
      );
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: Boolean(token),
      signIn,
      signOut,
    }),
    [user, token, isLoading, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
