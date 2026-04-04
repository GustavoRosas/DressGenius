/**
 * DressGenius — My Plan Screen
 *
 * Shows current plan, benefits, and upgrade/downgrade options.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { BetaPremiumSheet } from '../components/BetaPremiumSheet';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

const GOLD = '#C9A84C';

const PREMIUM_BENEFITS = [
  'unlimitedAnalyses',
  'unlimitedChat',
  'unlimitedCloset',
  'allInsights',
] as const;

const FREE_BENEFITS = [
  'fiveAnalyses',
  'fiveChats',
  'fiftyPieces',
] as const;

export function MyPlanScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { isPremium, activatedAt, activateBetaPremium, downgradeToFree, setShowBetaSheet } = usePremium();
  const { showToast } = useToast();
  const [downgradeModal, setDowngradeModal] = useState(false);
  const [betaSheet, setBetaSheet] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const priceLabel = i18n.language?.startsWith('pt') ? 'R$24,90/mês' : '$4.99/mo';

  const formattedDate = activatedAt
    ? new Date(activatedAt).toLocaleDateString(i18n.language?.startsWith('pt') ? 'pt-BR' : 'en', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '';

  const handleDowngrade = useCallback(async () => {
    setDowngradeModal(false);
    try {
      await downgradeToFree();
      showToast(t('myPlan.downgraded'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    }
  }, [downgradeToFree, showToast, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {isPremium ? (
          <>
            {/* Premium Header */}
            <View style={styles.premiumHeader}>
              <Text style={styles.crownEmoji}>👑</Text>
              <Text style={styles.planLabel}>{t('myPlan.premiumBeta')}</Text>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                {t('myPlan.activeSince', { date: formattedDate })}
              </Text>
              <Text style={styles.infoText}>{t('myPlan.nextCharge')}</Text>
            </View>

            {/* Benefits */}
            <Text style={styles.sectionTitle}>{t('myPlan.benefits')}</Text>
            <View style={styles.benefitsCard}>
              {PREMIUM_BENEFITS.map((key) => (
                <View key={key} style={styles.benefitRow}>
                  <Text style={styles.checkGold}>✓</Text>
                  <Text style={styles.benefitText}>{t(`myPlan.benefit.${key}`)}</Text>
                </View>
              ))}
            </View>

            {/* Downgrade */}
            <Pressable style={styles.downgradeButton} onPress={() => setDowngradeModal(true)}>
              <Text style={styles.downgradeText}>{t('myPlan.downgrade')}</Text>
            </Pressable>

            <Text style={styles.afterBetaNote}>
              ℹ️ {t('myPlan.afterBeta', { price: priceLabel })}
            </Text>
          </>
        ) : (
          <>
            {/* Free Header */}
            <View style={styles.freeHeader}>
              <Text style={styles.freeEmoji}>📋</Text>
              <Text style={styles.freePlanLabel}>{t('myPlan.freePlan')}</Text>
            </View>

            <Text style={styles.sectionTitle}>{t('myPlan.freeIncludes')}</Text>
            <View style={styles.benefitsCard}>
              {FREE_BENEFITS.map((key) => (
                <View key={key} style={styles.benefitRow}>
                  <Text style={styles.checkNeutral}>✓</Text>
                  <Text style={styles.benefitText}>{t(`myPlan.benefit.${key}`)}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>{t('myPlan.wantMore')}</Text>
            <Pressable style={styles.upgradeButton} onPress={() => setBetaSheet(true)}>
              <Text style={styles.upgradeButtonText}>🚀 {t('premium.beta.activate')}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      <ConfirmModal
        visible={downgradeModal}
        emoji="⚠️"
        title={t('myPlan.downgrade')}
        message={t('myPlan.downgradeConfirm')}
        confirmLabel={t('myPlan.downgrade')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={handleDowngrade}
        onCancel={() => setDowngradeModal(false)}
      />

      <BetaPremiumSheet
        visible={betaSheet}
        onClose={() => setBetaSheet(false)}
        onActivate={activateBetaPremium}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
    premiumHeader: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      paddingTop: spacing.lg,
    },
    crownEmoji: { fontSize: 56, marginBottom: spacing.md },
    planLabel: {
      ...typography.h2,
      color: GOLD,
      fontWeight: '700',
    },
    freeHeader: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      paddingTop: spacing.lg,
    },
    freeEmoji: { fontSize: 56, marginBottom: spacing.md },
    freePlanLabel: {
      ...typography.h2,
      color: colors.text,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    infoText: {
      ...typography.body2,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    sectionTitle: {
      ...typography.overline,
      color: colors.textTertiary,
      marginBottom: spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    benefitsCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    checkGold: { fontSize: 18, color: GOLD, fontWeight: '700', marginRight: spacing.md },
    checkNeutral: { fontSize: 18, color: colors.success, fontWeight: '700', marginRight: spacing.md },
    benefitText: { ...typography.body1, color: colors.text, flex: 1 },
    downgradeButton: {
      borderWidth: 1,
      borderColor: colors.error,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    downgradeText: {
      ...typography.subtitle2,
      color: colors.error,
    },
    afterBetaNote: {
      ...typography.caption,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 18,
    },
    upgradeButton: {
      backgroundColor: GOLD,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      ...shadows.md,
    },
    upgradeButtonText: {
      ...typography.subtitle1,
      color: '#FFFFFF',
      fontWeight: '700',
    },
  });
