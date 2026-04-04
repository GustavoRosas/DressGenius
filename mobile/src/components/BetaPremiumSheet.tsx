/**
 * DressGenius — BetaPremiumSheet
 *
 * Bottom sheet for beta early access premium activation.
 * No payment — just PATCH /user/plan to premium.
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

interface BetaPremiumSheetProps {
  visible: boolean;
  onClose: () => void;
  onActivate: () => Promise<void>;
}

const GOLD = '#C9A84C';

const BENEFITS_KEYS = [
  'unlimitedAnalyses',
  'unlimitedChat',
  'closetIntelligence',
  'fullAnalytics',
] as const;

export function BetaPremiumSheet({ visible, onClose, onActivate }: BetaPremiumSheetProps) {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const styles = createStyles(colors);

  const priceLabel = i18n.language?.startsWith('pt') ? 'R$24,90/mês' : '$4.99/mo';

  const handleActivate = useCallback(async () => {
    setLoading(true);
    try {
      await onActivate();
      showToast(t('premium.beta.activated'), 'success');
      onClose();
    } catch {
      showToast(t('premium.beta.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [onActivate, onClose, showToast, t]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.emoji}>🚀</Text>
        <Text style={styles.title}>{t('premium.beta.title')}</Text>
        <Text style={styles.subtitle}>{t('premium.beta.subtitle')}</Text>

        <View style={styles.benefitsList}>
          {BENEFITS_KEYS.map((key) => (
            <View key={key} style={styles.benefitRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.benefitText}>{t(`premium.beta.benefit.${key}`)}</Text>
            </View>
          ))}
        </View>

        <Pressable
          style={[styles.activateButton, loading && styles.buttonDisabled]}
          onPress={handleActivate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.activateText}>{t('premium.beta.activate')}</Text>
          )}
        </Pressable>

        <Text style={styles.disclaimer}>
          {t('premium.beta.afterBeta', { price: priceLabel })}
        </Text>
      </View>
    </Modal>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.md,
      paddingBottom: spacing.xxxl,
      ...shadows.lg,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: spacing.xl,
    },
    emoji: {
      fontSize: 48,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    title: {
      ...typography.h2,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body2,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 22,
    },
    benefitsList: {
      marginBottom: spacing.xl,
    },
    benefitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    checkmark: {
      fontSize: 18,
      color: GOLD,
      fontWeight: '700',
      marginRight: spacing.md,
    },
    benefitText: {
      ...typography.body1,
      color: colors.text,
    },
    activateButton: {
      backgroundColor: GOLD,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.lg,
      ...shadows.md,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    activateText: {
      ...typography.subtitle1,
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 17,
    },
    disclaimer: {
      ...typography.caption,
      color: colors.textTertiary,
      textAlign: 'center',
      lineHeight: 18,
    },
  });
