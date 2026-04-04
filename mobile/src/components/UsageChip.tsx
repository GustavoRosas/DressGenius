/**
 * DressGenius — Usage Counter Chip (#50)
 *
 * Shows "✨ N left" (amber) when free user has <=3 remaining.
 * Shows "🔒 Upgrade" (purple) when 0 remaining.
 * Hidden for premium users.
 */

import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import { palette } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import type { RootStackParamList } from '../navigation/types';
import type { UsageData } from '../hooks/useUsage';

interface UsageChipProps {
  usage: UsageData | null;
}

export function UsageChip({ usage }: UsageChipProps) {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (isPremium || !usage || usage.analyses_limit == null) return null;

  const remaining = Math.max(0, usage.analyses_limit - usage.analyses_used);

  // Only show when <= 3 remaining
  if (remaining > 3) return null;

  const isExhausted = remaining === 0;
  const bgColor = isExhausted ? palette.violet600 : palette.gold400;
  const textColor = isExhausted ? palette.neutral0 : palette.neutral900;
  const label = isExhausted
    ? `🔒 ${t('analyze.upgrade')}`
    : `✨ ${t('analyze.usageLeft', { count: remaining })}`;

  return (
    <Pressable
      style={[styles.chip, { backgroundColor: bgColor }]}
      onPress={() => navigation.navigate('Paywall')}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'center',
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
});
