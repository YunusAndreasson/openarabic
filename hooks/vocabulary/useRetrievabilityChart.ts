
import { useChartColors } from '@charts/ChartColors';
import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
  useGraphWidth,
} from '@charts/constants';
import { buildSmoothChartPath } from '@charts/pathBuilder';
import { createStandardizedPerformanceZones } from '@charts/utils';
import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateRetrievabilityForecast,
  calculateRetrievabilityTrend,
  type RetrievabilityForecast,
} from '@/utils/fsrsUtils';

interface RetrievabilityChartData {
  retrievabilityPath: string;
  hasData: boolean;
  dangerZones: ReturnType<typeof createStandardizedPerformanceZones>;
  dataPoints: { x: number; y: number; retrievability: number; date: Date }[];
  insights: {
    currentRetrievability: number;
    trend: 'improving' | 'declining' | 'stable';
    criticalWords: number;
  };
}

export interface UseRetrievabilityChartResult {
  retrievabilityData: RetrievabilityForecast[];
  chartData: RetrievabilityChartData;
}

/**
 * Calculate retrievability forecast and chart metrics for vocabulary words.
 */
export function useRetrievabilityChart(studyWords: StudyWord[]): UseRetrievabilityChartResult {
  const chartColors = useChartColors();
  const graphWidth = useGraphWidth();

  const retrievabilityData = useMemo<RetrievabilityForecast[]>(() => {
    return calculateRetrievabilityForecast(studyWords, DAYS_7);
  }, [studyWords]);

  const chartData = useMemo<RetrievabilityChartData>(() => {
    // Always render a 7-day chart; show as zeros if there was no recent activity
    if (retrievabilityData.length === 0) {
      return {
        retrievabilityPath: '',
        hasData: false,
        insights: { currentRetrievability: 0, trend: 'stable', criticalWords: 0 },
        dangerZones: [],
        dataPoints: [],
      };
    }

    const maxRetrievability = Math.max(
      100,
      Math.max(...retrievabilityData.map(d => d.averageRetrievability))
    );

    // Create smooth curve using shared path builder utility
    const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;
    const BOTTOM_PADDING = CHART_VISUAL.CHART_BOTTOM_PADDING;
    // Effective chart height accounts for both top and bottom padding
    const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING - BOTTOM_PADDING;
    const dataPointPositions = calculateDataPointPositions(retrievabilityData.length);

    const { path: retrievabilityPath, points } = buildSmoothChartPath({
      data: retrievabilityData,
      dataPointPositions,
      calculateY: data =>
        TOP_PADDING +
        (chartHeight - (data.averageRetrievability / maxRetrievability) * chartHeight),
      buildPoint: (x, y, data) => ({
        x,
        y,
        retrievability: data.averageRetrievability,
        date: data.date,
      }),
    });

    const performanceZones = createStandardizedPerformanceZones(GRAPH_HEIGHT_LARGE, 0, chartColors);

    // Calculate trend using utility function
    const trend = calculateRetrievabilityTrend(retrievabilityData);

    // Get today's data for insights
    const todayData = retrievabilityData[0]; // Today (leftmost, in UTC)
    const currentRetrievability = todayData?.averageRetrievability || 0;
    const criticalWords = todayData?.criticalWords || 0;

    return {
      retrievabilityPath,
      // Show the chart whenever the user has any study words, regardless of due words
      hasData: (studyWords?.length ?? 0) > 0,
      dangerZones: performanceZones,
      dataPoints: points,
      insights: {
        currentRetrievability: Math.round(currentRetrievability),
        trend,
        criticalWords,
      },
    };
  }, [retrievabilityData, chartColors, graphWidth, studyWords?.length]);

  return { retrievabilityData, chartData };
}
