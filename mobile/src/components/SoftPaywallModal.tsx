/**
 * DressGenius — Soft Paywall Modal (#51)
 *
 * Shown when free user tries to analyze but has no remaining analyses.
 * First dismissal: "Maybe later" + "Upgrade" buttons.
 * Subsequent: only "Upgrade" button.
 * Dismissal count tracked in SecureStore.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Button } from './Button';
import { useTheme } from '../context/ThemeContext';
import { palette } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

const DISMISSAL_KEY = 'dressgenius_paywall_dismissals';

interface SoftPaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

const BENEFITS_KEYS = [
  'unlimitedAnalyses',
  'colorTheory',
  'weatherAware',
  'styleAnalytics',
] as const;

const BENEFITS_EMOJI: Record<string, string> = {
  unlimitedAnalyses: '📸',
  colorTheory: '🎨',
  weatherAware: '🌤️',
  styleAnalytics: '📊',
};

export function SoftPaywallModal({ visible, onClose }: SoftPaywallModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [dismissCount, setDismissCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(DISMISSAL_KEY);
        setDismissCount(raw ? parseInt(raw, 10) || 0 : 0);
      } catch {
        setDismissCount(0);
      } finally {
        setLoaded(true);
      }
    })();
  }, [visible]);

  const handleUpgrade = useCallback(() => {
    onClose();
    navigation.navigate('Paywall');
  }, [onClose, navigation]);

  const handleMaybeLater = useCallback(async () => {
    const newCount = dismissCount + 1;
    setDismissCount(newCount);
    try {
      await SecureStore.setItemAsync(DISMISSAL_KEY, String(newCount));
    } catch {
      // ignore
    }
    onClose();
  }, [dismissCount, onClose]);

  if (!visible || !loaded) return null;

  const showMaybeLater = dismissCount === 0;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={[styles.title, { color: colors.text }]}>
            {t('analyze.paywall.title')}
          </Text>

          <View style={styles.benefitsList}>
            {BENEFITS_KEYS.map((key) => (
              <View key={key} style={styles.benefitRow}>
                <Text style={styles.benefitEmoji}>{BENEFITS_EMOJI[key]}</Text>
                <Text style={[styles.benefitText, { color: colors.text }]}>
                  {t(`analyze.paywall.benefits.${key}`)}
                </Text>
              </View>
            ))}
          </View>

          <Button
            title={t('analyze.upgrade')}
            variant="primary"
            onPress={handleUpgrade}
            style={styles.upgradeBtn}
          />

          {showMaybeLater && (
            <Pressable onPress={handleMaybeLater} style={styles.maybeLaterBtn}>
              <Text style={[styles.maybeLaterText, { color: colors.textSecondary }]}>
                {t('analyze.paywall.maybeLater')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  card: {
    width: '100%',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.lg,
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  benefitsList: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  benefitEmoji: {
    fontSize: 20,
    width: 32,
  },
  benefitText: {
    ...typography.body2,
    flex: 1,
  },
  upgradeBtn: {
    width: '100%',
    backgroundColor: palette.violet600,
    marginBottom: spacing.md,
  },
  maybeLaterBtn: {
    paddingVertical: spacing.sm,
  },
  maybeLaterText: {
    ...typography.body2,
  },
});
