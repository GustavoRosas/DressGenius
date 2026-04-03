/**
 * DressGenius — Analytics Screen
 *
 * Style DNA overview with score trends, color palette breakdown,
 * closet intelligence, premium blur for free users, and empty state.
 */

import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LineChart, BarChart } from 'react-native-gifted-charts';

import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { palette, type ColorScheme } from '../theme/colors';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import type { RootStackParamList } from '../navigation/types';
import type {
  StyleBreakdown,
  ScoreTrend,
  ColorBreakdown,
  ClosetIntelligence,
  ClosetItem,
} from '../hooks/useAnalytics';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Main Component ──────────────────────────────────────────────────────────

export function AnalyticsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { isPremium } = usePremium();
  const navigation = useNavigation<Nav>();
  const {
    summary,
    scoreTrend,
    colorBreakdown,
    closetIntelligence,
    loading,
    error,
    hasEnoughData,
    refetch,
  } = useAnalytics();

  const styles = useMemo(() => createStyles(colors), [colors]);

  // ── Loading State ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error State ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>😵</Text>
          <Text style={styles.errorText}>{t('errors.generic')}</Text>
          <Pressable style={styles.retryButton} onPress={refetch}>
            <Text style={styles.retryText}>{t('common.retry')}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const navigateToPaywall = () => navigation.navigate('Paywall');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.screenTitle}>{t('analytics.title')}</Text>

        {/* Section 1 — Style DNA (always visible) */}
        {summary && (
          <StyleDNACard
            summary={summary}
            colors={colors}
            isDark={isDark}
            t={t}
          />
        )}

        {/* Empty State */}
        {!hasEnoughData && (
          <EmptyState
            totalAnalyses={summary?.totalAnalyses ?? 0}
            colors={colors}
            t={t}
          />
        )}

        {/* Sections 2-4 — Premium-gated */}
        {hasEnoughData && (
          <>
            {/* Section 2 — Score Trend */}
            <PremiumGate
              isPremium={isPremium}
              onUnlock={navigateToPaywall}
              colors={colors}
              t={t}
            >
              {scoreTrend && (
                <ScoreTrendSection
                  data={scoreTrend}
                  colors={colors}
                  t={t}
                />
              )}
            </PremiumGate>

            {/* Section 3 — Color Palette */}
            <PremiumGate
              isPremium={isPremium}
              onUnlock={navigateToPaywall}
              colors={colors}
              t={t}
            >
              {colorBreakdown && (
                <ColorPaletteSection
                  data={colorBreakdown}
                  colors={colors}
                  t={t}
                />
              )}
            </PremiumGate>

            {/* Section 4 — Closet Intelligence */}
            <PremiumGate
              isPremium={isPremium}
              onUnlock={navigateToPaywall}
              colors={colors}
              t={t}
            >
              {closetIntelligence && (
                <ClosetIntelligenceSection
                  data={closetIntelligence}
                  colors={colors}
                  t={t}
                />
              )}
            </PremiumGate>
          </>
        )}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Section 1: Style DNA Card ───────────────────────────────────────────────

interface StyleDNAProps {
  summary: { emoji: string; label: string; breakdowns: StyleBreakdown[] };
  colors: ColorScheme;
  isDark: boolean;
  t: (key: string) => string;
}

