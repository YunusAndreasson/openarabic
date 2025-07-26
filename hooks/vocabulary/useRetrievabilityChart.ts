import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import {
  calculateDataPointPositions,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
  useGraphWidth,
} from '@/components/vocabulary/shared/constants';
import { createStandardizedPerformanceZones } from '@/components/vocabulary/shared/utils';
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
    if (retrievabilityData.length === 0) {
      return {
        retrievabilityPath: '',
        hasData: false,
        insights: { currentRetrievability: 0, trend: 'stable', criticalWords: 0 },
        dangerZones: [],
        dataPoints: [],
      };
    }

    const hasData = retrievabilityData.some(d => d.wordCount > 0);
    if (!hasData) {
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

    const path = Skia.Path.Make();
    const points: { x: number; y: number; retrievability: number; date: Date }[] = [];

    // Filter to only include days with actual data for rendering
    const daysWithData = retrievabilityData.filter(data => data.wordCount > 0);
    const dataPointPositions = calculateDataPointPositions(daysWithData.length);

    daysWithData.forEach((data, index) => {
      const x = dataPointPositions[index] || 0;
      const y =
        GRAPH_HEIGHT_LARGE - (data.averageRetrievability / maxRetrievability) * GRAPH_HEIGHT_LARGE;
      points.push({ x, y, retrievability: data.averageRetrievability, date: data.date });

      if (index === 0) {
        path.moveTo(x, y);
      } else {
        const prevPoint = points[index - 1];
        if (prevPoint) {
          const controlX = (prevPoint.x + x) / 2;
          path.quadTo(controlX, prevPoint.y, x, y);
        }
      }
    });

    const performanceZones = createStandardizedPerformanceZones(GRAPH_HEIGHT_LARGE, 0, chartColors);

    // Calculate trend using utility function
    const trend = calculateRetrievabilityTrend(retrievabilityData);

    // Get today's data for insights
    const todayData = retrievabilityData[0]; // Today (leftmost)
    const currentRetrievability = todayData?.averageRetrievability || 0;
    const criticalWords = todayData?.criticalWords || 0;

    return {
      retrievabilityPath: path.toSVGString(),
      hasData,
      dangerZones: performanceZones,
      dataPoints: points,
      insights: {
        currentRetrievability: Math.round(currentRetrievability),
        trend,
        criticalWords,
      },
    };
  }, [retrievabilityData, chartColors, graphWidth]);

  return { retrievabilityData, chartData };
}

export default useRetrievabilityChart;
