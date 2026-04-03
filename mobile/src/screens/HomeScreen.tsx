/**
 * DressGenius — Home Screen
 *
 * Dashboard with greeting, weather card, monthly stats,
 * last analysis, quick actions, Style DNA mini card, and PremiumBanner.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { PremiumBanner } from '../components/PremiumBanner';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface OutfitChat {
  id: number;
  status: string;
  created_at: string;
  preview_image_url?: string | null;
  overall_score?: number | null;
}

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'home.greeting.morning';
  if (h < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diff / 86400000);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

export function HomeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigation = useNavigation<Nav>();
  const { summary } = useAnalytics();

  const [lastChat, setLastChat] = useState<OutfitChat | null>(null);
  const [loadingChat, setLoadingChat] = useState(true);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const fetchLastChat = useCallback(async () => {
    try {
      setLoadingChat(true);
      const { data } = await api.get<OutfitChat[]>('/outfit-chats');
      if (Array.isArray(data) && data.length > 0) {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        setLastChat(sorted[0]);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingChat(false);
    }
  }, []);

  useEffect(() => {
    fetchLastChat();
  }, [fetchLastChat]);

  const userName = user?.name?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ── */}
        <View style={styles.greetingRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {t(getGreetingKey(), { name: userName })}
            </Text>
            <Text style={styles.date}>{formatDate()}</Text>
          </View>
          <Text style={styles.bellIcon}>🔔</Text>
        </View>

        {/* ── Weather Card ── */}
        <Pressable
          style={styles.weatherCard}
          onPress={() => navigation.navigate('Analyze')}
        >
          <Text style={styles.weatherText}>{t('home.weather.placeholder')}</Text>
          <Text style={styles.weatherAction}>{t('home.weather.seeSuggestion')}</Text>
        </Pressable>

        {/* ── Monthly Stats ── */}
        <Text style={styles.sectionTitle}>{t('home.stats.title')}</Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {summary?.totalAnalyses ?? '—'}
            </Text>
            <Text style={styles.statLabel}>{t('home.stats.analyses')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {summary ? `${((summary.breakdowns?.[0]?.percentage ?? 0) > 0 ? '7.2' : '—')}` : '—'}
            </Text>
            <Text style={styles.statLabel}>{t('home.stats.avgScore')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>—</Text>
            <Text style={styles.statLabel}>{t('home.stats.streak')}</Text>
          </View>
        </View>

        {/* ── Last Analysis ── */}
        <Text style={styles.sectionTitle}>{t('home.lastAnalysis.title')}</Text>
        {loadingChat ? (
          <View style={styles.card}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : lastChat ? (
          <Pressable
            style={styles.lastAnalysisCard}
            onPress={() => navigation.navigate('Chat', { chatId: lastChat.id })}
          >
            {lastChat.preview_image_url ? (
              <Image
                source={{ uri: lastChat.preview_image_url }}
                style={styles.lastAnalysisThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.lastAnalysisThumbnail, styles.thumbnailPlaceholder]}>
                <Text style={{ fontSize: 28 }}>👗</Text>
              </View>
            )}
            <View style={styles.lastAnalysisInfo}>
              {lastChat.overall_score != null && (
                <View style={styles.scoreBadge}>
                  <Text style={styles.scoreText}>
                    {lastChat.overall_score}/10
                  </Text>
                </View>
              )}
              <Text style={styles.lastAnalysisDate}>
                {formatRelative(lastChat.created_at)}
              </Text>
              <Text style={styles.viewDetails}>{t('home.lastAnalysis.viewDetails')}</Text>
            </View>
          </Pressable>
        ) : (
          <View style={styles.card}>
            <Text style={styles.emptyIcon}>📸</Text>
            <Text style={styles.emptyText}>{t('home.lastAnalysis.noAnalysis')}</Text>
          </View>
        )}

        {/* ── Quick Actions ── */}
        <View style={styles.quickActionsRow}>
          <Pressable
            style={styles.quickAction}
            onPress={() => navigation.navigate('Analyze')}
          >
            <Text style={styles.quickActionIcon}>📸</Text>
            <Text style={styles.quickActionLabel}>{t('home.quickActions.analyze')}</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => navigation.navigate('Closet')}
          >
            <Text style={styles.quickActionIcon}>👗</Text>
            <Text style={styles.quickActionLabel}>{t('home.quickActions.closet')}</Text>
          </Pressable>
          <Pressable
            style={styles.quickAction}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={styles.quickActionIcon}>📊</Text>
            <Text style={styles.quickActionLabel}>{t('home.quickActions.stats')}</Text>
          </Pressable>
        </View>

        {/* ── Style DNA Mini ── */}
        {summary && summary.breakdowns.length > 0 && (
          <Pressable
            style={styles.styleDnaCard}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={styles.styleDnaTitle}>{t('home.styleDna.title')}</Text>
            <Text style={styles.styleDnaLabel}>
              {summary.emoji} {summary.label}
            </Text>
            <Text style={styles.styleDnaAction}>{t('home.styleDna.viewFull')}</Text>
          </Pressable>
        )}

        {/* ── Premium Banner ── */}
        {!isPremium && <PremiumBanner />}
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
    // Greeting
    greetingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    greeting: {
      ...typography.h2,
      color: colors.text,
    },
    date: {
      ...typography.body2,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    bellIcon: {
      fontSize: 24,
      marginLeft: spacing.md,
    },
    // Weather
    weatherCard: {
      backgroundColor: colors.primaryLight,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    weatherText: {
      ...typography.body1,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    weatherAction: {
      ...typography.subtitle2,
      color: colors.primary,
    },
    // Section
    sectionTitle: {
      ...typography.subtitle2,
      color: colors.text,
      marginBottom: spacing.md,
    },
    // Stats
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      ...shadows.sm,
    },
    statValue: {
      ...typography.h2,
      color: colors.primary,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    // Card generic
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    // Last Analysis
    lastAnalysisCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    lastAnalysisThumbnail: {
      width: 72,
      height: 72,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
    },
    thumbnailPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
    },
    lastAnalysisInfo: {
      flex: 1,
      marginLeft: spacing.md,
      justifyContent: 'center',
    },
    scoreBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryLight,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: borderRadius.xs,
      marginBottom: spacing.xs,
    },
    scoreText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '700',
    },
    lastAnalysisDate: {
      ...typography.caption,
      color: colors.textTertiary,
      marginBottom: spacing.xs,
    },
    viewDetails: {
      ...typography.subtitle2,
      color: colors.primary,
      fontSize: 13,
    },
    // Empty
    emptyIcon: {
      fontSize: 40,
      marginBottom: spacing.md,
    },
    emptyText: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    // Quick Actions
    quickActionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    quickAction: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      ...shadows.sm,
    },
    quickActionIcon: {
      fontSize: 28,
      marginBottom: spacing.sm,
    },
    quickActionLabel: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '600',
    },
    // Style DNA
    styleDnaCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    styleDnaTitle: {
      ...typography.overline,
      color: colors.textTertiary,
      marginBottom: spacing.sm,
    },
    styleDnaLabel: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    styleDnaAction: {
      ...typography.subtitle2,
      color: colors.primary,
      fontSize: 13,
    },
  });
