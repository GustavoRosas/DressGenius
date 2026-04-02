/**
 * DressGenius — Premium / Subscription Context
 *
 * Mock implementation — no RevenueCat yet.
 * Persists premium state in SecureStore for dev/testing.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';

const PREMIUM_KEY = 'dressgenius_is_premium';

export interface PremiumContextValue {
  isPremium: boolean;
  isLoading: boolean;
  checkEntitlement: () => Promise<void>;
  purchaseMonthly: () => Promise<void>;
  purchaseYearly: () => Promise<void>;
  restorePurchases: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkEntitlement = useCallback(async () => {
    try {
      const stored = await SecureStore.getItemAsync(PREMIUM_KEY);
      setIsPremium(stored === 'true');
    } catch {
      setIsPremium(false);
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

  const purchaseMonthly = useCallback(async () => {
    Alert.alert('DressGenius', t('paywall.comingSoon'));
  }, [t]);

  const purchaseYearly = useCallback(async () => {
    Alert.alert('DressGenius', t('paywall.comingSoon'));
  }, [t]);

  const restorePurchases = useCallback(async () => {
    Alert.alert('DressGenius', t('paywall.comingSoon'));
  }, [t]);

  const value = useMemo<PremiumContextValue>(
    () => ({
      isPremium,
      isLoading,
      checkEntitlement,
      purchaseMonthly,
      purchaseYearly,
      restorePurchases,
    }),
    [isPremium, isLoading, checkEntitlement, purchaseMonthly, purchaseYearly, restorePurchases],
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
