/**
 * DressGenius — Analyze Intake Bottom Sheet (#52)
 *
 * After photo selection, shows occasion chips, comfort level, extra context.
 * Persists last occasion to SecureStore. Calls back with intake data.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';

import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { useTheme } from '../context/ThemeContext';
import type { ColorScheme } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';

const LAST_OCCASION_KEY = 'dressgenius_last_occasion';

export type OccasionType =
  | 'casual'
  | 'work'
  | 'date'
  | 'wedding'
  | 'party'
  | 'gym'
  | 'travel'
  | 'other';

export type ComfortLevel = 'comfort' | 'balanced' | 'style';

export interface IntakeData {
  occasion: OccasionType | null;
  comfort_level: ComfortLevel;
  extra_context: string;
}

const OCCASIONS: OccasionType[] = [
  'casual',
  'work',
  'date',
  'wedding',
  'party',
  'gym',
  'travel',
  'other',
];

const COMFORT_LEVELS: ComfortLevel[] = ['comfort', 'balanced', 'style'];

interface AnalyzeIntakeSheetProps {
  visible: boolean;
  imageUri: string | null;
  loading: boolean;
  onAnalyze: (data: IntakeData) => void;
  onClose: () => void;
}

export function AnalyzeIntakeSheet({
  visible,
  imageUri,
  loading,
  onAnalyze,
  onClose,
}: AnalyzeIntakeSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [occasion, setOccasion] = useState<OccasionType | null>(null);
  const [comfort, setComfort] = useState<ComfortLevel>('balanced');
  const [extraContext, setExtraContext] = useState('');

  // Load last used occasion
  useEffect(() => {
    if (visible) {
      (async () => {
        try {
          const last = await SecureStore.getItemAsync(LAST_OCCASION_KEY);
          if (last && OCCASIONS.includes(last as OccasionType)) {
            setOccasion(last as OccasionType);
          }
        } catch {
          // ignore
        }
      })();
    }
  }, [visible]);

  const handleAnalyze = useCallback(async () => {
    if (occasion) {
      try {
        await SecureStore.setItemAsync(LAST_OCCASION_KEY, occasion);
      } catch {
        // ignore
      }
    }
    onAnalyze({
      occasion,
      comfort_level: comfort,
      extra_context: extraContext.trim(),
    });
  }, [occasion, comfort, extraContext, onAnalyze]);

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.65}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo preview */}
        {imageUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          </View>
        )}

        {/* Occasion */}
        <Text style={styles.sectionTitle}>{t('analyze.occasion.title')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {OCCASIONS.map((occ) => {
            const selected = occasion === occ;
            return (
              <Pressable
                key={occ}
                style={[
                  styles.chip,
                  selected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
                onPress={() => setOccasion(occ)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.textInverse : colors.text },
                  ]}
                >
                  {t(`analyze.occasion.${occ}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Comfort */}
        <Text style={styles.sectionTitle}>{t('analyze.comfort.title')}</Text>
        <View style={styles.comfortRow}>
          {COMFORT_LEVELS.map((level) => {
            const selected = comfort === level;
            return (
              <Pressable
                key={level}
                style={[
                  styles.chip,
                  styles.comfortChip,
                  selected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
                onPress={() => setComfort(level)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.textInverse : colors.text },
                  ]}
                >
                  {t(`analyze.comfort.${level}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Extra context */}
        <Text style={styles.sectionTitle}>{t('analyze.extraContext.title')}</Text>
        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surfaceElevated,
            },
          ]}
          placeholder={t('analyze.extraContext.placeholder')}
          placeholderTextColor={colors.placeholder}
          value={extraContext}
          onChangeText={(text) => setExtraContext(text.slice(0, 120))}
          maxLength={120}
          multiline
          numberOfLines={2}
        />
        <Text style={[styles.charCount, { color: colors.textTertiary }]}>
          {extraContext.length}/120
        </Text>
      </ScrollView>

      {/* Sticky bottom button */}
      <View style={[styles.bottomBar, { borderTopColor: colors.divider }]}>
        <Button
          title={loading ? t('screens.analyze.analyzing') : `✨ ${t('screens.analyze.analyzeButton')}`}
          variant="primary"
          onPress={handleAnalyze}
          loading={loading}
          disabled={loading}
          style={styles.analyzeBtn}
        />
      </View>
    </BottomSheet>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.xl,
      paddingBottom: spacing.md,
    },
    previewContainer: {
      width: '100%',
      height: 150,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.lg,
    },
    preview: {
      width: '100%',
      height: '100%',
    },
    sectionTitle: {
      ...typography.subtitle2,
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    chipsRow: {
      marginBottom: spacing.sm,
    },
    chipsContent: {
      gap: spacing.sm,
      paddingRight: spacing.md,
    },
    chip: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      borderWidth: 1.5,
    },
    chipText: {
      ...typography.body2,
      fontWeight: '600',
    },
    comfortRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    comfortChip: {
      flex: 1,
      alignItems: 'center',
    },
    textInput: {
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      ...typography.body2,
      minHeight: 56,
      textAlignVertical: 'top',
    },
    charCount: {
      ...typography.caption,
      textAlign: 'right',
      marginTop: spacing.xxs,
    },
    bottomBar: {
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
    },
    analyzeBtn: {
      width: '100%',
    },
  });
