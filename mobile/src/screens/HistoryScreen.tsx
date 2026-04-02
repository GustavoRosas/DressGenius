/**
 * DressGenius — History Screen
 *
 * Lists previous outfit chat sessions with pull-to-refresh,
 * loading/error/empty states, and relative time formatting.
 * Tap navigates to Chat screen with chatId.
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
import { palette, type ColorScheme } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatStatus = 'active' | 'finished';

interface OutfitChat {
  id: number;
  status: ChatStatus;
  created_at: string;
  preview_image_url?: string | null;
  last_message?: string | null;
}

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const THUMBNAIL_SIZE = 60;

interface ChatCardProps {
  item: OutfitChat;
  onPress: (id: number) => void;
  t: (key: string, opts?: Record<string, unknown>) => string;
  colors: ColorScheme;
}

const ChatCard = React.memo(({ item, onPress, t, colors }: ChatCardProps) => {
  const isActive = item.status === 'active';
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Outfit chat ${item.id}`}
    >
      {/* Thumbnail */}
      {item.preview_image_url ? (
        <Image
          source={{ uri: item.preview_image_url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.thumbnailIcon}>👗</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.cardTopRow}>
          <View
            style={[
              styles.badge,
              isActive ? styles.badgeActive : styles.badgeFinished,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isActive ? styles.badgeTextActive : styles.badgeTextFinished,
              ]}
            >
              {isActive
                ? t('screens.history.statusActive')
                : t('screens.history.statusFinished')}
            </Text>
          </View>
          <Text style={styles.time}>
            {formatRelativeTime(item.created_at, t)}
          </Text>
        </View>

        {item.last_message ? (
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.last_message}
          </Text>
        ) : null}
      </View>

      {/* Chevron */}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
});

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function HistoryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();

  const [chats, setChats] = useState<OutfitChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const fetchChats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(false);

      const { data } = await api.get<OutfitChat[]>('/outfit-chats');

      // Sort by created_at descending (most recent first)
      const sorted = [...data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setChats(sorted);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  const handlePress = useCallback(
    (chatId: number) => {
      navigation.navigate('Chat', { chatId });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: OutfitChat }) => (
      <ChatCard item={item} onPress={handlePress} t={t} colors={colors} />
    ),
    [handlePress, t, colors],
  );

  const keyExtractor = useCallback(
    (item: OutfitChat) => String(item.id),
    [],
  );

  // ---- Render states ----

  // Loading (first load)
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
  if (error && chats.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.headerTitle}>{t('screens.history.title')}</Text>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>
            {t('screens.history.loadError')}
          </Text>
          <Button
            title={t('common.retry')}
            variant="outline"
            onPress={() => fetchChats()}
            style={styles.retryButton}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.headerTitle}>{t('screens.history.title')}</Text>

      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          chats.length === 0 ? styles.emptyContainer : styles.listContent
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchChats(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>
              {t('screens.history.empty')}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t('screens.history.emptySubtitle')}
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    headerTitle: {
      ...typography.h2,
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.md,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },
    emptyContainer: {
      flexGrow: 1,
    },

    // Loading
    loadingText: {
      ...typography.body2,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },

    // Error
    errorIcon: {
      fontSize: 48,
      marginBottom: spacing.lg,
    },
    errorText: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
    },
    retryButton: {
      minWidth: 140,
    },

    // Empty
    emptyIcon: {
      fontSize: 64,
      marginBottom: spacing.xl,
    },
    emptyTitle: {
      ...typography.h3,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    emptySubtitle: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
    },

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
    cardPressed: {
      opacity: 0.85,
    },
    thumbnail: {
      width: THUMBNAIL_SIZE,
      height: THUMBNAIL_SIZE,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
    },
    thumbnailPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
    },
    thumbnailIcon: {
      fontSize: 28,
    },
    cardInfo: {
      flex: 1,
      marginLeft: spacing.md,
      marginRight: spacing.sm,
    },
    cardTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },

    // Badge
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xxs,
      borderRadius: borderRadius.xs,
    },
    badgeActive: {
      backgroundColor: colors.primaryLight,
    },
    badgeFinished: {
      backgroundColor: colors.successBackground,
    },
    badgeText: {
      ...typography.caption,
      fontWeight: '600',
    },
    badgeTextActive: {
      color: colors.primary,
    },
    badgeTextFinished: {
      color: colors.success,
    },

    // Time
    time: {
      ...typography.caption,
      color: colors.textTertiary,
    },

    // Last message
    lastMessage: {
      ...typography.body2,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },

    // Chevron
    chevron: {
      fontSize: 22,
      color: colors.textTertiary,
      fontWeight: '300',
    },
  });
