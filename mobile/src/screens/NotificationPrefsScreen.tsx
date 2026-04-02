/**
 * DressGenius — Notification Preferences Screen (#28)
 *
 * Toggles para preferências de notificação.
 * Persistidos localmente no SecureStore (backend endpoint futuro).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';

import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';

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
  const navigation = useNavigation();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  // Load persisted prefs
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t('notifications.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Daily outfit suggestion */}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>
                {t('notifications.dailySuggestion')}
              </Text>
            </View>
            <Switch
              value={prefs.dailySuggestion}
              onValueChange={(v) => updatePref('dailySuggestion', v)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={prefs.dailySuggestion ? colors.primary : colors.textTertiary}
            />
          </View>

          <View style={styles.divider} />

          {/* Analysis complete */}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>
                {t('notifications.analysisComplete')}
              </Text>
            </View>
            <Switch
              value={prefs.analysisComplete}
              onValueChange={(v) => updatePref('analysisComplete', v)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={prefs.analysisComplete ? colors.primary : colors.textTertiary}
            />
          </View>

          <View style={styles.divider} />

          {/* New features */}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>
                {t('notifications.newFeatures')}
              </Text>
            </View>
            <Switch
              value={prefs.newFeatures}
              onValueChange={(v) => updatePref('newFeatures', v)}
              trackColor={{ false: colors.disabled, true: colors.primaryLight }}
              thumbColor={prefs.newFeatures ? colors.primary : colors.textTertiary}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  backButton: {
    ...typography.h1,
    color: colors.primary,
    lineHeight: 36,
  },
  title: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
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
