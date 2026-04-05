/**
 * DressGenius — Notification Preferences Screen (#28)
 *
 * Toggles para preferências de notificação.
 * Persistidos localmente no SecureStore (backend endpoint futuro).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';

import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

const STORAGE_KEY = 'notification_prefs';

interface NotificationPrefs {
  dailySuggestion: boolean;
  analysisComplete: boolean;
  newFeatures: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dailySuggestion: true,
  analysisComplete: true,
  newFeatures: true,
};

export function NotificationPrefsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(STORAGE_KEY);
        if (raw) {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
        }
      } catch {
        // use defaults
      }
    })();
  }, []);

  const updatePref = useCallback(
    (key: keyof NotificationPrefs, value: boolean) => {
      setPrefs((prev) => {
        const next = { ...prev, [key]: value };
        SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [],
  );

  const renderRow = (label: string, value: boolean, key: keyof NotificationPrefs) => (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => updatePref(key, v)}
        trackColor={{ false: colors.disabled, true: colors.primaryLight }}
        thumbColor={value ? colors.primary : colors.textTertiary}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('notifications.title')}</Text>

        <View style={styles.card}>
          {renderRow(t('notifications.dailySuggestion'), prefs.dailySuggestion, 'dailySuggestion')}
          <View style={styles.divider} />
          {renderRow(t('notifications.analysisComplete'), prefs.analysisComplete, 'analysisComplete')}
          <View style={styles.divider} />
          {renderRow(t('notifications.newFeatures'), prefs.newFeatures, 'newFeatures')}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    title: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.xl,
      marginTop: spacing.md,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      ...shadows.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
    },
    rowText: {
      flex: 1,
      marginRight: spacing.md,
    },
    rowLabel: {
      ...typography.body1,
      color: colors.text,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.divider,
    },
  });
