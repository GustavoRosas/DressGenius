/**
 * DressGenius — Premium Upsell Banner (#55)
 *
 * Gradient banner shown to free users on AnalyzeScreen (initial state).
 * Rules:
 *  - Only for free users (!isPremium)
 *  - Max 1x/week (tracked via SecureStore)
 *  - Dismissable (persists dismissed_at)
 *  - Never shown after upgrade
 *  - Max height 56px
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';

import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { MONTHLY_PRICE, MONTHLY_PRICE_BRL } from '../config/plans';

const BANNER_DISMISSED_KEY = 'dressgenius_banner_dismissed_at';
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function PremiumBanner() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { isPremium } = usePremium();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isPremium) {
      setVisible(false);
      return;
    }

    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(BANNER_DISMISSED_KEY);
        if (raw) {
          const dismissedAt = parseInt(raw, 10);
          if (Date.now() - dismissedAt < ONE_WEEK_MS) {
            setVisible(false);
            return;
          }
        }
        setVisible(true);
      } catch {
        setVisible(true);
      }
    })();
  }, [isPremium]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    try {
      await SecureStore.setItemAsync(BANNER_DISMISSED_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  }, []);

  if (!visible) return null;

  const price = i18n.language.startsWith('pt') ? MONTHLY_PRICE_BRL : `$${MONTHLY_PRICE}`;

  const gradientColors: [string, string] = isDark
    ? ['#5B21B6', '#831843']
    : ['#7C3AED', '#E11D48'];

  return (
    <Pressable onPress={() => navigation.navigate('Paywall')} accessibilityRole="button">
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.container}
    >
      <Text style={styles.title} numberOfLines={1}>
        {t('analyze.banner.title')}
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.ctaButton}
          onPress={() => {
            navigation.navigate('Paywall');
          }}
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{t('analyze.banner.cta', { price })}</Text>
        </Pressable>

        <Pressable
          style={styles.dismissButton}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={t('analyze.banner.dismiss')}
          hitSlop={8}
        >
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      </View>
    </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
    flex: 1,
    marginRight: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  ctaButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  ctaText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dismissButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
});
