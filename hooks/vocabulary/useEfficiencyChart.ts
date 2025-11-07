import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  getEffectiveChartHeight,
} from '@/components/common/charts/constants';
import { buildSmoothChartPath } from '@/components/common/charts/pathBuilder';
import {
  calculateEfficiencyScore,
  generateDateRange,
  isSameDay,
} from '@/components/common/charts/utils';
import { useMemo } from 'react';

import { TREND_CHANGE_THRESHOLD } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

// Efficiency data interface
export interface EfficiencyRecord {
  date: Date;
  wordCount: number;
  averageEfficiency: number;
}

interface EfficiencyChartData {
  efficiencyPath: string;
  hasData: boolean;
  dataPoints: { x: number; y: number; efficiency: number; date: Date }[];
  insights: {
    currentEfficiency: number;
    trend: 'improving' | 'declining' | 'stable';
    weeklyAverage: number;
  };
}

export interface UseEfficiencyChartResult {
  efficiencyData: EfficiencyRecord[];
  chartData: EfficiencyChartData;
}

/**
 * Calculate efficiency data and chart metrics for vocabulary words.
 */
export function useEfficiencyChart(studyWords: StudyWord[]): UseEfficiencyChartResult {
  // Calculate efficiency data over the last 7 days
  const efficiencyData = useMemo<EfficiencyRecord[]>(() => {
    const dates = generateDateRange(DAYS_7);

    return dates.map(date => {
      let totalEfficiency = 0;
      let wordCount = 0;

      studyWords.forEach(word => {
        // Robust normalization for Supabase timestamp (Hermes-friendly)
        const lastReview = parseSupabaseTimestamp(word.fsrs_last_review);

        // Count words reviewed on this specific day
        if (lastReview && isSameDay(lastReview, date) && (word.fsrs_reps ?? 0) > 0) {
          const efficiency = calculateEfficiencyScore(word);
          totalEfficiency += efficiency;
          wordCount++;
        }
      });

      const averageEfficiency = wordCount > 0 ? totalEfficiency / wordCount : 0;
      return { date, averageEfficiency, wordCount };
    });
  }, [studyWords]);

  // Calculate chart data and insights
  const chartData = useMemo<EfficiencyChartData>(() => {
    // Always render a 7-day chart; show as zeros if there was no recent activity
    if (efficiencyData.length === 0) {
      return {
        efficiencyPath: '',
        hasData: false,
        insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
        dataPoints: [],
      };
    }

    const maxEfficiency = Math.max(100, Math.max(...efficiencyData.map(d => d.averageEfficiency)));

    // Create smooth curve using shared path builder utility
    const chartHeight = getEffectiveChartHeight();
    const dataPointPositions = calculateDataPointPositions(efficiencyData.length);
    const { path: efficiencyPath, points } = buildSmoothChartPath({
      data: efficiencyData,
      dataPointPositions,
      calculateY: data =>
        CHART_VISUAL.CHART_TOP_PADDING +
        (chartHeight - (data.averageEfficiency / maxEfficiency) * chartHeight),
      buildPoint: (x, y, data) => ({ x, y, efficiency: data.averageEfficiency, date: data.date }),
    });

    // Calculate insights
    const recent = efficiencyData.slice(-4); // Last 4 days for 7-day period
    const older = efficiencyData.slice(-7, -4); // Previous 3 days for comparison

    const currentEfficiency = recent[recent.length - 1]?.averageEfficiency || 0;
    const recentAvg =
      recent.length > 0
        ? recent.reduce((sum, day) => sum + day.averageEfficiency, 0) / recent.length
        : 0;
    const olderAvg =
      older.length > 0
        ? older.reduce((sum, day) => sum + day.averageEfficiency, 0) / older.length
        : 0;

    const change = recentAvg - olderAvg;
    const trend =
      change > TREND_CHANGE_THRESHOLD
        ? 'improving'
        : change < -TREND_CHANGE_THRESHOLD
          ? 'declining'
          : 'stable';

    // Show the chart whenever the user has any study words, regardless of due words
    const hasData = (studyWords?.length ?? 0) > 0;

    return {
      efficiencyPath,
      hasData,
      dataPoints: points,
      insights: {
        currentEfficiency: Math.round(currentEfficiency),
        trend,
        weeklyAverage: Math.round(recentAvg),
      },
    };
  }, [efficiencyData, studyWords?.length]);

  return { efficiencyData, chartData };
}
