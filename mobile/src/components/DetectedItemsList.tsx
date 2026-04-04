/**
 * DressGenius — DetectedItemsList
 *
 * Renders detected items from a scan/analysis with add-to-closet actions.
 * Each item: emoji by category + label + color badge + add/already-in-closet button.
 * Bulk "Add All" button. Uses i18n + useTheme() everywhere.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectedItem {
  id: number;
  label: string;
  category: string | null;
  colors: string[] | null;
}

interface DetectedItemsListProps {
  detectedItems: DetectedItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<string, string> = {
  top: '👕',
  bottom: '👖',
  dress: '👗',
  outerwear: '🧥',
  shoes: '👟',
  accessories: '💍',
  hat: '🎩',
  bag: '👜',
  jewelry: '💎',
  watch: '⌚',
};

function getCategoryEmoji(category: string | null): string {
  if (!category) return '👔';
  const key = category.toLowerCase().trim();
  return CATEGORY_EMOJI[key] ?? '👔';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DetectedItemsList({ detectedItems }: DetectedItemsListProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { showToast } = useToast();

  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const notAddedItems = useMemo(
    () => detectedItems.filter((item) => !addedIds.has(item.id)),
    [detectedItems, addedIds],
  );

  const addItems = useCallback(
    async (ids: number[]) => {
      try {
        await api.post('/wardrobe-items/from-scan', { detected_item_ids: ids });
        setAddedIds((prev) => {
          const next = new Set(prev);
          ids.forEach((id) => next.add(id));
          return next;
        });
        showToast(t('detectedItems.addSuccess'), 'success');
      } catch {
        showToast(t('detectedItems.addError'), 'error');
      }
    },
    [t, showToast],
  );

  const handleAddSingle = useCallback(
    async (id: number) => {
      setLoadingIds((prev) => new Set(prev).add(id));
      await addItems([id]);
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [addItems],
  );

  const handleAddAll = useCallback(async () => {
    const ids = notAddedItems.map((i) => i.id);
    if (ids.length === 0) return;
    setBulkLoading(true);
    await addItems(ids);
    setBulkLoading(false);
  }, [notAddedItems, addItems]);

  if (detectedItems.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('detectedItems.title')}</Text>

      {detectedItems.map((item) => {
        const isAdded = addedIds.has(item.id);
        const isLoading = loadingIds.has(item.id);

        return (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemEmoji}>{getCategoryEmoji(item.category)}</Text>
            <View style={styles.itemInfo}>
              <Text style={styles.itemLabel} numberOfLines={1}>
                {item.label}
              </Text>
              {item.colors && item.colors.length > 0 && (
                <View style={styles.colorRow}>
                  {item.colors.slice(0, 3).map((hex, i) => (
                    <View
                      key={i}
                      style={[styles.colorDot, { backgroundColor: hex }]}
                    />
                  ))}
                </View>
              )}
            </View>

            {isAdded ? (
              <View style={[styles.statusBadge, { backgroundColor: colors.successBackground }]}>
                <Text style={[styles.statusText, { color: colors.success }]}>
                  ✓ {t('detectedItems.alreadyInCloset')}
                </Text>
              </View>
            ) : (
              <Pressable
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => handleAddSingle(item.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.textInverse} />
                ) : (
                  <Text style={[styles.addButtonText, { color: colors.textInverse }]}>
                    + {t('detectedItems.addItem')}
                  </Text>
                )}
              </Pressable>
            )}
          </View>
        );
      })}

      {notAddedItems.length > 1 && (
        <Pressable
          style={[styles.addAllButton, { backgroundColor: colors.primary }]}
          onPress={handleAddAll}
          disabled={bulkLoading}
        >
          {bulkLoading ? (
            <ActivityIndicator size="small" color={colors.textInverse} />
          ) : (
            <Text style={[styles.addAllText, { color: colors.textInverse }]}>
              {t('detectedItems.addAll', { count: notAddedItems.length })}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    title: {
      ...typography.subtitle1,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.lg,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemEmoji: {
      fontSize: 24,
      marginRight: spacing.md,
    },
    itemInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    itemLabel: {
      ...typography.body2,
      color: colors.text,
      fontWeight: '600',
    },
    colorRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginTop: spacing.xxs,
    },
    colorDot: {
      width: 14,
      height: 14,
      borderRadius: 7,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    statusText: {
      ...typography.caption,
      fontWeight: '600',
    },
    addButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
      minWidth: 70,
      alignItems: 'center',
    },
    addButtonText: {
      ...typography.caption,
      fontWeight: '700',
    },
    addAllButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      ...shadows.sm,
    },
    addAllText: {
      ...typography.subtitle2,
      fontWeight: '700',
    },
  });
