/**
 * DressGenius — Paywall Screen
 *
 * Premium subscription upsell with benefit list, pricing toggle,
 * restore purchases, and continue-free dismiss.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';

import { Button } from '../components/Button';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import { palette } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import {
  MONTHLY_PRICE,
  YEARLY_PRICE,
  MONTHLY_PRICE_BRL,
  YEARLY_PRICE_BRL,
  YEARLY_SAVINGS_PERCENT,
  PREMIUM_BENEFITS,
  type PlanInterval,
} from '../config/plans';

export function PaywallScreen() {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { activateBetaPremium } = usePremium();
  const isBR = i18n.language.startsWith('pt');

  const [selectedPlan, setSelectedPlan] = useState<PlanInterval>('yearly');
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await activateBetaPremium();
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      await activateBetaPremium();
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleContinueFree = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[palette.violet800, palette.violet600, palette.violet500]}
        style={[styles.gradient, { paddingTop: insets.top + spacing.lg }]}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={styles.sparkle}>✨</Text>
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>

          {/* Benefits */}
          <View style={styles.benefitsCard}>
            {PREMIUM_BENEFITS.map((b) => (
              <View key={b.key} style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>{b.emoji}</Text>
                <Text style={styles.benefitText}>
                  {t(`paywall.benefits.${b.key}`)}
                </Text>
              </View>
            ))}
          </View>

          {/* Plan selector */}
          <View style={styles.planContainer}>
            {/* Yearly */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.planCard,
                selectedPlan === 'yearly' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('yearly')}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>
                  {t('paywall.bestValue')}
                </Text>
              </View>
              <Text
                style={[
                  styles.planLabel,
                  selectedPlan === 'yearly' && styles.planLabelSelected,
                ]}
              >
                {t('paywall.yearly')}
              </Text>
              <Text
                style={[
                  styles.planPrice,
                  selectedPlan === 'yearly' && styles.planPriceSelected,
                ]}
              >
                {isBR ? `${YEARLY_PRICE_BRL}/${t('paywall.yearAbbr')}` : `$${YEARLY_PRICE}/${t('paywall.yearAbbr')}`}
              </Text>
              <Text style={styles.savingsText}>
                {t('paywall.savings', { percent: YEARLY_SAVINGS_PERCENT })}
              </Text>
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPlan('monthly')}
            >
              <Text
                style={[
                  styles.planLabel,
                  selectedPlan === 'monthly' && styles.planLabelSelected,
                ]}
              >
                {t('paywall.monthly')}
              </Text>
              <Text
                style={[
                  styles.planPrice,
                  selectedPlan === 'monthly' && styles.planPriceSelected,
                ]}
              >
                {isBR ? `${MONTHLY_PRICE_BRL}/${t('paywall.monthAbbr')}` : `$${MONTHLY_PRICE}/${t('paywall.monthAbbr')}`}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Subscribe button */}
          <Button
            title={t('paywall.subscribe')}
            variant="primary"
            onPress={handlePurchase}
            loading={loading}
            style={styles.subscribeBtn}
            textStyle={styles.subscribeBtnText}
          />

          {/* Restore */}
          <TouchableOpacity onPress={handleRestore} disabled={loading}>
            <Text style={styles.restoreText}>{t('paywall.restore')}</Text>
          </TouchableOpacity>

          {/* Continue free */}
          <TouchableOpacity onPress={handleContinueFree} disabled={loading}>
            <Text style={styles.continueFreeText}>
              {t('paywall.continueFree')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  sparkle: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h1,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body1,
    color: palette.violet200,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  // Benefits card
  benefitsCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    marginBottom: spacing.xxl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  benefitEmoji: {
    fontSize: 22,
    width: 36,
  },
  benefitText: {
    ...typography.body1,
    color: '#FFFFFF',
    flex: 1,
  },
  // Plan cards
  planContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.xl,
  },
  planCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  planCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: palette.gold400,
    ...shadows.md,
  },
  bestValueBadge: {
    backgroundColor: palette.gold400,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    marginBottom: spacing.sm,
  },
  bestValueText: {
    ...typography.caption,
    color: palette.neutral900,
    fontWeight: '700',
  },
  planLabel: {
    ...typography.subtitle2,
    color: palette.violet200,
    marginBottom: spacing.xs,
  },
  planLabelSelected: {
    color: '#FFFFFF',
  },
  planPrice: {
    ...typography.h3,
    color: palette.violet200,
  },
  planPriceSelected: {
    color: '#FFFFFF',
  },
  savingsText: {
    ...typography.caption,
    color: palette.gold300,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  // Subscribe
  subscribeBtn: {
    width: '100%',
    backgroundColor: palette.gold400,
    marginBottom: spacing.lg,
  },
  subscribeBtnText: {
    color: palette.neutral900,
    fontWeight: '700',
  },
  // Links
  restoreText: {
    ...typography.body2,
    color: palette.violet200,
    textDecorationLine: 'underline',
    marginBottom: spacing.md,
  },
  continueFreeText: {
    ...typography.body2,
    color: palette.violet300,
    marginTop: spacing.xs,
  },
});
