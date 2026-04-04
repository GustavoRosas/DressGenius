/**
 * DressGenius — Scan Detail Screen
 *
 * Shows full analysis detail for a past scan.
 * Reuses the 7-section result layout from AnalyzeScreen.
 * Buttons: Chat about this look, Add items to closet.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { api } from '../api/client';
import { Button } from '../components/Button';
import { DetectedItemsList, type DetectedItem } from '../components/DetectedItemsList';
import { useTheme } from '../context/ThemeContext';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

type ScanDetailRoute = RouteProp<RootStackParamList, 'ScanDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

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

interface ColorAnalysis {
  dominant_colors?: string[];
  palette_type?: 'warm' | 'cool' | 'neutral';
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
  harmony_score?: number;
  harmony_feedback?: string;
  suggestions?: string[];
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
}

interface ScanDetailData {
  scan: {
    id: number;
    image_url: string;
    vision: any;
    analysis: RichAnalysis | string | null;
    score: number | null;
    intake: any;
    created_at: string;
  };
  detected_items: DetectedItem[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const STRENGTH_CARD_WIDTH = 260;

// ─── Component ────────────────────────────────────────────────────────────────

export function ScanDetailScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const route = useRoute<ScanDetailRoute>();
  const navigation = useNavigation<NavProp>();
  const { scanId } = route.params;

  const [data, setData] = useState<ScanDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  // Header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      title: t('screens.scanDetail.title'),
      headerStyle: { backgroundColor: colors.background },
      headerTintColor: colors.text,
      headerTitleStyle: { ...typography.subtitle1, color: colors.text },
    });
  }, [navigation, t, colors]);

  // Fetch
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(false);
        const { data: res } = await api.get<ScanDetailData>(`/outfit-scans/${scanId}`);
        setData(res);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [scanId]);

  // ─── Chat from scan ────────────────────────────────────────────────────
  const handleStartChat = useCallback(async () => {
    if (!data?.scan?.id) return;
    setChatLoading(true);
    try {
      const { data: res } = await api.post<{ session: { id: number } }>('/outfit-chats/from-scan', {
        scan_id: data.scan.id,
      });
      navigation.navigate('Chat', { chatId: res.session.id, fromScan: true });
    } catch {
      Alert.alert(t('common.error'), t('screens.chat.errorLoad'));
    } finally {
      setChatLoading(false);
    }
  }, [data, navigation, t]);

  // ─── Score helpers ─────────────────────────────────────────────────────
  const getScoreBadgeColor = useCallback(
    (score: number) => {
      if (score >= 9) return { bg: '#7C3AED20', text: '#7C3AED' };
      if (score >= 7) return { bg: colors.successBackground, text: colors.success };
      if (score >= 4) return { bg: colors.warningBackground, text: colors.warning };
      return { bg: colors.errorBackground, text: colors.error };
    },
    [colors],
  );

  const getScoreColor = (score: number): string => {
    if (score >= 8) return '#22C55E';
    if (score >= 6) return '#84CC16';
    if (score >= 4) return '#EAB308';
    if (score >= 2) return '#F97316';
    return '#EF4444';
  };

  const getScoreDot = (score: number): string => {
    if (score >= 8) return '🟢';
    if (score >= 6) return '🟡';
    if (score >= 4) return '🟡';
    if (score >= 2) return '🟠';
    return '🔴';
  };

  const getPriorityBadge = (priority: string) => {
    const p = (priority || '').toLowerCase().trim();
    if (p === 'high') return { emoji: '🔴', label: t('analyze.result.improvements.priority.high') };
    if (p === 'medium' || p === 'demium' || p === 'med') return { emoji: '🟡', label: t('analyze.result.improvements.priority.medium') };
    return { emoji: '⚪', label: t('analyze.result.improvements.priority.low') };
  };

  const translatePalette = (v: string) => {
    const map: Record<string, string> = { warm: t('analyze.result.paletteWarm'), cool: t('analyze.result.paletteCool'), neutral: t('analyze.result.paletteNeutral') };
    return map[v.toLowerCase()] ?? v;
  };
  const translateSeason = (v: string) => {
    const map: Record<string, string> = { spring: t('analyze.result.seasonSpring'), summer: t('analyze.result.seasonSummer'), autumn: t('analyze.result.seasonAutumn'), winter: t('analyze.result.seasonWinter') };
    return map[v.toLowerCase()] ?? v;
  };

  const renderBreakdownBar = (label: string, value: number) => {
    const barColor = getScoreColor(value);
    return (
      <View style={styles.breakdownRow} key={label}>
        <View style={styles.breakdownLabelRow}>
          <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{label}</Text>
        </View>
        <View style={styles.breakdownBarRow}>
          <View style={[styles.breakdownTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.breakdownFill,
                { width: `${Math.min(100, (value / 10) * 100)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>{value.toFixed(1)}</Text>
        </View>
      </View>
    );
  };

  // ─── Strength cards ────────────────────────────────────────────────────
  const [expandedStrengthIdx, setExpandedStrengthIdx] = useState<number | null>(null);
  const renderStrengthCard = ({ item, index }: { item: Strength; index: number }) => {
    const expanded = expandedStrengthIdx === index;
    return (
      <Pressable
        onPress={() => setExpandedStrengthIdx(expanded ? null : index)}
        style={[
          styles.strengthCard,
          {
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            width: expanded ? SCREEN_WIDTH - spacing.lg * 2 : STRENGTH_CARD_WIDTH,
          },
        ]}
      >
        <Text style={styles.strengthIcon}>✅</Text>
        <Text style={[styles.strengthTitle, { color: colors.text }]} numberOfLines={expanded ? undefined : 1}>
          {item.title}
        </Text>
        <Text style={[styles.strengthDesc, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 2}>
          {item.description}
        </Text>
      </Pressable>
    );
  };

  // ─── Loading / Error ───────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <Text style={{ fontSize: 48, marginBottom: spacing.lg }}>⚠️</Text>
        <Text style={[typography.body1, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl }]}>
          {t('screens.scanDetail.loadError')}
        </Text>
        <Button title={t('common.retry')} variant="outline" onPress={() => setError(false)} />
      </SafeAreaView>
    );
  }

  // ─── Analysis data ─────────────────────────────────────────────────────
  const { scan, detected_items } = data;
  const analysis: RichAnalysis | null = scan.analysis && typeof scan.analysis !== 'string' ? scan.analysis as RichAnalysis : null;
  const displayScore = scan.score ?? analysis?.score;
  const scoreLabel = analysis?.score_label ?? '';
  const scoreSummary = analysis?.score_summary ?? '';
  const breakdown = analysis?.score_breakdown;
  const strengths = analysis?.strengths ?? [];
  const colorAnalysis = analysis?.color_analysis;
  const styleLevel = analysis?.style_level;
  const occasionAssessment = analysis?.occasion_assessment;
  const improvements = analysis?.improvements ?? [];
  const climateAssessment = analysis?.climate_assessment;
  const scoreBadge = displayScore != null ? getScoreBadgeColor(displayScore) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo */}
        {scan.image_url && (
          <View style={styles.thumbnailContainer}>
            <Image source={{ uri: scan.image_url }} style={styles.thumbnail} resizeMode="cover" />
          </View>
        )}

        {/* Section 1: Score Hero */}
        {displayScore != null && (
          <LinearGradient
            colors={[colors.primaryDark + '18', colors.primary + '10', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scoreHeroCard}
          >
            <View style={styles.scoreHeroRow}>
              <Text style={[styles.scoreNumber, { color: scoreBadge?.text ?? colors.primary }]}>
                {displayScore.toFixed ? displayScore.toFixed(1) : displayScore}
              </Text>
              <Text style={[styles.scoreOutOf, { color: colors.textTertiary }]}>/10</Text>
            </View>
            {scoreLabel !== '' && scoreBadge && (
              <View style={[styles.scoreLabelBadge, { backgroundColor: scoreBadge.bg }]}>
                <Text style={[styles.scoreLabelText, { color: scoreBadge.text }]}>{scoreLabel}</Text>
              </View>
            )}
            {scoreSummary !== '' && (
              <Text style={[styles.scoreSummary, { color: colors.textSecondary }]}>{scoreSummary}</Text>
            )}
            {breakdown && (
              <View style={styles.breakdownContainer}>
                {renderBreakdownBar(t('analyze.result.breakdown.colorHarmony'), breakdown.color_harmony)}
                {renderBreakdownBar(t('analyze.result.breakdown.styleBalance'), breakdown.style_balance)}
                {renderBreakdownBar(t('analyze.result.breakdown.occasionFit'), breakdown.occasion_fit)}
                {renderBreakdownBar(t('analyze.result.breakdown.cohesion'), breakdown.overall_cohesion)}
              </View>
            )}
          </LinearGradient>
        )}

        {/* Section 2: Strengths */}
        {strengths.length > 0 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('analyze.result.strengths.title')}</Text>
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

        {/* Section 3: Color Analysis */}
        {colorAnalysis && (
          <View style={[styles.resultCard, { borderWidth: 1, borderColor: colors.border }]}>
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
                    {t('analyze.result.palette')}: {translatePalette(colorAnalysis.palette_type)}
                  </Text>
                </View>
              )}
              {colorAnalysis.season && (
                <View style={[styles.badge, { backgroundColor: colors.secondaryLight }]}>
                  <Text style={[styles.badgeText, { color: colors.text }]}>
                    {t('analyze.result.season')}: {translateSeason(colorAnalysis.season)}
                  </Text>
                </View>
              )}
            </View>
            {colorAnalysis.harmony_score != null && (
              <View style={styles.harmonyRow}>
                <Text style={[styles.harmonyLabel, { color: colors.textSecondary }]}>{t('analyze.result.harmony')}:</Text>
                <Text style={[styles.harmonyScore, { color: colors.primary }]}>{colorAnalysis.harmony_score}{t('analyze.result.outOf')}</Text>
                {colorAnalysis.harmony_feedback && (
                  <Text style={[styles.harmonyFeedback, { color: colors.textSecondary }]}> — {colorAnalysis.harmony_feedback}</Text>
                )}
              </View>
            )}
            {colorAnalysis.suggestions && colorAnalysis.suggestions.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.resultCardSubtitle}>{t('analyze.result.suggestions')}</Text>
                {colorAnalysis.suggestions.map((s, i) => (
                  <Text key={i} style={[styles.suggestionItem, { color: colors.text }]}>• {s}</Text>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Section 4: Style Level */}
        {styleLevel && (
          <View style={[styles.resultCard, { borderWidth: 1, borderColor: colors.border }]}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.styleLevel.title')}</Text>
            <Text style={[styles.styleLevelDetected, { color: colors.primary }]}>{styleLevel.detected}</Text>
            <View style={styles.formalityContainer}>
              <Text style={[styles.formalityLabel, { color: colors.textSecondary }]}>{t('analyze.result.styleLevel.formality')}</Text>
              <View style={[styles.formalityTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.formalityMarker, { left: `${Math.min(100, Math.max(0, (styleLevel.formality_score / 10) * 100))}%`, backgroundColor: colors.primary }]} />
              </View>
              <View style={styles.formalityLabelsRow}>
                <Text style={[styles.formalityEndLabel, { color: colors.textTertiary }]}>{t('analyze.result.styleLevel.casual')}</Text>
                <Text style={[styles.formalityEndLabel, { color: colors.textTertiary }]}>{t('analyze.result.styleLevel.formal')}</Text>
              </View>
            </View>
            {styleLevel.balance_note !== '' && (
              <Text style={[styles.balanceNote, { color: colors.textSecondary }]}>{styleLevel.balance_note}</Text>
            )}
          </View>
        )}

        {/* Section 5: Occasion Assessment */}
        {occasionAssessment && (
          <View style={[styles.resultCard, { borderWidth: 1, borderColor: colors.border }]}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.occasion.title')}</Text>
            <View style={styles.verdictRow}>
              <View style={[styles.verdictBadge, { backgroundColor: getScoreColor(occasionAssessment.fit_score) + '20' }]}>
                <Text style={styles.verdictEmoji}>{getScoreDot(occasionAssessment.fit_score)}</Text>
                <Text style={[styles.verdictScore, { color: getScoreColor(occasionAssessment.fit_score) }]}>{occasionAssessment.fit_score.toFixed(1)}/10</Text>
              </View>
              <Text style={[styles.verdictText, { color: colors.text }]}>{occasionAssessment.verdict}</Text>
            </View>
            {occasionAssessment.verdict_note !== '' && (
              <Text style={[styles.verdictNote, { color: colors.textSecondary }]}>{occasionAssessment.verdict_note}</Text>
            )}
            {occasionAssessment.would_work_for.length > 0 && (
              <View style={styles.chipsSection}>
                <Text style={[styles.chipsLabel, { color: colors.textSecondary }]}>{t('analyze.result.occasion.worksFor')}</Text>
                <View style={styles.chipsRow}>
                  {occasionAssessment.would_work_for.map((item, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: colors.successBackground, borderWidth: 1, borderColor: colors.success + '30' }]}>
                      <Text style={[styles.chipText, { color: colors.success }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            {occasionAssessment.would_not_work_for.length > 0 && (
              <View style={styles.chipsSection}>
                <Text style={[styles.chipsLabel, { color: colors.textSecondary }]}>{t('analyze.result.occasion.doesntWorkFor')}</Text>
                <View style={styles.chipsRow}>
                  {occasionAssessment.would_not_work_for.map((item, i) => (
                    <View key={i} style={[styles.chip, { backgroundColor: colors.errorBackground, borderWidth: 1, borderColor: colors.error + '30' }]}>
                      <Text style={[styles.chipText, { color: colors.error }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Section 6: Improvements */}
        {improvements.length > 0 && (
          <View style={[styles.resultCard, { borderWidth: 1, borderColor: colors.border }]}>
            <Text style={styles.resultCardTitle}>{t('analyze.result.improvements.title')}</Text>
            {improvements.map((imp, i) => {
              const badge = getPriorityBadge(imp.priority);
              const priorityColor = imp.priority === 'high' ? colors.error : imp.priority === 'medium' ? colors.warning : colors.textTertiary;
              return (
                <View key={i} style={[styles.improvementCard, { borderColor: colors.border, borderLeftWidth: 4, borderLeftColor: priorityColor }]}>
                  <View style={styles.improvementHeader}>
                    <Text style={{ fontSize: 14 }}>{badge.emoji}</Text>
                    <Text style={[styles.improvementPriorityLabel, { color: colors.textSecondary }]}>{badge.label}</Text>
                    <Text style={[styles.improvementArea, { color: colors.text }]}>{imp.area}</Text>
                  </View>
                  <Text style={[styles.improvementSuggestion, { color: colors.text }]}>{imp.suggestion}</Text>
                  {imp.impact !== '' && (
                    <Text style={[styles.improvementImpact, { color: colors.accent }]}>{t('analyze.result.improvements.impact')}: {imp.impact}</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Detected Items (Feature 2 integration) */}
        {detected_items.length > 0 && (
          <DetectedItemsList detectedItems={detected_items} />
        )}

        {/* Section 7: Climate */}
        {climateAssessment && (
          <View style={[styles.resultCard, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
            <View style={styles.climateHeaderRow}>
              <Text style={{ fontSize: 22 }}>🌤️</Text>
              <Text style={styles.resultCardTitle}>{t('analyze.result.climate.title')}</Text>
            </View>
            <View style={styles.climateRow}>
              <Text style={[styles.climateScore, { color: getScoreColor(climateAssessment.fit_score) }]}>
                {getScoreDot(climateAssessment.fit_score)} {climateAssessment.fit_score.toFixed(1)}/10
              </Text>
              <Text style={[styles.climateNote, { color: colors.textSecondary }]}>{climateAssessment.note}</Text>
            </View>
            {climateAssessment.risk != null && climateAssessment.risk !== '' && (
              <View style={[styles.climateRisk, { backgroundColor: colors.warningBackground }]}>
                <Text style={[styles.climateRiskText, { color: colors.warning }]}>⚠️ {t('analyze.result.climate.risk')}: {climateAssessment.risk}</Text>
              </View>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonGroup}>
          <Button
            title={t('screens.scanDetail.chatAbout')}
            variant="primary"
            onPress={handleStartChat}
            loading={chatLoading}
            disabled={chatLoading}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: spacing.xl },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xxxl, alignItems: 'center' },

    thumbnailContainer: { width: '100%', aspectRatio: 3 / 4, maxHeight: 360, borderRadius: borderRadius.lg, overflow: 'hidden', marginBottom: spacing.xxl, borderWidth: 2, borderColor: colors.border, ...shadows.md },
    thumbnail: { width: '100%', height: '100%' },

    // Score Hero
    scoreHeroCard: { width: '100%', borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.border, ...shadows.md, overflow: 'hidden' },
    scoreHeroRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.sm },
    scoreNumber: { fontSize: 56, fontWeight: '800', letterSpacing: -1 },
    scoreOutOf: { ...typography.h3, fontWeight: '400' },
    scoreLabelBadge: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: borderRadius.full, alignSelf: 'center', marginBottom: spacing.md },
    scoreLabelText: { ...typography.subtitle2, fontWeight: '700' },
    scoreSummary: { ...typography.body1, textAlign: 'center', fontStyle: 'italic', marginBottom: spacing.xl },
    breakdownContainer: { gap: spacing.md },
    breakdownRow: { marginBottom: spacing.xxs },
    breakdownLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs },
    breakdownLabel: { ...typography.caption, fontWeight: '600' },
    breakdownBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    breakdownValue: { ...typography.caption, fontWeight: '700', minWidth: 28, textAlign: 'right' },
    breakdownTrack: { flex: 1, height: 8, borderRadius: borderRadius.full, overflow: 'hidden' },
    breakdownFill: { height: '100%', borderRadius: borderRadius.full },

    // Strengths
    sectionContainer: { width: '100%', marginBottom: spacing.md },
    sectionTitle: { ...typography.subtitle1, fontWeight: '700', marginBottom: spacing.md, paddingHorizontal: spacing.xs },
    strengthListContent: { paddingRight: spacing.lg },
    strengthCard: { width: STRENGTH_CARD_WIDTH, borderRadius: borderRadius.lg, padding: spacing.xl, marginRight: spacing.md, minHeight: 130, ...shadows.sm },
    strengthIcon: { fontSize: 20, marginBottom: spacing.xs },
    strengthTitle: { ...typography.subtitle2, fontWeight: '700', marginBottom: spacing.xxs },
    strengthDesc: { ...typography.body2 },

    // Result card generic
    resultCard: { width: '100%', backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.xl, marginBottom: spacing.xl, ...shadows.sm },
    resultCardTitle: { ...typography.subtitle1, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
    resultCardSubtitle: { ...typography.subtitle2, color: colors.text, marginBottom: spacing.sm, marginTop: spacing.md },
    suggestionItem: { ...typography.body2, marginBottom: spacing.xs },

    // Color
    swatchRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
    swatch: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: colors.surface, ...shadows.sm },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
    badge: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
    badgeText: { ...typography.caption, fontWeight: '700', textTransform: 'capitalize' },
    harmonyRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: spacing.sm },
    harmonyLabel: { ...typography.body2 },
    harmonyScore: { ...typography.body2, fontWeight: '700', marginLeft: spacing.xs },
    harmonyFeedback: { ...typography.body2 },

    // Style Level
    styleLevelDetected: { ...typography.h3, fontWeight: '700', marginBottom: spacing.md },
    formalityContainer: { marginBottom: spacing.md },
    formalityLabel: { ...typography.caption, marginBottom: spacing.xs },
    formalityTrack: { height: 10, borderRadius: borderRadius.full, position: 'relative' },
    formalityMarker: { position: 'absolute', top: -3, width: 16, height: 16, borderRadius: 8, marginLeft: -8, ...shadows.sm },
    formalityLabelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    formalityEndLabel: { ...typography.caption, fontWeight: '600' },
    balanceNote: { ...typography.body2, fontStyle: 'italic' },

    // Occasion
    verdictRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    verdictBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
    verdictEmoji: { fontSize: 18 },
    verdictText: { ...typography.subtitle1, fontWeight: '700', flex: 1 },
    verdictScore: { ...typography.subtitle2, fontWeight: '800' },
    verdictNote: { ...typography.body2, marginBottom: spacing.md },
    chipsSection: { marginBottom: spacing.sm },
    chipsLabel: { ...typography.caption, fontWeight: '600', marginBottom: spacing.xs },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.full },
    chipText: { ...typography.caption, fontWeight: '600' },

    // Improvements
    improvementCard: { borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.surface },
    improvementHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
    improvementPriorityLabel: { ...typography.caption, fontWeight: '600', textTransform: 'uppercase' },
    improvementArea: { ...typography.subtitle2, fontWeight: '700' },
    improvementSuggestion: { ...typography.body2, marginBottom: spacing.xxs },
    improvementImpact: { ...typography.caption, fontStyle: 'italic' },

    // Climate
    climateHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
    climateRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    climateScore: { ...typography.h3, fontWeight: '700' },
    climateNote: { ...typography.body2, flex: 1 },
    climateRisk: { marginTop: spacing.sm, padding: spacing.md, borderRadius: borderRadius.md },
    climateRiskText: { ...typography.body2, fontWeight: '600' },

    // Buttons
    buttonGroup: { width: '100%', gap: spacing.md, marginTop: spacing.lg },
    actionButton: { width: '100%' },
  });
