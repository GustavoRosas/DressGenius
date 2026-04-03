/**
 * DressGenius — Analyze Intake Bottom Sheet (#52 + #53)
 *
 * After photo selection, shows occasion chips, comfort level, weather, extra context.
 * Persists last occasion to SecureStore. Calls back with intake data.
 *
 * #53 — Weather auto-detect via expo-location + Open-Meteo, manual override chips.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
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

export type WeatherCondition = 'sunny' | 'rainy' | 'cold' | 'mild' | 'hot';

export interface WeatherData {
  source: 'auto' | 'manual';
  temperature_c: number | null;
  condition: WeatherCondition | null;
}

export interface IntakeData {
  occasion: OccasionType | null;
  comfort_level: ComfortLevel;
  extra_context: string;
  weather: WeatherData | null;
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

const WEATHER_CONDITIONS: WeatherCondition[] = ['sunny', 'rainy', 'cold', 'mild', 'hot'];

/**
 * Map WMO weather codes to our conditions.
 * https://open-meteo.com/en/docs#weathervariables
 */
function wmoToCondition(code: number): WeatherCondition {
  if (code <= 1) return 'sunny'; // clear / mainly clear
  if (code <= 3) return 'mild'; // partly cloudy / overcast
  if (code >= 51 && code <= 67) return 'rainy'; // drizzle / rain
  if (code >= 71 && code <= 77) return 'cold'; // snow
  if (code >= 80 && code <= 82) return 'rainy'; // rain showers
  if (code >= 95) return 'rainy'; // thunderstorm
  return 'mild';
}

function wmoToEmoji(code: number): string {
  if (code <= 1) return '☀️';
  if (code <= 3) return '🌤️';
  if (code >= 51 && code <= 67) return '🌧️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 95) return '⛈️';
  return '🌤️';
}

function wmoToDescription(code: number): string {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Cloudy';
}

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

  // Weather state (#53)
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition | null>(null);
  const [weatherTemp, setWeatherTemp] = useState<string>('');
  const [weatherSource, setWeatherSource] = useState<'auto' | 'manual'>('manual');
  const [weatherDetecting, setWeatherDetecting] = useState(false);
  const [autoWeatherLabel, setAutoWeatherLabel] = useState<string | null>(null);

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

  // Auto-detect weather
  const detectWeather = useCallback(async () => {
    setWeatherDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setAutoWeatherLabel(t('analyze.weather.locationDenied'));
        setWeatherDetecting(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.coords.latitude}&longitude=${loc.coords.longitude}&current=temperature_2m,weathercode&timezone=auto`;
      const resp = await fetch(url);
      const data = await resp.json();

      const temp = Math.round(data.current.temperature_2m);
      const code = data.current.weathercode as number;

      const condition = wmoToCondition(code);
      const emoji = wmoToEmoji(code);
      const desc = wmoToDescription(code);

      setWeatherCondition(condition);
      setWeatherTemp(String(temp));
      setWeatherSource('auto');
      setAutoWeatherLabel(
        t('analyze.weather.detected', { emoji, temp, desc }),
      );
    } catch {
      setAutoWeatherLabel(t('analyze.weather.locationDenied'));
    } finally {
      setWeatherDetecting(false);
    }
  }, [t]);

  const selectManualCondition = useCallback((cond: WeatherCondition) => {
    setWeatherCondition(cond);
    setWeatherSource('manual');
    setAutoWeatherLabel(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (occasion) {
      try {
        await SecureStore.setItemAsync(LAST_OCCASION_KEY, occasion);
      } catch {
        // ignore
      }
    }

    const tempNum = weatherTemp ? parseInt(weatherTemp, 10) : null;
    const weather: WeatherData | null =
      weatherCondition || (tempNum !== null && !isNaN(tempNum as number))
        ? {
            source: weatherSource,
            temperature_c: tempNum !== null && !isNaN(tempNum as number) ? tempNum : null,
            condition: weatherCondition,
          }
        : null;

    onAnalyze({
      occasion,
      comfort_level: comfort,
      extra_context: extraContext.trim(),
      weather,
    });
  }, [occasion, comfort, extraContext, weatherCondition, weatherTemp, weatherSource, onAnalyze]);

  const styles = React.useMemo(() => createStyles(colors), [colors]);

  return (
    <BottomSheet visible={visible} onClose={onClose} heightFraction={0.75}>
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

        {/* Weather (#53) */}
        <Text style={styles.sectionTitle}>{t('analyze.weather.title')}</Text>

        {/* Auto-detect button */}
        <Pressable
          style={[
            styles.detectButton,
            {
              backgroundColor: colors.primaryLight,
              borderColor: colors.primary,
            },
          ]}
          onPress={detectWeather}
          disabled={weatherDetecting}
          accessibilityRole="button"
        >
          {weatherDetecting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.detectButtonText, { color: colors.primary }]}>
              {t('analyze.weather.detect')}
            </Text>
          )}
        </Pressable>

        {/* Auto-detected result chip */}
        {autoWeatherLabel && (
          <View
            style={[
              styles.autoWeatherChip,
              { backgroundColor: colors.successBackground, borderColor: colors.success },
            ]}
          >
            <Text style={[styles.autoWeatherText, { color: colors.text }]}>
              {autoWeatherLabel}
            </Text>
          </View>
        )}

        {/* Manual override chips */}
        <Text style={[styles.manualLabel, { color: colors.textSecondary }]}>
          {t('analyze.weather.manual')}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {WEATHER_CONDITIONS.map((cond) => {
            const selected = weatherCondition === cond && weatherSource === 'manual';
            return (
              <Pressable
                key={cond}
                style={[
                  styles.chip,
                  selected
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: 'transparent', borderColor: colors.border },
                ]}
                onPress={() => selectManualCondition(cond)}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: selected ? colors.textInverse : colors.text },
                  ]}
                >
                  {t(`analyze.weather.${cond}`)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Temperature input */}
        <View style={styles.tempRow}>
          <TextInput
            style={[
              styles.tempInput,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.surfaceElevated,
              },
            ]}
            placeholder="___"
            placeholderTextColor={colors.placeholder}
            value={weatherTemp}
            onChangeText={(text) => setWeatherTemp(text.replace(/[^0-9-]/g, '').slice(0, 3))}
            keyboardType="numeric"
            maxLength={3}
          />
          <Text style={[styles.tempUnit, { color: colors.textSecondary }]}>°C</Text>
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

    // Weather (#53)
    detectButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.md,
      borderWidth: 1.5,
      marginBottom: spacing.sm,
    },
    detectButtonText: {
      ...typography.body2,
      fontWeight: '700',
    },
    autoWeatherChip: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
      alignItems: 'center',
    },
    autoWeatherText: {
      ...typography.body2,
      fontWeight: '600',
    },
    manualLabel: {
      ...typography.caption,
      marginBottom: spacing.xs,
    },
    tempRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.sm,
    },
    tempInput: {
      width: 64,
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      ...typography.body2,
      textAlign: 'center',
    },
    tempUnit: {
      ...typography.body1,
      marginLeft: spacing.xs,
      fontWeight: '600',
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
