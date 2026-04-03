/**
 * DressGenius — Toast Context
 *
 * Provides a global showToast() function via useToast() hook.
 * Queue system: displays one toast at a time; queues overflow.
 * Renders the Toast component at the top of the tree (portal-like).
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { Toast, type ToastType, type ToastConfig } from '../components/Toast';

export interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<ToastConfig | null>(null);
  const queueRef = useRef<ToastConfig[]>([]);
  const showingRef = useRef(false);

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      showingRef.current = false;
      setCurrent(null);
      return;
    }
    const next = queueRef.current.shift()!;
    setCurrent(next);
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', duration: number = 3000) => {
      const config: ToastConfig = { message, type, duration };

      if (!showingRef.current) {
        showingRef.current = true;
        setCurrent(config);
      } else {
        queueRef.current.push(config);
      }
    },
    [],
  );

  const handleDismiss = useCallback(() => {
    // Small delay before showing next toast for smoother UX
    setTimeout(() => processNext(), 150);
  }, [processNext]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {current && (
        <Toast
          key={`${current.message}-${Date.now()}`}
          message={current.message}
          type={current.type}
          duration={current.duration}
          onDismiss={handleDismiss}
        />
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
