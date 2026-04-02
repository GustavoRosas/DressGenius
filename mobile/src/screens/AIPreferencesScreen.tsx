/**
 * DressGenius — AI Preferences Screen (#15 + #31)
 *
 * Style profile: style preferences, color palettes, occasions,
 * body type questionnaire, budget, and preferred brands.
 * All strings i18n via react-i18next.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { api } from '../api/client';
import { Button } from '../components/Button';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

interface AIPreferences {
  style: string[];
  colors: string[];
  occasions: string[];
  body_type: string | null;
  budget: string | null;
  preferred_brands: string;
}

const EMPTY_PREFS: AIPreferences = {
  style: [],
  colors: [],
  occasions: [],
  body_type: null,
  budget: null,
  preferred_brands: '',
};

// ────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────

const STYLE_OPTIONS = [
  'casual',
  'classic',
  'bohemian',
  'sporty',
  'elegant',
  'minimalist',
  'streetwear',
  'romantic',
] as const;

const COLOR_OPTIONS: { key: string; swatch: string }[] = [
  { key: 'neutrals', swatch: '#C4B5A2' },
  { key: 'pastels', swatch: '#F8C8DC' },
  { key: 'boldBright', swatch: '#FF4500' },
  { key: 'earthTones', swatch: '#8B6914' },
  { key: 'monochrome', swatch: '#4A4A4A' },
  { key: 'jewelTones', swatch: '#50248F' },
];

const OCCASION_OPTIONS = [
  'workOffice',
  'casualDaily',
  'dateNight',
  'formalEvents',
  'workout',
  'travel',
  'party',
] as const;

const BODY_TYPE_OPTIONS: { key: string; emoji: string }[] = [
  { key: 'hourglass', emoji: '⏳' },
  { key: 'pear', emoji: '🍐' },
  { key: 'apple', emoji: '🍎' },
  { key: 'rectangle', emoji: '▬' },
  { key: 'invertedTriangle', emoji: '🔻' },
];

const BUDGET_LEVELS = ['$', '$$', '$$$', '$$$$'] as const;

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

export function AIPreferencesScreen() {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<AIPreferences>(EMPTY_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Load existing preferences ──
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.get<Partial<AIPreferences>>('/ai-preferences');
        if (mounted) {
          setPrefs({
            style: data.style ?? [],
            colors: data.colors ?? [],
            occasions: data.occasions ?? [],
            body_type: data.body_type ?? null,
            budget: data.budget ?? null,
            preferred_brands: data.preferred_brands ?? '',
          });
        }
      } catch {
        // first time — keep defaults
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // ── Save ──
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.put('/ai-preferences', prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // TODO: show error toast
    } finally {
      setSaving(false);
    }
  }, [prefs]);

  // ── Toggle helpers ──
  const toggleMulti = useCallback(
    (field: 'style' | 'colors' | 'occasions', value: string) => {
      setPrefs((prev) => {
        const list = prev[field];
        const next = list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value];
        return { ...prev, [field]: next };
      });
    },
    [],
  );

  const selectSingle = useCallback(
    (field: 'body_type' | 'budget', value: string) => {
      setPrefs((prev) => ({
        ...prev,
        [field]: prev[field] === value ? null : value,
      }));
    },
    [],
  );

  // ── Loading state ──
  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loaderText}>{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('screens.aiPreferences.title')}</Text>
          <Text style={styles.subtitle}>
            {t('screens.aiPreferences.subtitle')}
          </Text>
        </View>

        {/* ── Section 1: Style Preferences ── */}
        <SectionHeader
          title={t('screens.aiPreferences.styles.title')}
          subtitle={t('screens.aiPreferences.styles.subtitle')}
        />
        <View style={styles.chipRow}>
          {STYLE_OPTIONS.map((key) => (
            <Chip
              key={key}
              label={t(`screens.aiPreferences.styles.${key}`)}
              selected={prefs.style.includes(key)}
              onPress={() => toggleMulti('style', key)}
            />
          ))}
        </View>

        {/* ── Section 2: Color Preferences ── */}
        <SectionHeader
          title={t('screens.aiPreferences.colors.title')}
          subtitle={t('screens.aiPreferences.colors.subtitle')}
        />
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map(({ key, swatch }) => (
            <ColorCircle
              key={key}
              label={t(`screens.aiPreferences.colors.${key}`)}
              swatch={swatch}
              selected={prefs.colors.includes(key)}
              onPress={() => toggleMulti('colors', key)}
            />
          ))}
        </View>

        {/* ── Section 3: Occasions ── */}
        <SectionHeader
          title={t('screens.aiPreferences.occasions.title')}
          subtitle={t('screens.aiPreferences.occasions.subtitle')}
        />
        <View style={styles.chipRow}>
          {OCCASION_OPTIONS.map((key) => (
            <Chip
              key={key}
              label={t(`screens.aiPreferences.occasions.${key}`)}
              selected={prefs.occasions.includes(key)}
              onPress={() => toggleMulti('occasions', key)}
            />
          ))}
        </View>

        {/* ── Section 4: Body Type ── */}
        <SectionHeader
          title={t('screens.aiPreferences.bodyType.title')}
          subtitle={t('screens.aiPreferences.bodyType.subtitle')}
        />
        <View style={styles.bodyTypeGrid}>
          {BODY_TYPE_OPTIONS.map(({ key, emoji }) => (
            <BodyTypeCard
              key={key}
              emoji={emoji}
              name={t(`screens.aiPreferences.bodyType.types.${key}.name`)}
              description={t(
                `screens.aiPreferences.bodyType.types.${key}.description`,
              )}
              selected={prefs.body_type === key}
              onPress={() => selectSingle('body_type', key)}
            />
          ))}
        </View>

        {/* ── Section 5: Budget ── */}
        <SectionHeader
          title={t('screens.aiPreferences.budget.title')}
          subtitle={t('screens.aiPreferences.budget.subtitle')}
        />
        <View style={styles.chipRow}>
          {BUDGET_LEVELS.map((level) => (
            <Chip
              key={level}
              label={level}
              selected={prefs.budget === level}
              onPress={() => selectSingle('budget', level)}
            />
          ))}
        </View>

        {/* ── Section 6: Preferred Brands ── */}
        <SectionHeader
          title={t('screens.aiPreferences.brands.title')}
          subtitle={t('screens.aiPreferences.brands.subtitle')}
        />
        <TextInput
          style={styles.brandsInput}
          value={prefs.preferred_brands}
          onChangeText={(text) =>
            setPrefs((prev) => ({ ...prev, preferred_brands: text }))
          }
          placeholder={t('screens.aiPreferences.brands.placeholder')}
          placeholderTextColor={colors.placeholder}
          multiline
        />

        {/* ── Save ── */}
        <View style={styles.saveContainer}>
          {saved && (
            <Text style={styles.savedText}>
              ✓ {t('screens.aiPreferences.saved')}
            </Text>
          )}
          <Button
            title={
              saving
                ? t('screens.aiPreferences.saving')
                : t('screens.aiPreferences.save')
            }
            loading={saving}
            onPress={handleSave}
            variant="primary"
            style={styles.saveButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ────────────────────────────────────────────
// Sub-components
// ────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ColorCircle({
  label,
  swatch,
  selected,
  onPress,
}: {
  label: string;
  swatch: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.colorItem}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
    >
      <View
        style={[
          styles.colorCircle,
          { backgroundColor: swatch },
          selected && styles.colorCircleSelected,
        ]}
      >
        {selected && <Text style={styles.colorCheck}>✓</Text>}
      </View>
      <Text
        style={[styles.colorLabel, selected && styles.colorLabelSelected]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function BodyTypeCard({
  emoji,
  name,
  description,
  selected,
  onPress,
}: {
  emoji: string;
  name: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.bodyCard, selected && styles.bodyCardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      <Text style={styles.bodyEmoji}>{emoji}</Text>
      <Text style={[styles.bodyName, selected && styles.bodyNameSelected]}>
        {name}
      </Text>
      <Text style={styles.bodyDesc} numberOfLines={2}>
        {description}
      </Text>
    </Pressable>
  );
}

// ────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loaderText: {
    ...typography.body2,
    color: colors.textSecondary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.body1,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  // ── Section ──
  sectionHeader: {
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.subtitle1,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },

  // ── Chips ──
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    ...typography.body2,
    color: colors.text,
  },
  chipTextSelected: {
    color: colors.textInverse,
    fontWeight: '600',
  },

  // ── Color circles ──
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  colorItem: {
    alignItems: 'center',
    width: 72,
  },
  colorCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: colors.primary,
    borderWidth: 3,
  },
  colorCheck: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  colorLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  colorLabelSelected: {
    color: colors.primary,
    fontWeight: '600',
  },

  // ── Body type cards ──
  bodyTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  bodyCard: {
    width: '47%' as unknown as number,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  bodyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
  },
  bodyEmoji: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  bodyName: {
    ...typography.subtitle2,
    color: colors.text,
    textAlign: 'center',
  },
  bodyNameSelected: {
    color: colors.primary,
  },
  bodyDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xxs,
  },

  // ── Brands input ──
  brandsInput: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body1,
    color: colors.text,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // ── Save ──
  saveContainer: {
    marginTop: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  savedText: {
    ...typography.body2,
    color: colors.success,
    fontWeight: '600',
  },
  saveButton: {
    width: '100%',
  },
});