function StyleDNACard({ summary, colors, isDark, t }: StyleDNAProps) {
  const gradientColors: [string, string] = isDark
    ? [palette.violet800, '#9F1239']
    : [palette.violet500, '#F43F5E'];

  return (
    <View style={[sectionCard(colors), { overflow: 'hidden', padding: 0 }]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={dnaStyles.gradient}
      >
        <Text style={dnaStyles.emoji}>{summary.emoji}</Text>
        <Text style={dnaStyles.label}>{summary.label}</Text>
        <Text style={dnaStyles.sectionLabel}>{t('analytics.styleDna.title')}</Text>

        {summary.breakdowns.map((b) => (
          <View key={b.label} style={dnaStyles.barRow}>
            <Text style={dnaStyles.barLabel}>{b.label}</Text>
            <View style={dnaStyles.barTrack}>
              <View
                style={[
                  dnaStyles.barFill,
                  { width: `${Math.min(b.percentage, 100)}%` },
                ]}
              />
            </View>
            <Text style={dnaStyles.barPct}>{b.percentage}%</Text>
          </View>
        ))}
      </LinearGradient>
    </View>
  );
}

const dnaStyles = StyleSheet.create({
  gradient: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.h3,
    color: palette.neutral0,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  sectionLabel: {
    ...typography.overline,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.lg,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.sm,
  },
  barLabel: {
    ...typography.caption,
    color: palette.neutral0,
    width: 70,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: spacing.sm,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.neutral0,
  },
  barPct: {
    ...typography.caption,
    color: palette.neutral0,
    width: 40,
    textAlign: 'right',
  },
});

// ── Section 2: Score Trend ──────────────────────────────────────────────────

interface ScoreTrendProps {
  data: ScoreTrend;
  colors: ColorScheme;
  t: (key: string, opts?: Record<string, string | number>) => string;
}

function ScoreTrendSection({ data, colors, t }: ScoreTrendProps) {
  const lineData = data.points.map((p) => ({
    value: p.score,
    label: p.week,
    dataPointText: p.score.toFixed(1),
  }));

  const trendArrow = data.trend >= 0 ? '↑' : '↓';
  const trendSign = data.trend >= 0 ? '+' : '';

  return (
    <View style={sectionCard(colors)}>
      <Text style={sectionTitle(colors)}>{t('analytics.scoreTrend.title')}</Text>

      {/* Avg + Trend Badge */}
      <View style={trendStyles.badges}>
        <View style={[trendStyles.badge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[trendStyles.badgeText, { color: colors.primary }]}>
            {t('analytics.scoreTrend.overall')}: {data.average.toFixed(1)}
          </Text>
        </View>
        <View
          style={[
            trendStyles.badge,
            {
              backgroundColor:
                data.trend >= 0 ? colors.successBackground : colors.errorBackground,
            },
          ]}
        >
          <Text
            style={[
              trendStyles.badgeText,
              { color: data.trend >= 0 ? colors.success : colors.error },
            ]}
          >
            {trendArrow} {trendSign}{data.trend.toFixed(1)}
          </Text>
        </View>
      </View>

      {/* Chart */}
      <View style={trendStyles.chartWrap}>
        <LineChart
          data={lineData}
          width={280}
          height={160}
          spacing={36}
          color={colors.primary}
          thickness={2}
          dataPointsColor={colors.primary}
          dataPointsRadius={4}
          startFillColor={colors.primary}
          endFillColor={colors.surface}
          startOpacity={0.3}
          endOpacity={0.05}
          areaChart
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          yAxisTextStyle={{ ...typography.caption, color: colors.textSecondary }}
          xAxisLabelTextStyle={{ ...typography.caption, color: colors.textTertiary, fontSize: 9 }}
          maxValue={10}
          noOfSections={5}
          hideDataPoints={false}
          curved
          rulesColor={colors.divider}
        />
      </View>
    </View>
  );
}

const trendStyles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
  chartWrap: {
    alignItems: 'center',
    overflow: 'hidden',
  },
});

// ── Section 3: Color Palette ────────────────────────────────────────────────

interface ColorPaletteProps {
  data: ColorBreakdown;
  colors: ColorScheme;
  t: (key: string) => string;
}

function ColorPaletteSection({ data, colors, t }: ColorPaletteProps) {
  const maxPct = Math.max(...data.colors.map((c) => c.percentage), 1);

  return (
    <View style={sectionCard(colors)}>
      <Text style={sectionTitle(colors)}>{t('analytics.colors.title')}</Text>

      {/* Dominant badge */}
      <View
        style={[
          colorStyles.domBadge,
          { backgroundColor: colors.primaryLight },
        ]}
      >
        <Text style={[colorStyles.domText, { color: colors.primary }]}>
          {data.dominantTone} ({data.dominantPercentage}%)
        </Text>
      </View>

      {/* Color circles */}
      <View style={colorStyles.circles}>
        {data.colors.map((c) => (
          <View key={c.hex} style={colorStyles.circleWrap}>
            <View
              style={[
                colorStyles.circle,
                { backgroundColor: c.hex, borderColor: colors.border },
              ]}
            />
            <Text
              style={[colorStyles.circleLabel, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {c.name}
            </Text>
          </View>
        ))}
      </View>

      {/* Horizontal bar breakdown */}
      {data.colors.map((c) => (
        <View key={c.hex + '-bar'} style={colorStyles.barRow}>
          <View
            style={[
              colorStyles.barDot,
              { backgroundColor: c.hex, borderColor: colors.border },
            ]}
          />
          <Text
            style={[colorStyles.barName, { color: colors.text }]}
            numberOfLines={1}
          >
            {c.name}
          </Text>
          <View style={[colorStyles.barTrack, { backgroundColor: colors.divider }]}>
            <View
              style={[
                colorStyles.barFill,
                {
                  backgroundColor: c.hex,
                  width: `${(c.percentage / maxPct) * 100}%`,
                },
              ]}
            />
          </View>
          <Text style={[colorStyles.barPct, { color: colors.textSecondary }]}>
            {c.percentage}%
          </Text>
        </View>
      ))}
    </View>
  );
}

const colorStyles = StyleSheet.create({
  domBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
  domText: {
    ...typography.caption,
    fontWeight: '600',
  },
  circles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
    marginBottom: spacing.xl,
    justifyContent: 'center',
  },
  circleWrap: {
    alignItems: 'center',
    width: 52,
  },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    marginBottom: spacing.xs,
  },
  circleLabel: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  barDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  barName: {
    ...typography.caption,
    width: 65,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    marginHorizontal: spacing.sm,
  },
  barFill: {
    height: 8,
    borderRadius: 4,
  },
  barPct: {
    ...typography.caption,
    width: 36,
    textAlign: 'right',
  },
});

