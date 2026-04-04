/**
 * DressGenius — Analyze Screen
 *
 * 3-state flow: Choose → Preview (Bottom Sheet intake) → Result
 * Camera/gallery → intake form → upload multipart → show AI analysis.
 *
 * Integrates:
 *  #50 — Usage counter chip
 *  #51 — Soft paywall modal
 *  #52 — Bottom sheet intake form
 *  #53 — Weather in payload
 *  #55 — Premium banner (initial state)
 *  #56 — Enriched analysis result cards
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '../api/client';
import type { RootStackParamList } from '../navigation/types';
import { Button } from '../components/Button';
import { UsageChip } from '../components/UsageChip';
import { SoftPaywallModal } from '../components/SoftPaywallModal';
import { PremiumBanner } from '../components/PremiumBanner';
import { AnalyzeIntakeSheet } from '../components/AnalyzeIntakeSheet';
import type { IntakeData } from '../components/AnalyzeIntakeSheet';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useUsage } from '../hooks/useUsage';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { ColorScheme } from '../theme/colors';

type ScreenState = 'initial' | 'preview' | 'result';

interface ColorAnalysis {
  dominant_colors?: string[];
  palette_type?: 'warm' | 'cool' | 'neutral';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  harmony_score?: number;
  harmony_feedback?: string;
  suggestions?: string[];
}

interface ScoreBreakdown {
  color_harmony: number;
  style_balance: number;
  occasion_fit: number;
  overall_cohesion: number;
}

interface Strength {
  title: string;
  description: string;
}

interface StyleLevel {
  detected: string;
  formality_score: number;
  balance_note: string;
}

interface OccasionAssessment {
  fit_score: number;
  verdict: string;
  verdict_note: string;
  would_work_for: string[];
  would_not_work_for: string[];
}

interface Improvement {
  priority: 'high' | 'medium' | 'low';
  area: string;
  suggestion: string;
  impact: string;
}

interface ClimateAssessment {
  fit_score: number;
  note: string;
  risk: string | null;
}

interface RichAnalysis {
  score?: number;
  score_label?: string;
  score_summary?: string;
  score_breakdown?: ScoreBreakdown;
  strengths?: Strength[];
  style_level?: StyleLevel;
  occasion_assessment?: OccasionAssessment;
  improvements?: Improvement[];
  climate_assessment?: ClimateAssessment;
  color_analysis?: ColorAnalysis | null;
  context_feedback?: Record<string, { status: string; message: string }>;
}

interface AnalysisResult {
  id?: number;
  analysis?: RichAnalysis | string | null;
  score?: number;
  color_analysis?: ColorAnalysis | null;
  occasion_tips?: string[];
  [key: string]: unknown;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const STRENGTH_CARD_WIDTH = 260;

export function AnalyzeScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const { isPremium } = usePremium();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { usage, refetch: refetchUsage } = useUsage();

  const [state, setState] = useState<ScreenState>('initial');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Bottom sheet & paywall state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  // — Animations —
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const animateTransition = useCallback(
    (next: () => void) => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        next();
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }).start();
      });
    },
    [fadeAnim],
  );

  // — Permissions —
  const requestCameraPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('screens.analyze.permissionTitle'),
        t('screens.analyze.permissionMessage', { resource: 'camera' }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('screens.analyze.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  }, [t]);

  const requestGalleryPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('screens.analyze.permissionTitle'),
        t('screens.analyze.permissionMessage', { resource: 'gallery' }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('screens.analyze.openSettings'), onPress: () => Linking.openSettings() },
        ],
      );
      return false;
    }
    return true;
  }, [t]);

  // — Image picking → open bottom sheet —
  const handlePickResult = useCallback(
    (pickerResult: ImagePicker.ImagePickerResult) => {
      if (!pickerResult.canceled && pickerResult.assets?.[0]?.uri) {
        const uri = pickerResult.assets[0].uri;
        setImageUri(uri);
        setError(null);
        setState('preview');
        setSheetVisible(true);
      }
    },
    [],
  );

  const takePhoto = useCallback(async () => {
    const granted = await requestCameraPermission();
    if (!granted) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    handlePickResult(result);
  }, [requestCameraPermission, handlePickResult]);

  const chooseFromGallery = useCallback(async () => {
    const granted = await requestGalleryPermission();
    if (!granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    handlePickResult(result);
  }, [requestGalleryPermission, handlePickResult]);

  // — Upload & Analyze (with paywall check) —
  const analyzeOutfit = useCallback(
    async (intake: IntakeData) => {
      if (!imageUri) return;

      // #51 — Soft paywall: check usage before analyzing
      if (!isPremium && usage && usage.analyses_used >= usage.analyses_limit) {
        setSheetVisible(false);
        setPaywallVisible(true);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('image', {
          uri: imageUri,
          name: 'outfit.jpg',
          type: 'image/jpeg',
        } as any);

        // #52 — Append intake data
        if (intake.occasion) {
          formData.append('occasion', intake.occasion);
        }
        formData.append('comfort_level', intake.comfort_level);
        if (intake.extra_context) {
          formData.append('extra_context', intake.extra_context);
        }

        // #53 — Append weather data
        if (intake.weather) {
          formData.append(
            'intake[weather]',
            JSON.stringify(intake.weather),
          );
        }

        // Send user language for localized AI response
        formData.append('intake[language]', i18n.language || 'en');

        const response = await api.post<AnalysisResult>('/outfit-scans', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        setSheetVisible(false);

        // Refetch usage after successful analysis
        refetchUsage();

        animateTransition(() => {
          // Backend returns { scan: { id, score, analysis, ... }, detected_items, process_id }
          const raw = response.data as any;
          const scan = raw.scan ?? raw;
          setResult({
            id: scan.id,
            score: scan.score,
            analysis: scan.analysis,
            color_analysis: scan.analysis?.color_analysis ?? null,
            occasion_tips: scan.analysis?.context_feedback
              ? Object.values(scan.analysis.context_feedback)
                  .filter((f: any) => f?.message)
                  .map((f: any) => f.message)
              : [],
          });
          setState('result');
        });
      } catch (_err) {
        const err = _err as any;
        // Close sheet and show error
        setSheetVisible(false);
        const status = err?.response?.status;
        const serverMsg = err?.response?.data?.message;
        if (status === 429 && err?.response?.data?.limit_reached) {
          Alert.alert(
            t('errors.limitReached'),
            serverMsg || t('errors.limitReached'),
            [{ text: 'OK' }],
          );
        } else {
          Alert.alert(
            t('common.error'),
            serverMsg || t('screens.analyze.error'),
            [{ text: 'OK' }],
          );
        }
        setError(serverMsg || t('screens.analyze.error'));
      } finally {
        setLoading(false);
      }
    },
    [imageUri, isPremium, usage, animateTransition, t, refetchUsage],
  );

  // — Reset —
  const resetScreen = useCallback(() => {
    animateTransition(() => {
      setState('initial');
      setImageUri(null);
      setResult(null);
      setError(null);
      setSheetVisible(false);
    });
  }, [animateTransition]);

  const chooseAnother = useCallback(() => {
    setSheetVisible(false);
    animateTransition(() => {
      setState('initial');
      setImageUri(null);
      setError(null);
    });
  }, [animateTransition]);

  const handleSheetClose = useCallback(() => {
    setSheetVisible(false);
    // Go back to initial if no result yet
    if (state === 'preview') {
      animateTransition(() => {
        setState('initial');
        setImageUri(null);
        setError(null);
      });
    }
  }, [state, animateTransition]);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // — Render helpers —
  const renderInitial = () => (
    <View style={styles.centerContent}>
      {/* #55 — Premium banner */}
      <PremiumBanner />

      {/* #50 — Usage chip in header */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>{t('screens.analyze.title')}</Text>
        <UsageChip usage={usage} />
      </View>
      <Text style={styles.subtitle}>{t('screens.analyze.subtitle')}</Text>

      <View style={styles.cardsRow}>
        <Pressable style={styles.card} onPress={takePhoto} accessibilityRole="button">
          <Text style={styles.cardIcon}>📸</Text>
          <Text style={styles.cardTitle}>{t('screens.analyze.takePhoto')}</Text>
          <Text style={styles.cardDesc}>{t('screens.analyze.takePhotoDesc')}</Text>
        </Pressable>

        <Pressable style={styles.card} onPress={chooseFromGallery} accessibilityRole="button">
          <Text style={styles.cardIcon}>🖼️</Text>
          <Text style={styles.cardTitle}>{t('screens.analyze.chooseGallery')}</Text>
          <Text style={styles.cardDesc}>{t('screens.analyze.chooseGalleryDesc')}</Text>
        </Pressable>
      </View>
    </View>
  );

  const renderPreview = () => (
    <View style={styles.centerContent}>
      {/* Dimmed background preview while sheet is open */}
      {imageUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title={t('screens.analyze.errorRetry')}
            variant="outline"
            onPress={() => setSheetVisible(true)}
            style={styles.retryButton}
          />
        </View>
      )}

      {!sheetVisible && (
        <View style={styles.buttonGroup}>
          <Button
            title={`✨ ${t('screens.analyze.analyzeButton')}`}
            variant="primary"
            onPress={() => setSheetVisible(true)}
            style={styles.actionButton}
          />
          <Button
            title={t('screens.analyze.chooseAnother')}
            variant="outline"
            onPress={chooseAnother}
            style={styles.actionButton}
          />
        </View>
      )}
    </View>
  );

  // — Helper: get analysis data safely —
  const getAnalysis = useCallback((): RichAnalysis | null => {
    if (!result?.analysis || typeof result.analysis === 'string') return null;
    return result.analysis as RichAnalysis;
  }, [result]);

  // — Helper: score badge color —
  const getScoreBadgeColor = useCallback(
    (score: number) => {
      if (score >= 9) return { bg: '#7C3AED20', text: '#7C3AED' }; // purple
      if (score >= 7) return { bg: colors.successBackground, text: colors.success };
      if (score >= 4) return { bg: colors.warningBackground, text: colors.warning };
      return { bg: colors.errorBackground, text: colors.error };
    },
    [colors],
  );

  // — Helper: verdict badge —
  const getVerdictEmoji = (verdict: string) => {
    const v = verdict.toLowerCase();
    if (v.includes('great')) return '🟢';
    if (v.includes('good')) return '🟡';
    if (v.includes('fair')) return '🟠';
    return '🔴';
  };

  // — Helper: priority badge —
  const getPriorityBadge = (priority: string) => {
    const p = (priority || '').toLowerCase().trim();
    if (p === 'high') return { emoji: '🔴', label: t('analyze.result.priority.high') };
    if (p === 'medium' || p === 'demium' || p === 'med') return { emoji: '🟡', label: t('analyze.result.priority.medium') };
    return { emoji: '⚪', label: t('analyze.result.priority.low') };
  }
  };

  // — Render breakdown bar —
  const renderBreakdownBar = (label: string, value: number) => {
    const barColor = value >= 7 ? colors.success : value >= 4 ? colors.warning : colors.error;
    return (
      <View style={styles.breakdownRow} key={label}>
        <View style={styles.breakdownLabelRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{label}</Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
        </View>
        <View style={[styles.breakdownTrack, { backgroundColor: colors.border }]}>
          <View
            style={[
              styles.breakdownFill,
              { width: `${Math.min(100, (value / 10) * 100)}%`, backgroundColor: barColor },
            ]}
          />
        </View>
      </View>
    );
  };

  // — Strength expansion state —
  const [expandedStrength, setExpandedStrength] = useState<number | null>(null);

  // — Render strength card (tap to expand) —
  const renderStrengthCard = ({ item, index }: { item: Strength; index: number }) => {
    const isExpanded = expandedStrength === index;
    return (
      <Pressable
        onPress={() => setExpandedStrength(isExpanded ? null : index)}
        style={[styles.strengthCard, { backgroundColor: colors.card }]}
      >
        <Text style={[styles.strengthIcon]}>✅</Text>
        <Text style={[styles.strengthTitle, { color: colors.text }]} numberOfLines={isExpanded ? undefined : 1}>
          {item.title}
        </Text>
        <Text style={[styles.strengthDesc, { color: colors.textSecondary }]} numberOfLines={isExpanded ? undefined : 2}>
          {item.description}
        </Text>
      </Pressable>
    );
  };

  // — #56 — Enriched result with 7 sections —
  const renderResult = () => {
    const analysis = getAnalysis();
    const displayScore = result?.score ?? analysis?.score;
    const scoreLabel = analysis?.score_label ?? '';
    const scoreSummary = analysis?.score_summary ?? '';
    const breakdown = analysis?.score_breakdown;
    const strengths = analysis?.strengths ?? [];
    const colorAnalysis = analysis?.color_analysis ?? result?.color_analysis;
    const styleLevel = analysis?.style_level;
    const occasionAssessment = analysis?.occasion_assessment;
    const improvements = analysis?.improvements ?? [];
    const climateAssessment = analysis?.climate_assessment;

    const scoreBadge = displayScore != null ? getScoreBadgeColor(displayScore) : null;

    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {imageUri && (
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: imageUri }} style={styles.thumbnail} resizeMode="cover" />
          </View>
        )}

        {/* ═══ Section 1: Score Hero Card ═══ */}
        {displayScore != null && (
          <View style={styles.resultCard}>
            <View style={styles.scoreHeroRow}>
              <Text style={[styles.scoreNumber, { color: scoreBadge?.text ?? colors.primary }]}>
                {displayScore.toFixed ? displayScore.toFixed(1) : displayScore}
              </Text>
              {scoreLabel !== '' && scoreBadge && (
                <View style={[styles.scoreLabelBadge, { backgroundColor: scoreBadge.bg }]}>
                  <Text style={[styles.scoreLabelText, { color: scoreBadge.text }]}>
                    {scoreLabel}
                  </Text>
                </View>
              )}
            </View>

            {scoreSummary !== '' && (
              <Text style={[styles.scoreSummary, { color: colors.textSecondary }]}>
                {scoreSummary}
              </Text>
            )}

            {/* Breakdown bars */}
            {breakdown && (
              <View style={styles.breakdownContainer}>
                {renderBreakdownBar(t('analyze.result.breakdown.colorHarmony'), breakdown.color_harmony)}
                {renderBreakdownBar(t('analyze.result.breakdown.styleBalance'), breakdown.style_balance)}
                {renderBreakdownBar(t('analyze.result.breakdown.occasionFit'), breakdown.occasion_fit)}
                {renderBreakdownBar(t('analyze.result.breakdown.cohesion'), breakdown.overall_cohesion)}
              </View>
            )}
          </View>
        )}

        {/* ═══ Section 2: Strengths ═══ */}
        {strengths.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('analyze.result.strengths.title')}
            </Text>
            <FlatList
              data={strengths}
              renderItem={renderStrengthCard}
              keyExtractor={(_, i) => `str-${i}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={STRENGTH_CARD_WIDTH + spacing.md}
              decelerationRate="fast"
              contentContainerStyle={styles.strengthListContent}
            />
          </View>
        )}

        {/* ═══ Section 3: Color Analysis 🎨 ═══ */}
        {colorAnalysis && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.colorAnalysis')}</Text>

            {colorAnalysis.dominant_colors && colorAnalysis.dominant_colors.length > 0 && (
              <View style={styles.swatchRow}>
                {colorAnalysis.dominant_colors.map((hex, i) => (
                  <View key={i} style={[styles.swatch, { backgroundColor: hex }]} />
                ))}
              </View>
            )}

            <View style={styles.badgeRow}>
              {colorAnalysis.palette_type && (
                <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {colorAnalysis.palette_type === 'warm' ? '🔴 ' : colorAnalysis.palette_type === 'cool' ? '🔵 ' : ''}
                    {t('analyze.result.palette')}: {colorAnalysis.palette_type}
                  </Text>
                </View>
              )}
              {colorAnalysis.season && (
                <View style={[styles.badge, { backgroundColor: colors.secondaryLight }]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>
                    {t('analyze.result.season')}: {colorAnalysis.season}
                  </Text>
                </View>
              )}
            </View>

            {colorAnalysis.harmony_score != null && (
              <View style={styles.harmonyRow}>
                <Text style={[styles.harmonyLabel, { color: colors.textSecondary }]}>
                  {t('analyze.result.harmony')}:
                </Text>
                <Text style={[styles.harmonyScore, { color: colors.primary }]}>
                  {colorAnalysis.harmony_score}{t('analyze.result.outOf')}
                </Text>
                {colorAnalysis.harmony_feedback && (
                  <Text style={[styles.harmonyFeedback, { color: colors.textSecondary }]}>
                    {' — '}{colorAnalysis.harmony_feedback}
                  </Text>
                )}
              </View>
            )}

            {colorAnalysis.suggestions && colorAnalysis.suggestions.length > 0 && (
              <View style={styles.suggestionsSection}>
                <Text style={styles.resultCardSubtitle}>{t('analyze.result.suggestions')}</Text>
                {colorAnalysis.suggestions.map((s, i) => (
                  <Text key={i} style={[styles.suggestionItem, { color: colors.text }]}>• {s}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ═══ Section 4: Style Level ⚖️ ═══ */}
        {styleLevel && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.styleLevel.title')}</Text>
            <Text style={[styles.styleLevelDetected, { color: colors.primary }]}>
              {styleLevel.detected}
            </Text>

            {/* Formality slider */}
            <View style={styles.formalityContainer}>
              <Text style={[styles.formalityLabel, { color: colors.textSecondary }]}>
                {t('analyze.result.styleLevel.formality')}
              </Text>
              <View style={[styles.formalityTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.formalityMarker,
                    {
                      left: `${Math.min(100, Math.max(0, (styleLevel.formality_score / 10) * 100))}%`,
                      backgroundColor: colors.primary,
                    },
                  ]}
                />
              </View>
              <View style={styles.formalityLabelsRow}>
                <Text style={[styles.formalityEndLabel, { color: colors.textTertiary }]}>{t('analyze.result.styleLevel.casual')}</Text>
                <Text style={[styles.formalityEndLabel, { color: colors.textTertiary }]}>{t('analyze.result.styleLevel.formal')}</Text>
              </View>
            </View>

            {styleLevel.balance_note !== '' && (
              <Text style={[styles.balanceNote, { color: colors.textSecondary }]}>
                {styleLevel.balance_note}
              </Text>
            )}
          </View>
        )}

        {/* ═══ Section 5: Occasion Assessment 📍 ═══ */}
        {occasionAssessment && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.occasion.title')}</Text>

            <View style={styles.verdictRow}>
              <Text style={styles.verdictEmoji}>{getVerdictEmoji(occasionAssessment.verdict)}</Text>
              <Text style={[styles.verdictText, { color: colors.text }]}>
                {occasionAssessment.verdict}
              </Text>
              <Text style={[styles.verdictScore, { color: colors.textSecondary }]}>
                {occasionAssessment.fit_score.toFixed(1)}/10
              </Text>
            </View>

            {occasionAssessment.verdict_note !== '' && (
              <Text style={[styles.verdictNote, { color: colors.textSecondary }]}>
                {occasionAssessment.verdict_note}
              </Text>
            )}

            {/* Works for chips */}
            {occasionAssessment.would_work_for.length > 0 && (
              <View style={styles.chipsSection}>
                <Text style={[styles.chipsLabel, { color: colors.textSecondary }]}>
                  {t('analyze.result.occasion.worksFor')}
                </Text>
                <View style={styles.chipsRow}>
                  {occasionAssessment.would_work_for.map((item, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: colors.successBackground }]}>
                      <Text style={[styles.chipText, { color: colors.success }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Doesn't work for chips */}
            {occasionAssessment.would_not_work_for.length > 0 && (
              <View style={styles.chipsSection}>
                <Text style={[styles.chipsLabel, { color: colors.textSecondary }]}>
                  {t('analyze.result.occasion.doesntWorkFor')}
                </Text>
                <View style={styles.chipsRow}>
                  {occasionAssessment.would_not_work_for.map((item, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: colors.errorBackground }]}>
                      <Text style={[styles.chipText, { color: colors.error }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ═══ Section 6: Improvements 💡 ═══ */}
        {improvements.length > 0 && (
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.improvements.title')}</Text>
            {improvements.map((imp, i) => {
              const badge = getPriorityBadge(imp.priority);
              return (
                <View key={i} style={[styles.improvementCard, { borderColor: colors.border }]}>
                  <View style={styles.improvementHeader}>
                    <Text style={styles.improvementPriorityEmoji}>{badge.emoji}</Text>
                    <Text style={[styles.improvementPriorityLabel, { color: colors.textSecondary }]}>
                      {badge.label}
                    </Text>
                    <Text style={[styles.improvementArea, { color: colors.text }]}>
                      {imp.area}
                    </Text>
                  </View>
                  <Text style={[styles.improvementSuggestion, { color: colors.text }]}>
                    {imp.suggestion}
                  </Text>
                  {imp.impact !== '' && (
                    <Text style={[styles.improvementImpact, { color: colors.textTertiary }]}>
                      {t('analyze.result.improvements.impact')}: {imp.impact}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ═══ Section 7: Climate 🌤️ ═══ */}
        {climateAssessment && (
          <View style={[styles.resultCard, styles.climateCard]}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.climate.title')}</Text>
            <View style={styles.climateRow}>
              <Text style={[styles.climateScore, { color: colors.primary }]}>
                {climateAssessment.fit_score.toFixed(1)}/10
              </Text>
              <Text style={[styles.climateNote, { color: colors.textSecondary }]}>
                {climateAssessment.note}
              </Text>
            </View>
            {climateAssessment.risk != null && climateAssessment.risk !== '' && (
              <View style={[styles.climateRisk, { backgroundColor: colors.warningBackground }]}>
                <Text style={[styles.climateRiskText, { color: colors.warning }]}>
                  ⚠️ {t('analyze.result.climate.risk')}: {climateAssessment.risk}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Fallback: raw analysis text */}
        {result?.analysis && typeof result.analysis === 'string' && (
          <View style={styles.resultCard}>
            <Text style={styles.resultText}>{result.analysis}</Text>
          </View>
        )}

        {/* ═══ Action Buttons ═══ */}
        <View style={styles.buttonGroup}>
          <Button
            title={t('screens.analyze.newAnalysis')}
            variant="primary"
            onPress={resetScreen}
            style={styles.actionButton}
          />
          <Button
            title={t('screens.analyze.startChat')}
            variant="outline"
            onPress={() => {
              if (result?.id) {
                navigation.navigate('Chat', { chatId: result.id });
              }
            }}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim }]}>
        {state === 'initial' && renderInitial()}
        {state === 'preview' && renderPreview()}
        {state === 'result' && renderResult()}
      </Animated.View>

      {/* #52 — Bottom Sheet Intake Form */}
      <AnalyzeIntakeSheet
        visible={sheetVisible}
        imageUri={imageUri}
        loading={loading}
        onAnalyze={analyzeOutfit}
        onClose={handleSheetClose}
      />

      {/* #51 — Soft Paywall Modal */}
      <SoftPaywallModal
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
      />
    </SafeAreaView>
  );
}

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    animatedContainer: {
      flex: 1,
    },
    centerContent: {
      flex: 1,
      paddingHorizontal: spacing.xl,
      paddingTop: spacing.xxxl,
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xxl,
      paddingBottom: spacing.xxxl,
      alignItems: 'center',
    },

    // — Header with usage chip —
    headerRow: {
      width: '100%',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      ...typography.h1,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    subtitle: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xxxl,
      paddingHorizontal: spacing.lg,
    },

    // — Cards (initial) —
    cardsRow: {
      flexDirection: 'column',
      gap: spacing.lg,
      width: '100%',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.xxl,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      ...shadows.md,
    },
    cardIcon: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    cardTitle: {
      ...typography.subtitle1,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    cardDesc: {
      ...typography.body2,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // — Preview —
    previewContainer: {
      width: '100%',
      aspectRatio: 3 / 4,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      ...shadows.lg,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },

    // — Result —
    thumbnailContainer: {
      width: 120,
      height: 160,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      ...shadows.md,
    },
    thumbnail: {
      width: '100%',
      height: '100%',
    },
    resultCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      marginBottom: spacing.md,
      ...shadows.md,
    },
    resultCardTitle: {
      ...typography.subtitle1,
      color: colors.text,
      marginBottom: spacing.md,
    },
    resultCardSubtitle: {
      ...typography.subtitle2,
      color: colors.text,
      marginBottom: spacing.sm,
      marginTop: spacing.md,
    },
    resultText: {
      ...typography.body1,
      color: colors.text,
    },

    // — Section 1: Score Hero —
    scoreHeroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    scoreNumber: {
      fontSize: 56,
      fontWeight: '800',
    },
    scoreLabelBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    scoreLabelText: {
      ...typography.subtitle2,
      fontWeight: '700',
    },
    scoreSummary: {
      ...typography.body1,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    breakdownContainer: {
      gap: spacing.sm,
    },
    breakdownRow: {
      marginBottom: spacing.xs,
    },
    breakdownLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.xxs,
    },
    breakdownLabel: {
      ...typography.caption,
    },
    breakdownValue: {
      ...typography.caption,
      fontWeight: '700',
    },
    breakdownTrack: {
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
    },
    breakdownFill: {
      height: '100%',
      borderRadius: 3,
    },

    // — Section 2: Strengths —
    sectionContainer: {
      width: '100%',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      ...typography.subtitle1,
      marginBottom: spacing.sm,
      paddingHorizontal: spacing.xs,
    },
    strengthListContent: {
      paddingRight: spacing.lg,
    },
    strengthCard: {
      width: STRENGTH_CARD_WIDTH,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginRight: spacing.md,
      ...shadows.sm,
    },
    strengthIcon: {
      fontSize: 20,
      marginBottom: spacing.xs,
    },
    strengthTitle: {
      ...typography.subtitle2,
      fontWeight: '700',
      marginBottom: spacing.xxs,
    },
    strengthDesc: {
      ...typography.body2,
    },

    // — Section 3: Color Analysis —
    swatchRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    swatch: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.border,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    badge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    badgeText: {
      ...typography.caption,
      fontWeight: '700',
      textTransform: 'capitalize',
    },
    harmonyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: spacing.sm,
    },
    harmonyLabel: {
      ...typography.body2,
    },
    harmonyScore: {
      ...typography.body2,
      fontWeight: '700',
      marginLeft: spacing.xs,
    },
    harmonyFeedback: {
      ...typography.body2,
    },
    suggestionsSection: {
      marginTop: spacing.sm,
    },
    suggestionItem: {
      ...typography.body2,
      marginBottom: spacing.xs,
    },

    // — Section 4: Style Level —
    styleLevelDetected: {
      ...typography.h3,
      fontWeight: '700',
      marginBottom: spacing.md,
    },
    formalityContainer: {
      marginBottom: spacing.md,
    },
    formalityLabel: {
      ...typography.caption,
      marginBottom: spacing.xs,
    },
    formalityTrack: {
      height: 8,
      borderRadius: 4,
      position: 'relative',
    },
    formalityMarker: {
      position: 'absolute',
      top: -4,
      width: 16,
      height: 16,
      borderRadius: 8,
      marginLeft: -8,
    },
    formalityLabelsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
    },
    formalityEndLabel: {
      ...typography.caption,
    },
    balanceNote: {
      ...typography.body2,
      fontStyle: 'italic',
    },

    // — Section 5: Occasion Assessment —
    verdictRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    verdictEmoji: {
      fontSize: 24,
    },
    verdictText: {
      ...typography.subtitle1,
      fontWeight: '700',
    },
    verdictScore: {
      ...typography.body2,
      marginLeft: 'auto',
    },
    verdictNote: {
      ...typography.body2,
      marginBottom: spacing.md,
    },
    chipsSection: {
      marginBottom: spacing.sm,
    },
    chipsLabel: {
      ...typography.caption,
      fontWeight: '600',
      marginBottom: spacing.xs,
    },
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    chip: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.full,
    },
    chipText: {
      ...typography.caption,
      fontWeight: '600',
    },

    // — Section 6: Improvements —
    improvementCard: {
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.sm,
    },
    improvementHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    improvementPriorityEmoji: {
      fontSize: 14,
    },
    improvementPriorityLabel: {
      ...typography.caption,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    improvementArea: {
      ...typography.subtitle2,
      fontWeight: '700',
    },
    improvementSuggestion: {
      ...typography.body2,
      marginBottom: spacing.xxs,
    },
    improvementImpact: {
      ...typography.caption,
      fontStyle: 'italic',
    },

    // — Section 7: Climate —
    climateCard: {
      // extra subtle styling
    },
    climateRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    climateScore: {
      ...typography.h3,
      fontWeight: '700',
    },
    climateNote: {
      ...typography.body2,
      flex: 1,
    },
    climateRisk: {
      marginTop: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md,
    },
    climateRiskText: {
      ...typography.body2,
      fontWeight: '600',
    },

    // — Buttons —
    buttonGroup: {
      width: '100%',
      gap: spacing.md,
      marginTop: spacing.lg,
    },
    actionButton: {
      width: '100%',
    },

    // — Error —
    errorContainer: {
      width: '100%',
      backgroundColor: colors.errorBackground,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      alignItems: 'center',
    },
    errorText: {
      ...typography.body2,
      color: colors.error,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    retryButton: {
      minWidth: 140,
    },
  });
