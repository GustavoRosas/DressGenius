/**
 * DressGenius — Home Screen (Premium Redesign)
 *
 * Full dashboard: Header + Avatar, Hero Usage Card, Last Analysis,
 * Quick Actions, Style DNA Mini, Monthly Stats, Closet Peek,
 * Tip of the Day, PremiumBanner.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import { useAnalytics } from '../hooks/useAnalytics';
import { PremiumBanner } from '../components/PremiumBanner';
import { typography } from '../theme/typography';
import { borderRadius, spacing } from '../theme/spacing';
import { shadows } from '../theme/shadows';
import { palette } from '../theme/colors';
import type { RootStackParamList, TabParamList } from '../navigation/types';
import type { ColorScheme } from '../theme/colors';

// ── Constants ───────────────────────────────────────────────────────────────

const FREE_LIMIT = 5;

const STYLE_BAR_COLORS = [
  palette.violet500,
  palette.gold400,
  palette.coral400,
  palette.green500,
  palette.amber500,
  palette.violet300,
];

// ── Navigation type ─────────────────────────────────────────────────────────

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// ── API response types ──────────────────────────────────────────────────────

interface OutfitScan {
  id: number;
  occasion?: string | null;
  overall_score?: number | null;
  preview_image_url?: string | null;
  created_at: string;
}

interface OutfitScansResponse {
  data: OutfitScan[];
  meta?: { total?: number };
}

interface WardrobeItem {
  id: number;
  name: string;
  category: string;
  image_url?: string | null;
}

interface WardrobeResponse {
  data: WardrobeItem[];
  meta?: { total?: number };
}

// ── Tips ────────────────────────────────────────────────────────────────────

const TIPS_EN = [
  'Accessories can transform a basic outfit into something special. Try adding a statement necklace.',
  'When in doubt, monochrome outfits always look polished and intentional.',
  'Rolling your sleeves up instantly makes any outfit feel more relaxed and effortless.',
  'A well-fitted blazer elevates any casual look to smart casual in seconds.',
  'Mixing textures (knit + leather, silk + denim) adds depth without extra color.',
  'Your shoes set the tone — sneakers say casual, heels say elevated.',
  'A simple belt can define your waist and add structure to flowy outfits.',
  'Don\'t underestimate the power of a great bag — it ties the whole look together.',
  'Layering is key for transitional weather and adds visual interest.',
  'Neutral basics are your best investment — they pair with everything.',
  'Color blocking with complementary colors makes a bold, fashion-forward statement.',
  'When prints clash, keep one piece solid to balance the look.',
  'Tailored pieces always photograph better than oversized ones.',
  'A pop of color in your accessories can brighten a neutral outfit.',
  'Confidence is the best accessory — wear what makes you feel amazing.',
];

const TIPS_PT = [
  'Acessórios podem transformar um look básico em algo especial. Experimente adicionar um colar statement.',
  'Na dúvida, looks monocromáticos sempre parecem elegantes e intencionais.',
  'Dobrar as mangas instantaneamente deixa qualquer look mais descontraído.',
  'Um blazer bem ajustado eleva qualquer visual casual para smart casual em segundos.',
  'Misturar texturas (tricô + couro, seda + jeans) adiciona profundidade sem mais cores.',
  'Seus sapatos definem o tom — tênis dizem casual, saltos dizem sofisticado.',
  'Um cinto simples pode definir sua cintura e dar estrutura a looks fluidos.',
  'Não subestime o poder de uma boa bolsa — ela amarra todo o visual.',
  'Camadas são essenciais para climas de transição e adicionam interesse visual.',
  'Básicos neutros são seu melhor investimento — combinam com tudo.',
  'Color blocking com cores complementares faz um statement fashion ousado.',
  'Quando estampas conflitam, mantenha uma peça lisa para equilibrar.',
  'Peças sob medida sempre ficam melhores em fotos do que peças oversized.',
  'Um toque de cor nos acessórios ilumina um outfit neutro.',
  'Confiança é o melhor acessório — vista o que te faz sentir incrível.',
];

// ── Helpers ─────────────────────────────────────────────────────────────────

function getGreetingKey(): string {
  const h = new Date().getHours();
  if (h < 12) return 'home.greeting.morning';
  if (h < 18) return 'home.greeting.afternoon';
  return 'home.greeting.evening';
}

function formatDateLocalized(lang: string): string {
  const locale = lang.startsWith('pt') ? 'pt-BR' : 'en-US';
  return new Date().toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatRelative(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t('home.formatRelative.justNow');
  if (mins < 60) return t('home.formatRelative.minsAgo', { count: mins });
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 24) return t('home.formatRelative.hoursAgo', { count: hrs });
  const days = Math.floor(diff / 86400000);
  if (days === 1) return t('home.formatRelative.yesterday');
  return t('home.formatRelative.daysAgo', { count: days });
}

function getScoreColor(score: number): string {
  if (score >= 8) return palette.green500;
  if (score >= 6) return '#84CC16'; // lime
  if (score >= 4) return palette.amber500;
  if (score >= 2) return '#F97316'; // orange
  return palette.red500;
}

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Skeleton Placeholder ────────────────────────────────────────────────────

function SkeletonCard({ colors, height = 120 }: { colors: ColorScheme; height?: number }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        height,
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        marginBottom: spacing.lg,
        opacity,
      }}
    />
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const navigation = useNavigation<Nav>();
  const { summary, scoreTrend, refetch: refetchAnalytics } = useAnalytics();

  const [lastScan, setLastScan] = useState<OutfitScan | null>(null);
  const [monthlyUsage, setMonthlyUsage] = useState(0);
  const [wardrobeItems, setWardrobeItems] = useState<WardrobeItem[]>([]);
  const [wardrobeTotal, setWardrobeTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Hero card fade-in
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(20)).current;

  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPt = i18n.language.startsWith('pt');

  const fetchData = useCallback(async () => {
    try {
      const [scansRes, wardrobeRes] = await Promise.allSettled([
        api.get<OutfitScansResponse>('/outfit-scans', { params: { per_page: 1 } }),
        api.get<WardrobeResponse>('/wardrobe-items', { params: { limit: 5 } }),
      ]);

      if (scansRes.status === 'fulfilled') {
        const scansData = scansRes.value.data;
        const scans = scansData?.data ?? [];
        if (scans.length > 0) {
          setLastScan(scans[0]);
        }
        // Monthly usage from meta.total or from summary
        setMonthlyUsage(scansData?.meta?.total ?? summary?.totalAnalyses ?? 0);
      }

      if (wardrobeRes.status === 'fulfilled') {
        const wData = wardrobeRes.value.data;
        setWardrobeItems(wData?.data ?? []);
        setWardrobeTotal(wData?.meta?.total ?? wData?.data?.length ?? 0);
      }
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [summary?.totalAnalyses]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Animate hero card on mount
  useEffect(() => {
    if (!loading) {
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(heroTranslateY, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [loading, heroOpacity, heroTranslateY]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refetchAnalytics()]);
    setRefreshing(false);
  }, [fetchData, refetchAnalytics]);

  const userName = user?.name?.split(' ')[0] ?? '';
  const initials = getInitials(user?.name);
  const tipIndex = getDayOfYear() % TIPS_EN.length;
  const tip = isPt ? TIPS_PT[tipIndex] : TIPS_EN[tipIndex];
  const usageCount = summary?.totalAnalyses ?? monthlyUsage;
  const remaining = Math.max(0, FREE_LIMIT - usageCount);
  const progressPercent = isPremium ? 100 : Math.min(100, (usageCount / FREE_LIMIT) * 100);
  const avgScore = scoreTrend?.average ?? null;

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <SkeletonCard colors={colors} height={20} />
            </View>
          </View>
          <SkeletonCard colors={colors} height={140} />
          <SkeletonCard colors={colors} height={90} />
          <SkeletonCard colors={colors} height={80} />
          <SkeletonCard colors={colors} height={120} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ═══ 1. Header with Avatar ═══ */}
        <View style={styles.headerRow}>
          <LinearGradient
            colors={[palette.violet600, palette.violet800]}
            style={styles.avatarCircle}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>

          <View style={styles.headerInfo}>
            <Text style={styles.greeting} numberOfLines={1}>
              {t(getGreetingKey(), { name: userName })}
            </Text>
            <Text style={styles.date}>{formatDateLocalized(i18n.language)}</Text>
          </View>

          <Pressable style={styles.bellContainer}>
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.notifDot} />
          </Pressable>
        </View>

        {/* ═══ 2. Hero Card — Usage + CTA ═══ */}
        <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroTranslateY }] }}>
          <LinearGradient
            colors={isDark ? [palette.violet800, palette.violet900] : [palette.violet600, palette.violet800]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            {isPremium ? (
              <Text style={styles.heroTitle}>{t('home.hero.unlimited')}</Text>
            ) : (
              <>
                <Text style={styles.heroTitle}>
                  ✨ {t('home.hero.remaining', { used: usageCount, limit: FREE_LIMIT })}
                </Text>
                <View style={styles.progressBarBg}>
                  <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                </View>
              </>
            )}

            <Pressable
              style={({ pressed }) => [styles.heroCta, pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] }]}
              onPress={() => navigation.navigate('Analyze')}
            >
              <Text style={styles.heroCtaText}>📸 {t('home.hero.cta')}</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* ═══ 3. Last Analysis Card ═══ */}
        <Text style={styles.sectionTitle}>{t('home.lastAnalysis.title')}</Text>
        {lastScan ? (
          <Pressable
            style={({ pressed }) => [styles.lastAnalysisCard, pressed && { opacity: 0.9 }]}
            onPress={() => navigation.navigate('ScanDetail', { scanId: lastScan.id })}
          >
            {lastScan.preview_image_url ? (
              <Image
                source={{ uri: lastScan.preview_image_url }}
                style={styles.lastAnalysisThumbnail}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.lastAnalysisThumbnail, styles.thumbnailPlaceholder]}>
                <Text style={{ fontSize: 32 }}>👗</Text>
              </View>
            )}
            <View style={styles.lastAnalysisInfo}>
              {lastScan.overall_score != null && (
                <View style={styles.scoreRow}>
                  <Text
                    style={[
                      styles.scoreValue,
                      { color: getScoreColor(lastScan.overall_score) },
                    ]}
                  >
                    {lastScan.overall_score.toFixed(1)}/10
                  </Text>
                  <Text style={styles.scoreStars}>
                    {'★'.repeat(Math.round(lastScan.overall_score / 2))}
                    {'☆'.repeat(5 - Math.round(lastScan.overall_score / 2))}
                  </Text>
                </View>
              )}
              <Text style={styles.lastAnalysisMeta}>
                {lastScan.occasion ? `${lastScan.occasion} • ` : ''}
                {formatRelative(lastScan.created_at, t)}
              </Text>
              <Text style={styles.viewDetails}>{t('home.lastAnalysis.viewDetails')}</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            style={styles.motivationalCard}
            onPress={() => navigation.navigate('Analyze')}
          >
            <Text style={styles.motivationalEmoji}>📸</Text>
            <Text style={styles.motivationalText}>{t('home.lastAnalysis.motivational')}</Text>
          </Pressable>
        )}

        {/* ═══ 4. Quick Actions ═══ */}
        <View style={styles.quickActionsRow}>
          {[
            { icon: '📸', label: t('home.quickActions.analyze'), action: () => navigation.navigate('Analyze') },
            { icon: '👗', label: t('home.quickActions.closet'), action: () => navigation.navigate('Closet') },
            { icon: '📊', label: t('home.quickActions.stats'), action: () => navigation.navigate('Analytics') },
            { icon: '💬', label: t('home.quickActions.chat'), action: () => navigation.navigate('History') },
          ].map((item, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [styles.quickAction, pressed && { transform: [{ scale: 0.95 }] }]}
              onPress={item.action}
            >
              <Text style={styles.quickActionIcon}>{item.icon}</Text>
              <Text style={styles.quickActionLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ═══ 5. Style DNA Mini ═══ */}
        {summary && summary.breakdowns.length > 0 && (
          <Pressable
            style={({ pressed }) => [styles.styleDnaCard, pressed && { opacity: 0.9 }]}
            onPress={() => navigation.navigate('Analytics')}
          >
            <Text style={styles.styleDnaSectionTitle}>🧬 {t('home.styleDna.title')}</Text>
            <Text style={styles.styleDnaLabel}>
              ✨ {summary.emoji} {summary.label}
            </Text>
            <View style={styles.styleBarsContainer}>
              {summary.breakdowns.slice(0, 4).map((b, i) => (
                <View key={b.label} style={styles.styleBarRow}>
                  <View style={styles.styleBarLabelContainer}>
                    <Text style={styles.styleBarLabel} numberOfLines={1}>{b.label}</Text>
                  </View>
                  <View style={styles.styleBarTrack}>
                    <View
                      style={[
                        styles.styleBarFill,
                        {
                          width: `${b.percentage}%`,
                          backgroundColor: STYLE_BAR_COLORS[i % STYLE_BAR_COLORS.length],
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.styleBarPercent}>{Math.round(b.percentage)}%</Text>
                </View>
              ))}
            </View>
            <Text style={styles.viewFullLink}>{t('home.styleDna.viewFull')}</Text>
          </Pressable>
        )}

        {/* ═══ 6. Monthly Stats Row ═══ */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary?.totalAnalyses ?? usageCount}</Text>
            <Text style={styles.statLabel}>{t('home.stats.analyses')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {avgScore != null ? avgScore.toFixed(1) : '—'}
            </Text>
            <Text style={styles.statLabel}>{t('home.stats.avgScore')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>🔥 —</Text>
            <Text style={styles.statLabel}>{t('home.stats.streak')}</Text>
          </View>
        </View>

        {/* ═══ 7. Closet Quick Peek ═══ */}
        {wardrobeItems.length > 0 ? (
          <Pressable
            style={({ pressed }) => [styles.closetPeekCard, pressed && { opacity: 0.9 }]}
            onPress={() => navigation.navigate('Closet')}
          >
            <View style={styles.closetPeekHeader}>
              <Text style={styles.closetPeekTitle}>
                👗 {t('home.closetPeek.title')} ({t('home.closetPeek.pieces', { count: wardrobeTotal })})
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.closetPeekScroll}
            >
              {wardrobeItems.map((item) => (
                <View key={item.id} style={styles.closetPeekThumb}>
                  {item.image_url ? (
                    <Image
                      source={{ uri: item.image_url }}
                      style={styles.closetPeekImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.closetPeekImage, styles.closetPeekPlaceholder]}>
                      <Text style={{ fontSize: 20 }}>👗</Text>
                    </View>
                  )}
                </View>
              ))}
              {wardrobeTotal > wardrobeItems.length && (
                <View style={[styles.closetPeekThumb, styles.closetPeekMore]}>
                  <Text style={styles.closetPeekMoreText}>
                    +{wardrobeTotal - wardrobeItems.length}
                  </Text>
                </View>
              )}
            </ScrollView>
            <Text style={styles.closetManageLink}>{t('home.closetPeek.manage')}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.closetEmptyCard}
            onPress={() => navigation.navigate('Closet')}
          >
            <Text style={styles.closetEmptyText}>👗 {t('home.closetPeek.empty')}</Text>
          </Pressable>
        )}

        {/* ═══ 8. Tip of the Day ═══ */}
        <View style={styles.tipCard}>
          <View style={styles.tipAccent} />
          <View style={styles.tipContent}>
            <Text style={styles.tipTitle}>💡 {t('home.tip.title')}</Text>
            <Text style={styles.tipText}>"{tip}"</Text>
          </View>
        </View>

        {/* ═══ 9. Premium Banner ═══ */}
        {!isPremium && <PremiumBanner />}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const createStyles = (colors: ColorScheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xxxl,
    },

    // ── Header ──
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: spacing.xl,
      paddingBottom: spacing.lg,
    },
    avatarCircle: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    headerInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    greeting: {
      ...typography.subtitle1,
      color: colors.text,
    },
    date: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xxs,
    },
    bellContainer: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellIcon: {
      fontSize: 22,
    },
    notifDot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.coral400,
    },

    // ── Hero Card ──
    heroCard: {
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      marginBottom: spacing.xl,
      ...shadows.md,
    },
    heroTitle: {
      ...typography.subtitle2,
      color: '#FFFFFF',
      marginBottom: spacing.md,
    },
    progressBarBg: {
      height: 8,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 4,
      marginBottom: spacing.lg,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: 8,
      borderRadius: 4,
      backgroundColor: palette.gold400,
    },
    heroCta: {
      backgroundColor: palette.gold400,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.xl,
      alignItems: 'center',
      ...shadows.sm,
    },
    heroCtaText: {
      ...typography.button,
      color: palette.neutral900,
      fontWeight: '700',
    },

    // ── Section Title ──
    sectionTitle: {
      ...typography.subtitle2,
      color: colors.text,
      marginBottom: spacing.md,
    },

    // ── Last Analysis ──
    lastAnalysisCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    lastAnalysisThumbnail: {
      width: 80,
      height: 80,
      borderRadius: borderRadius.md,
      backgroundColor: colors.background,
    },
    thumbnailPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primaryLight,
    },
    lastAnalysisInfo: {
      flex: 1,
      marginLeft: spacing.lg,
      justifyContent: 'center',
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    scoreValue: {
      ...typography.subtitle1,
      fontWeight: '700',
      marginRight: spacing.sm,
    },
    scoreStars: {
      fontSize: 14,
      color: palette.gold400,
    },
    lastAnalysisMeta: {
      ...typography.caption,
      color: colors.textTertiary,
      marginBottom: spacing.xs,
    },
    viewDetails: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },
    motivationalCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    motivationalEmoji: {
      fontSize: 40,
      marginBottom: spacing.md,
    },
    motivationalText: {
      ...typography.body1,
      color: colors.textSecondary,
      textAlign: 'center',
    },

    // ── Quick Actions ──
    quickActionsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    quickAction: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      ...shadows.sm,
    },
    quickActionIcon: {
      fontSize: 32,
      marginBottom: spacing.sm,
    },
    quickActionLabel: {
      ...typography.caption,
      color: colors.text,
      fontWeight: '600',
    },

    // ── Style DNA ──
    styleDnaCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    styleDnaSectionTitle: {
      ...typography.overline,
      color: colors.textTertiary,
      marginBottom: spacing.sm,
    },
    styleDnaLabel: {
      ...typography.h3,
      color: colors.text,
      marginBottom: spacing.md,
    },
    styleBarsContainer: {
      marginBottom: spacing.md,
    },
    styleBarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    styleBarLabelContainer: {
      width: 70,
    },
    styleBarLabel: {
      ...typography.caption,
      color: colors.textSecondary,
    },
    styleBarTrack: {
      flex: 1,
      height: 10,
      backgroundColor: colors.border,
      borderRadius: 5,
      marginHorizontal: spacing.sm,
      overflow: 'hidden',
    },
    styleBarFill: {
      height: 10,
      borderRadius: 5,
    },
    styleBarPercent: {
      ...typography.caption,
      color: colors.textTertiary,
      width: 36,
      textAlign: 'right',
    },
    viewFullLink: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
    },

    // ── Stats Row ──
    statsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.xl,
    },
    statBox: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      ...shadows.sm,
    },
    statValue: {
      ...typography.h2,
      color: colors.primary,
    },
    statLabel: {
      ...typography.caption,
      color: colors.textSecondary,
      marginTop: spacing.xs,
      textAlign: 'center',
    },

    // ── Closet Peek ──
    closetPeekCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    closetPeekHeader: {
      marginBottom: spacing.md,
    },
    closetPeekTitle: {
      ...typography.subtitle2,
      color: colors.text,
    },
    closetPeekScroll: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    closetPeekThumb: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.md,
      overflow: 'hidden',
    },
    closetPeekImage: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.md,
    },
    closetPeekPlaceholder: {
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closetPeekMore: {
      backgroundColor: colors.primaryLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closetPeekMoreText: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '700',
    },
    closetManageLink: {
      ...typography.caption,
      color: colors.primary,
      fontWeight: '600',
      marginTop: spacing.sm,
    },
    closetEmptyCard: {
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      padding: spacing.xl,
      alignItems: 'center',
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    closetEmptyText: {
      ...typography.body2,
      color: colors.textSecondary,
    },

    // ── Tip of the Day ──
    tipCard: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      marginBottom: spacing.xl,
      ...shadows.sm,
    },
    tipAccent: {
      width: 4,
      backgroundColor: colors.primary,
    },
    tipContent: {
      flex: 1,
      padding: spacing.lg,
    },
    tipTitle: {
      ...typography.subtitle2,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    tipText: {
      ...typography.body2,
      color: colors.textSecondary,
      fontStyle: 'italic',
      lineHeight: 22,
    },
  });
