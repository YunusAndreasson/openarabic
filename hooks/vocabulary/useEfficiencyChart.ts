import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@charts/chartColors';
import {
  calculateDataPointPositions,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
  useGraphWidth,
} from '@charts/constants';
import {
  calculateEfficiencyScore,
  createStandardizedPerformanceZones,
  generateDateRange,
  isSameDay,
} from '@charts/utils';

import { TREND_CHANGE_THRESHOLD } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';

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

    const parseSupabaseTimestamp = (ts: string): Date | null => {
      if (!ts) return null;
      let s = ts.replace(' ', 'T');
      // Normalize timezone: convert trailing "+00" to "Z"; if missing tz, assume Z
      s = s.replace(/\+00$/, 'Z');
      if (!/[Zz]|[\+\-]\d{2}:?\d{2}$/.test(s)) {
        s = s + 'Z';
      }
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    };

    return dates.map(date => {
      let totalEfficiency = 0;
      let wordCount = 0;

      studyWords.forEach(word => {
        // Robust normalization for Supabase timestamp (Hermes-friendly)
        const lastReview = word.fsrs_last_review
          ? parseSupabaseTimestamp(word.fsrs_last_review)
          : null;

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
    if (efficiencyData.length === 0) {
      return {
        efficiencyPath: '',
        hasData: false,
        insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
        performanceZones: [],
        dataPoints: [],
      };
    }

    const hasData = efficiencyData.some(d => d.wordCount > 0);

    if (!hasData) {
      return {
        efficiencyPath: '',
        hasData: false,
        insights: { currentEfficiency: 0, trend: 'stable' as const, weeklyAverage: 0 },
        performanceZones: [],
        dataPoints: [],
      };
    }

    const maxEfficiency = Math.max(100, Math.max(...efficiencyData.map(d => d.averageEfficiency)));

    // Create smooth curve using Skia Path
    const path = Skia.Path.Make();
    const points: { x: number; y: number; efficiency: number; date: Date }[] = [];

    // Filter to only include days with actual data for rendering
    const daysWithData = efficiencyData.filter(data => data.wordCount > 0);
    const dataPointPositions = calculateDataPointPositions(daysWithData.length);

    daysWithData.forEach((data, index) => {
      const x = dataPointPositions[index] || 0;
      const y = GRAPH_HEIGHT_LARGE - (data.averageEfficiency / maxEfficiency) * GRAPH_HEIGHT_LARGE;
      points.push({ x, y, efficiency: data.averageEfficiency, date: data.date });

      if (index === 0) {
        path.moveTo(x, y);
      } else {
        // Create smooth curves using quadratic bezier
        const prevPoint = points[index - 1];
        if (prevPoint) {
          const controlX = (prevPoint.x + x) / 2;
          path.quadTo(controlX, prevPoint.y, x, y);
        }
      }
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

    return {
      efficiencyPath: path.toSVGString(),
      hasData,
      performanceZones,
      dataPoints: points,
      insights: {
        currentEfficiency: Math.round(currentEfficiency),
        trend,
        weeklyAverage: Math.round(recentAvg),
      },
    };
  }, [efficiencyData, chartColors, graphWidth]);

  return { efficiencyData, chartData };
}
