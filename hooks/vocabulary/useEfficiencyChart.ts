import { useMemo } from 'react';

import { useChartColors } from '@charts/ChartColors';
import {
  calculateDataPointPositions,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
  useGraphWidth,
} from '@charts/constants';
import { buildSmoothChartPath } from '@charts/pathBuilder';
import {
  calculateEfficiencyScore,
  createStandardizedPerformanceZones,
  generateDateRange,
  isSameDay,
} from '@charts/utils';

import { TREND_CHANGE_THRESHOLD } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateUtils';

// Efficiency data interface
export interface EfficiencyRecord {
  date: Date;
  wordCount: number;
  averageEfficiency: number;
}

interface EfficiencyChartData {
  efficiencyPath: string;
  hasData: boolean;
  performanceZones: ReturnType<typeof createStandardizedPerformanceZones>;
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
  const chartColors = useChartColors();
  const graphWidth = useGraphWidth();

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
        performanceZones: [],
        dataPoints: [],
      };
    }

    const maxEfficiency = Math.max(100, Math.max(...efficiencyData.map(d => d.averageEfficiency)));

    // Create smooth curve using shared path builder utility
    const dataPointPositions = calculateDataPointPositions(efficiencyData.length);
    const { path: efficiencyPath, points } = buildSmoothChartPath({
      data: efficiencyData,
      dataPointPositions,
      calculateY: data => GRAPH_HEIGHT_LARGE - (data.averageEfficiency / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      buildPoint: (x, y, data) => ({ x, y, efficiency: data.averageEfficiency, date: data.date }),
    });

    // Define performance zones using standardized utility
    const performanceZones = createStandardizedPerformanceZones(
      GRAPH_HEIGHT_LARGE,
      0,
      chartColors
    ).map(zone => ({
      ...zone,
      // Adjust for efficiency chart scaling
      y:
        GRAPH_HEIGHT_LARGE -
        ((zone.min + (zone.max - zone.min)) / maxEfficiency) * GRAPH_HEIGHT_LARGE,
      height: ((zone.max - zone.min) / maxEfficiency) * GRAPH_HEIGHT_LARGE,
    }));

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
      performanceZones,
      dataPoints: points,
      insights: {
        currentEfficiency: Math.round(currentEfficiency),
        trend,
        weeklyAverage: Math.round(recentAvg),
      },
    };
  }, [efficiencyData, chartColors, graphWidth, studyWords?.length]);

  return { efficiencyData, chartData };
}
