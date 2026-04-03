/**
 * DressGenius — Monthly Report Screen
 * Full report for a specific month with highlights and comparison.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Button } from '../components/Button';
import { typography } from '../theme/typography';
import { spacing, borderRadius } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'MonthlyReport'>;

interface ReportData {
  year: number;
  month: number;
  total_analyses: number;
  avg_score: number;
  top_color: string | null;
  dominant_style: string | null;
  highlights: string[];
  comparison: {
    score_diff: string;
    count_diff: string;
    prev_avg_score: number;
    prev_count: number;
  };
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function MonthlyReportScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [year, setYear] = useState(route.params.year);
  const [month, setMonth] = useState(route.params.month);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  const fetchReport = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError(false);
    try {
      const res = await api.get(`/analytics/monthly-report/${y}/${m}`);
      setData(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(year, month);
  }, [year, month, fetchReport]);

  const goToPrev = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else { setMonth(m => m - 1); }
  };

  const goToNext = () => {
    const now = new Date();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    if (nextYear > now.getFullYear() || (nextYear === now.getFullYear() && nextMonth > now.getMonth() + 1)) return;
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backButton}>←</Text>
        </Pressable>
        <View style={styles.monthNav}>
          <Pressable onPress={goToPrev} hitSlop={12}>
            <Text style={styles.navArrow}>◀</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable onPress={goToNext} hitSlop={12}>
            <Text style={styles.navArrow}>▶</Text>
          </Pressable>
        </View>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorEmoji}>⚠️</Text>
          <Text style={styles.errorText}>{t('common.error')}</Text>
          <Button title={t('common.retry')} variant="outline" onPress={() => fetchReport(year, month)} />
        </View>
      ) : data && data.total_analyses === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📅</Text>
          <Text style={styles.emptyText}>{t('analytics.monthly.noData')}</Text>
        </View>
      ) : data ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Score */}
          <View style={styles.card}>
            <Text style={styles.bigScore}>{data.avg_score}</Text>
            <Text style={styles.scoreLabel}>{t('analytics.monthly.avgScore')}</Text>
            <Text style={[styles.trend, { color: data.comparison.score_diff.startsWith('+') ? colors.success : data.comparison.score_diff === '+0' || data.comparison.score_diff === '0' ? colors.textTertiary : colors.error }]}>
              {data.comparison.score_diff} {t('analytics.monthly.vsLastMonth')}
            </Text>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.total_analyses}</Text>
              <Text style={styles.statLabel}>{t('analytics.monthly.analyses')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.top_color ?? '—'}</Text>
              <Text style={styles.statLabel}>{t('analytics.monthly.topColor')}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{data.dominant_style ? data.dominant_style.charAt(0).toUpperCase() + data.dominant_style.slice(1) : '—'}</Text>
              <Text style={styles.statLabel}>{t('analytics.monthly.dominantStyle')}</Text>
            </View>
          </View>

          {/* Highlights */}
          {data.highlights.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('analytics.monthly.highlights')}</Text>
              {data.highlights.map((h, i) => (
                <Text key={i} style={styles.highlight}>✦ {h}</Text>
              ))}
            </View>
          )}

          {/* Comparison */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>{t('analytics.monthly.comparison')}</Text>
            <Text style={styles.compText}>
              {t('analytics.monthly.analyses')}: {data.comparison.count_diff} {t('analytics.monthly.vsLastMonth')}
            </Text>
            <Text style={styles.compText}>
              Score: {data.comparison.score_diff} {t('analytics.monthly.vsLastMonth')}
            </Text>
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorScheme) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    backButton: { fontSize: 24, color: colors.text },
    monthNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
    navArrow: { fontSize: 16, color: colors.primary, paddingHorizontal: spacing.sm },
    monthLabel: { ...typography.h3, color: colors.text },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.lg, ...shadows.md },
    bigScore: { fontSize: 48, fontWeight: '700', color: colors.primary, textAlign: 'center' },
    scoreLabel: { ...typography.body2, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
    trend: { ...typography.subtitle2, textAlign: 'center', marginTop: spacing.sm },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
    statBox: { flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center', ...shadows.sm },
    statValue: { ...typography.subtitle1, color: colors.text },
    statLabel: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
    sectionTitle: { ...typography.subtitle2, color: colors.text, marginBottom: spacing.md },
    highlight: { ...typography.body2, color: colors.textSecondary, marginBottom: spacing.sm },
    compText: { ...typography.body2, color: colors.textSecondary, marginBottom: spacing.xs },
    errorEmoji: { fontSize: 48, marginBottom: spacing.md },
    errorText: { ...typography.body1, color: colors.textSecondary, marginBottom: spacing.lg },
    emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
    emptyText: { ...typography.body1, color: colors.textSecondary },
  });
}
