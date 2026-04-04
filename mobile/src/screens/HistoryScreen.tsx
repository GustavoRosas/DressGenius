/**
 * DressGenius — History Screen (Scan History)
 *
 * Lists previous outfit scans (not chats) with pull-to-refresh,
 * loading/error/empty states, and relative time formatting.
 * Tap navigates to ScanDetail screen.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '../api/client';
import { Button } from '../components/Button';
import { useTheme } from '../context/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanListItem {
  id: number;
  image_url: string;
  score: number | null;
  score_label: string | null;
  occasion: string | null;
  created_at: string;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(
  dateStr: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHrs = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return t('screens.history.justNow');
  if (diffMin < 60) return t('screens.history.minutesAgo', { count: diffMin });
  if (diffHrs < 24) return t('screens.history.hoursAgo', { count: diffHrs });
  if (diffDays === 1) return t('screens.history.yesterday');
  return t('screens.history.daysAgo', { count: diffDays });
}

function getScoreColor(score: number | null): string {
  if (score == null) return '#9CA3AF';
  if (score >= 8) return '#22C55E';
  if (score >= 6) return '#84CC16';
  if (score >= 4) return '#EAB308';
  if (score >= 2) return '#F97316';
  return '#EF4444';
}

// ─── Card Component ───────────────────────────────────────────────────────────

const THUMBNAIL_SIZE = 80;

interface ScanCardProps {
  item: ScanListItem;
  onPress: (id: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  colors: ColorScheme;
}

const ScanCard = React.memo(({ item, onPress, t, colors }: ScanCardProps) => {
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scoreColor = getScoreColor(item.score);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Outfit scan ${item.id}`}
    >
      {/* Thumbnail */}
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.thumbnailIcon}>👗</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardTopRow}>
          {/* Score badge */}
          {item.score != null ? (
            <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
              <Text style={[styles.scoreBadgeText, { color: scoreColor }]}>
                {item.score.toFixed ? item.score.toFixed(1) : item.score}
              </Text>
            </View>
          ) : (
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>—</Text>
            </View>
          )}

          {/* Score label */}
          {item.score_label && (
            <Text style={[styles.scoreLabel, { color: scoreColor }]} numberOfLines={1}>
              {item.score_label}
            </Text>
          )}
        </View>

        {/* Occasion chip */}
        <View style={styles.metaRow}>
          <View style={[styles.occasionChip, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.occasionText, { color: colors.primary }]} numberOfLines={1}>
              {item.occasion || t('screens.history.scanCard.noOccasion')}
            </Text>
          </View>
        </View>

        {/* Time */}
        <Text style={styles.time}>{formatRelativeTime(item.created_at, t)}</Text>
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
});

// ─── Main Component ───────────────────────────────────────────────────────────

export function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();

  const [scans, setScans] = useState<ScanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const fetchScans = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(false);

      const { data } = await api.get<{ data: ScanListItem[] }>('/outfit-scans');
      setScans(data.data ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScans();
  }, [fetchScans]);

  const handlePress = useCallback(
    (scanId: number) => {
      navigation.navigate('ScanDetail', { scanId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: ScanListItem }) => (
      <ScanCard item={item} onPress={handlePress} t={t} colors={colors} />
    ),
    [handlePress, t, colors],
  );

  const keyExtractor = useCallback((item: ScanListItem) => String(item.id), []);

  // Loading
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>{t('screens.history.title')}</Text>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error
  if (error && scans.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>{t('screens.history.title')}</Text>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{t('screens.history.loadError')}</Text>
          <Button title={t('common.retry')} variant="outline" onPress={() => fetchScans()} style={styles.retryButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>{t('screens.history.title')}</Text>

      <FlatList
        data={scans}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={scans.length === 0 ? styles.emptyContainer : styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchScans(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyTitle}>{t('screens.history.empty')}</Text>
            <Text style={styles.emptySubtitle}>{t('screens.history.emptySubtitle')}</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    headerTitle: { ...typography.h2, color: colors.text, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl },
    listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
    emptyContainer: { flexGrow: 1 },

    loadingText: { ...typography.body2, color: colors.textSecondary, marginTop: spacing.md },

    errorIcon: { fontSize: 48, marginBottom: spacing.lg },
    errorText: { ...typography.body1, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
    retryButton: { minWidth: 140 },

    emptyIcon: { fontSize: 64, marginBottom: spacing.xl },
    emptyTitle: { ...typography.h3, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
    emptySubtitle: { ...typography.body1, color: colors.textSecondary, textAlign: 'center' },

    // Card
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
      ...shadows.sm,
    },
    cardPressed: { opacity: 0.85 },
    thumbnail: {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
    },
    thumbnailPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primaryLight },
    thumbnailIcon: { fontSize: 32 },
    cardInfo: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
    cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },

    // Score badge
    scoreBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: borderRadius.sm,
      backgroundColor: colors.surface,
    },
    scoreBadgeText: { ...typography.subtitle2, fontWeight: '800' },
    scoreLabel: { ...typography.caption, fontWeight: '600', flex: 1 },

    // Occasion
    metaRow: { flexDirection: 'row', marginBottom: spacing.xs },
    occasionChip: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: borderRadius.full,
    },
    occasionText: { ...typography.caption, fontWeight: '600' },

    // Time
    time: { ...typography.caption, color: colors.textTertiary },

    // Chevron
    chevron: { fontSize: 22, color: colors.textTertiary, fontWeight: '300' },
  });
