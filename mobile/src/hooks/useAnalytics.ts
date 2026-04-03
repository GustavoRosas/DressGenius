/**
 * DressGenius — useAnalytics hook
 *
 * Fetches all analytics endpoints in parallel and exposes
 * data + loading + error states for each section.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

// ── Response Types ──────────────────────────────────────────────────────────

export interface StyleBreakdown {
  label: string;
  percentage: number;
}

export interface AnalyticsSummary {
  emoji: string;
  label: string;
  totalAnalyses: number;
  breakdowns: StyleBreakdown[];
}

export interface ScorePoint {
  week: string;
  score: number;
}

export interface ScoreTrend {
  points: ScorePoint[];
  average: number;
  trend: number; // e.g. +0.4
}

export interface ColorBreakdownItem {
  hex: string;
  name: string;
  percentage: number;
}

export interface ColorBreakdown {
  colors: ColorBreakdownItem[];
  dominantTone: string;
  dominantPercentage: number;
}

export interface ClosetCategory {
  category: string;
  count: number;
}

export interface ClosetGap {
  message: string;
  highCategory: string;
  highCount: number;
  lowCategory: string;
  lowCount: number;
}

export interface ClosetItem {
  id: number;
  name: string;
  category: string;
  imageUrl: string | null;
  timesWorn: number;
}

export interface ClosetIntelligence {
  categories: ClosetCategory[];
  gaps: ClosetGap[];
  unusedItems: ClosetItem[];
  mostWorn: ClosetItem[];
}

// ── Hook Return ─────────────────────────────────────────────────────────────

export interface UseAnalyticsReturn {
  summary: AnalyticsSummary | null;
  scoreTrend: ScoreTrend | null;
  colorBreakdown: ColorBreakdown | null;
  closetIntelligence: ClosetIntelligence | null;
  loading: boolean;
  error: boolean;
  hasEnoughData: boolean;
  refetch: () => Promise<void>;
}

export function useAnalytics(): UseAnalyticsReturn {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [scoreTrend, setScoreTrend] = useState<ScoreTrend | null>(null);
  const [colorBreakdown, setColorBreakdown] = useState<ColorBreakdown | null>(null);
  const [closetIntelligence, setClosetIntelligence] = useState<ClosetIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const [summaryRes, trendRes, colorsRes, closetRes] = await Promise.allSettled([
        api.get<{ data: AnalyticsSummary }>('/analytics/summary'),
        api.get<{ data: ScoreTrend }>('/analytics/score-trend'),
        api.get<{ data: ColorBreakdown }>('/analytics/color-breakdown'),
        api.get<{ data: ClosetIntelligence }>('/analytics/closet-intelligence'),
      ]);

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value.data?.data ?? null);
      }
      if (trendRes.status === 'fulfilled') {
        setScoreTrend(trendRes.value.data?.data ?? null);
      }
      if (colorsRes.status === 'fulfilled') {
        setColorBreakdown(colorsRes.value.data?.data ?? null);
      }
      if (closetRes.status === 'fulfilled') {
        setClosetIntelligence(closetRes.value.data?.data ?? null);
      }

      // If ALL failed, mark error
      if (
        summaryRes.status === 'rejected' &&
        trendRes.status === 'rejected' &&
        colorsRes.status === 'rejected' &&
        closetRes.status === 'rejected'
      ) {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const hasEnoughData = (summary?.totalAnalyses ?? 0) >= 3;

  return {
    summary,
    scoreTrend,
    colorBreakdown,
    closetIntelligence,
    loading,
    error,
    hasEnoughData,
    refetch: fetchAll,
  };
}
