/**
 * DressGenius — Notification Context (#28)
 *
 * Provider + hook para estado de push notifications.
 * Registra token automaticamente após login.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Notification } from 'expo-notifications';

import { useAuth } from './AuthContext';
import {
  registerForPushNotifications,
  sendTokenToBackend,
  setupNotificationHandlers,
} from '../services/NotificationService';

export interface NotificationContextValue {
  pushToken: string | null;
  hasPermission: boolean;
  notifications: Notification[];
  requestPermission: () => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const registeredRef = useRef(false);

  /** Solicita permissão e retorna token */
  const requestPermission = useCallback(async (): Promise<string | null> => {
    const token = await registerForPushNotifications();
    if (token) {
      setPushToken(token);
      setHasPermission(true);
      try {
        await sendTokenToBackend(token);
      } catch (err) {
        console.warn('[Notifications] Failed to send token to backend:', err);
      }
    }
    return token;
  }, []);

  // Auto-register após login
  useEffect(() => {
    if (!isAuthenticated || registeredRef.current) return;

    let cancelled = false;
    (async () => {
      const token = await registerForPushNotifications();
      if (cancelled || !token) return;

      setPushToken(token);
      setHasPermission(true);
      registeredRef.current = true;

      try {
        await sendTokenToBackend(token);
      } catch (err) {
        console.warn('[Notifications] Failed to send token to backend:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Reset ao deslogar
  useEffect(() => {
    if (!isAuthenticated) {
      registeredRef.current = false;
    }
  }, [isAuthenticated]);

  // Listeners
  useEffect(() => {
    const cleanup = setupNotificationHandlers(
      (notification) => {
        setNotifications((prev) => [notification, ...prev]);
      },
      (_response) => {
        // Pode ser expandido para deep-linking futuramente
      },
    );
    return cleanup;
  }, []);

  const value = useMemo<NotificationContextValue>(
    () => ({
      pushToken,
      hasPermission,
      notifications,
      requestPermission,
    }),
    [pushToken, hasPermission, notifications, requestPermission],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
