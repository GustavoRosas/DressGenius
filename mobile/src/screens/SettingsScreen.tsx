/**
 * DressGenius — Settings Screen
 *
 * Clean card-based settings links: Notifications, AI Preferences,
 * Language, Dark Mode, Subscription.
 */

import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useTheme } from '../context/ThemeContext';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ThemeToggle } from '../components/ThemeToggle';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SettingsScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{t('settings.title')}</Text>

        <View style={styles.card}>
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('NotificationPrefs')}
          >
            <Text style={styles.rowIcon}>🔔</Text>
            <Text style={styles.rowLabel}>{t('settings.notifications')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('AIPreferences')}
          >
            <Text style={styles.rowIcon}>🤖</Text>
            <Text style={styles.rowLabel}>{t('settings.aiPreferences')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>

          <View style={styles.row}>
            <Text style={styles.rowIcon}>🌐</Text>
            <Text style={[styles.rowLabel, { flex: 1 }]}>{t('settings.language')}</Text>
            <LanguageSwitcher />
          </View>

          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.rowIcon}>🌙</Text>
            <Text style={[styles.rowLabel, { flex: 1 }]}>{t('settings.darkMode')}</Text>
            <ThemeToggle />
          </View>
        </View>

        <View style={styles.card}>
          <Pressable
            style={[styles.row, { borderBottomWidth: 0 }]}
            onPress={() => navigation.navigate('Paywall')}
          >
            <Text style={styles.rowIcon}>💎</Text>
            <Text style={styles.rowLabel}>{t('settings.subscription')}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
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
      ...typography.h2,
      color: colors.text,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      ...shadows.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.lg,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.divider,
    },
    rowIcon: {
      fontSize: 20,
      marginRight: spacing.md,
    },
    rowLabel: {
      ...typography.body1,
      color: colors.text,
      flex: 1,
    },
    chevron: {
      ...typography.h3,
      color: colors.textTertiary,
    },
  });