// ── Section 4: Closet Intelligence ──────────────────────────────────────────

interface ClosetIntelProps {
  data: ClosetIntelligence;
  colors: ColorScheme;
  t: (key: string) => string;
}

function ClosetIntelligenceSection({ data, colors, t }: ClosetIntelProps) {
  const barData = data.categories.map((cat, i) => ({
    value: cat.count,
    label: cat.category,
    frontColor: [colors.primary, colors.secondary, colors.accent, palette.green500, palette.amber500][
      i % 5
    ],
  }));

  return (
    <View style={sectionCard(colors)}>
      <Text style={sectionTitle(colors)}>{t('analytics.closet.title')}</Text>

      {/* Bar chart */}
      <View style={closetStyles.chartWrap}>
        <BarChart
          data={barData}
          width={280}
          height={140}
          barWidth={28}
          spacing={20}
          noOfSections={4}
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          yAxisTextStyle={{ ...typography.caption, color: colors.textSecondary }}
          xAxisLabelTextStyle={{ ...typography.caption, color: colors.textTertiary, fontSize: 9 }}
          rulesColor={colors.divider}
          isAnimated
        />
      </View>

      {/* Gap alerts */}
      {data.gaps.map((gap, i) => (
        <View
          key={i}
          style={[closetStyles.gapCard, { backgroundColor: colors.warningBackground }]}
        >
          <Text style={[closetStyles.gapText, { color: colors.warning }]}>
            ⚠️ {gap.message}
          </Text>
        </View>
      ))}

      {/* Unused items */}
      {data.unusedItems.length > 0 && (
        <>
          <Text style={[closetStyles.subTitle, { color: colors.text }]}>
            {t('analytics.closet.unused')}
          </Text>
          {data.unusedItems.map((item) => (
            <UnusedItemRow key={item.id} item={item} colors={colors} t={t} />
          ))}
        </>
      )}

      {/* Most worn */}
      {data.mostWorn.length > 0 && (
        <>
          <Text style={[closetStyles.subTitle, { color: colors.text }]}>
            {t('analytics.closet.mostWorn')}
          </Text>
          {data.mostWorn.map((item, i) => (
            <View key={item.id} style={closetStyles.wornRow}>
              <Text style={[closetStyles.wornRank, { color: colors.primary }]}>
                #{i + 1}
              </Text>
              <Text
                style={[closetStyles.wornName, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text style={[closetStyles.wornCount, { color: colors.textSecondary }]}>
                {item.timesWorn}×
              </Text>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

function UnusedItemRow({
  item,
  colors,
  t,
}: {
  item: ClosetItem;
  colors: ColorScheme;
  t: (key: string) => string;
}) {
  return (
    <View style={closetStyles.unusedRow}>
      <View style={{ flex: 1 }}>
        <Text style={[closetStyles.unusedName, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[closetStyles.unusedCat, { color: colors.textTertiary }]}>
          {item.category}
        </Text>
      </View>
      <View style={[closetStyles.donateBadge, { backgroundColor: colors.accent + '20' }]}>
        <Text style={[closetStyles.donateText, { color: colors.accent }]}>
          {t('analytics.closet.donate')}
        </Text>
      </View>
    </View>
  );
}

const closetStyles = StyleSheet.create({
  chartWrap: {
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  gapCard: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  gapText: {
    ...typography.body2,
    fontWeight: '500',
  },
  subTitle: {
    ...typography.subtitle2,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  unusedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  unusedName: {
    ...typography.body2,
  },
  unusedCat: {
    ...typography.caption,
  },
  donateBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  donateText: {
    ...typography.caption,
    fontWeight: '600',
  },
  wornRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  wornRank: {
    ...typography.subtitle2,
    width: 30,
  },
  wornName: {
    ...typography.body2,
    flex: 1,
  },
  wornCount: {
    ...typography.body2,
    fontWeight: '600',
  },
});

// ── Empty State ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  totalAnalyses: number;
  colors: ColorScheme;
  t: (key: string, opts?: Record<string, string | number>) => string;
}

function EmptyState({ totalAnalyses, colors, t }: EmptyStateProps) {
  return (
    <View style={sectionCard(colors)}>
      <View style={emptyStyles.container}>
        <Text style={emptyStyles.icon}>📊</Text>
        <Text style={[emptyStyles.title, { color: colors.text }]}>
          {t('analytics.empty.title')}
        </Text>
        <Text style={[emptyStyles.subtitle, { color: colors.textSecondary }]}>
          {t('analytics.empty.subtitle')}
        </Text>
        <View style={[emptyStyles.progress, { backgroundColor: colors.divider }]}>
          <View
            style={[
              emptyStyles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${Math.min((totalAnalyses / 3) * 100, 100)}%`,
              },
            ]}
          />
        </View>
        <Text style={[emptyStyles.needMore, { color: colors.textTertiary }]}>
          {t('analytics.empty.needMore', { count: totalAnalyses, needed: 3 })}
        </Text>

        {/* Placeholder preview cards */}
        <View style={emptyStyles.previews}>
          {['📈', '🎨', '👗'].map((emoji) => (
            <View
              key={emoji}
              style={[emptyStyles.previewCard, { backgroundColor: colors.divider + '40' }]}
            >
              <Text style={emptyStyles.previewEmoji}>{emoji}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body2,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  progress: {
    width: '60%',
    height: 6,
    borderRadius: 3,
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  needMore: {
    ...typography.caption,
    marginBottom: spacing.xl,
  },
  previews: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  previewCard: {
    width: 72,
    height: 72,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 28,
    opacity: 0.5,
  },
});

// ── Premium Gate ────────────────────────────────────────────────────────────

interface PremiumGateProps {
  isPremium: boolean;
  onUnlock: () => void;
  colors: ColorScheme;
  t: (key: string) => string;
  children: React.ReactNode;
}

function PremiumGate({ isPremium, onUnlock, colors, t, children }: PremiumGateProps) {
  if (isPremium) {
    return <>{children}</>;
  }

  return (
    <Pressable onPress={onUnlock}>
      <View style={{ position: 'relative' }}>
        {/* Render children with reduced opacity */}
        <View style={{ opacity: 0.25 }} pointerEvents="none">
          {children}
        </View>

        {/* Blur overlay */}
        <View
          style={[
            gateStyles.overlay,
            { backgroundColor: colors.surface + 'CC' },
          ]}
        >
          <Text style={gateStyles.lockIcon}>🔒</Text>
          <Text style={[gateStyles.lockLabel, { color: colors.text }]}>
            {t('analytics.premium.locked')}
          </Text>
          <View style={[gateStyles.unlockBtn, { backgroundColor: colors.primary }]}>
            <Text style={[gateStyles.unlockText, { color: colors.textInverse }]}>
              {t('analytics.premium.unlock')}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const gateStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: {
    fontSize: 36,
    marginBottom: spacing.sm,
  },
  lockLabel: {
    ...typography.subtitle2,
    marginBottom: spacing.md,
  },
  unlockBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
  },
  unlockText: {
    ...typography.button,
  },
});

// ── Shared helpers ──────────────────────────────────────────────────────────

function sectionCard(colors: ColorScheme) {
  return {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadows.md,
  } as const;
}

function sectionTitle(colors: ColorScheme) {
  return {
    ...typography.subtitle1,
    color: colors.text,
    marginBottom: spacing.md,
  } as const;
}

// ── Root Styles ─────────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    screenTitle: {
      ...typography.h2,
      color: colors.text,
      marginBottom: spacing.xl,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    loadingText: {
      ...typography.body2,
      color: colors.textSecondary,
      marginTop: spacing.md,
    },
    errorEmoji: {
      fontSize: 48,
      marginBottom: spacing.md,
    },
    errorText: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    retryButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.xl,
    },
    retryText: {
      ...typography.button,
      color: colors.textInverse,
    },
  });
