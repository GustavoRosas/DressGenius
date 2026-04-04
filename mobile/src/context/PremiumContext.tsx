/**
 * DressGenius — Premium / Subscription Context
 *
 * Beta phase: activates premium via PATCH /user/plan.
 * Persists in SecureStore + backend.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { api } from '../api/client';

const PREMIUM_KEY = 'dressgenius_is_premium';
const ACTIVATED_AT_KEY = 'dressgenius_premium_activated_at';

export interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  activatedAt: string | null;
  showBetaSheet: boolean;
  setShowBetaSheet: (v: boolean) => void;
  checkEntitlement: () => Promise<void>;
  activateBetaPremium: () => Promise<void>;
  downgradeToFree: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [showBetaSheet, setShowBetaSheet] = useState(false);

  const checkEntitlement = useCallback(async () => {
    try {
      // Try syncing from backend first
      const { data } = await api.get<{ user: any }>('/me');
      const plan = data?.user?.plan ?? 'free';
      const backendPremium = plan === 'premium';
      const dateStr = data?.user?.premium_activated_at ?? null;

      await SecureStore.setItemAsync(PREMIUM_KEY, backendPremium ? 'true' : 'false');
      if (dateStr) {
        await SecureStore.setItemAsync(ACTIVATED_AT_KEY, dateStr);
      } else {
        await SecureStore.deleteItemAsync(ACTIVATED_AT_KEY);
      }
      setIsPremium(backendPremium);
      setActivatedAt(dateStr);
    } catch {
      // Fallback to local SecureStore if offline
      try {
        const stored = await SecureStore.getItemAsync(PREMIUM_KEY);
        const storedDate = await SecureStore.getItemAsync(ACTIVATED_AT_KEY);
        setIsPremium(stored === 'true');
        setActivatedAt(storedDate);
      } catch {
        setIsPremium(false);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await checkEntitlement();
      if (mounted) setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [checkEntitlement]);

  const activateBetaPremium = useCallback(async () => {
    const { data } = await api.patch<{ plan: string; premium_activated_at: string }>('/user/plan', {
      plan: 'premium',
    });
    await SecureStore.setItemAsync(PREMIUM_KEY, 'true');
    const dateStr = data.premium_activated_at || new Date().toISOString();
    await SecureStore.setItemAsync(ACTIVATED_AT_KEY, dateStr);
    setIsPremium(true);
    setActivatedAt(dateStr);
  }, []);

  const downgradeToFree = useCallback(async () => {
    await api.patch('/user/plan', { plan: 'free' });
    await SecureStore.setItemAsync(PREMIUM_KEY, 'false');
    await SecureStore.deleteItemAsync(ACTIVATED_AT_KEY);
    setIsPremium(false);
    setActivatedAt(null);
  }, []);

  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium,
      isLoading,
      activatedAt,
      showBetaSheet,
      setShowBetaSheet,
      checkEntitlement,
      activateBetaPremium,
      downgradeToFree,
    }),
    [isPremium, isLoading, activatedAt, showBetaSheet, checkEntitlement, activateBetaPremium, downgradeToFree],
  );

  return (
    <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>
  );
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return ctx;
}
