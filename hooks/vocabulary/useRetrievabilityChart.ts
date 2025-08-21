import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@charts/chartColors';
import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
  useGraphWidth,
} from '@charts/constants';
import { createStandardizedPerformanceZones } from '@charts/utils';

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

    const path = Skia.Path.Make();
    const points: { x: number; y: number; retrievability: number; date: Date }[] = [];

    // Render all 7 days for continuity (even if some days have 0 words)
    const dataPointPositions = calculateDataPointPositions(retrievabilityData.length);

    retrievabilityData.forEach((data, index) => {
      const x = dataPointPositions[index] || 0;
      // Use consistent padding approach like MasteryChart
      const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;
      const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING;
      const y =
        TOP_PADDING +
        (chartHeight - (data.averageRetrievability / maxRetrievability) * chartHeight);
      points.push({ x, y, retrievability: data.averageRetrievability, date: data.date });

      if (index === 0) {
        path.moveTo(x, y);
      } else {
        const prevPoint = points[index - 1];
        if (prevPoint) {
          // Create smooth curves using cubic bezier (like MasteryChart)
          // This creates much more natural-looking curves instead of sharp angles
          const controlX1 = prevPoint.x + (x - prevPoint.x) * 0.3;
          const controlY1 = prevPoint.y;
          const controlX2 = prevPoint.x + (x - prevPoint.x) * 0.7;
          const controlY2 = y;
          path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
        }
      }
    });

    const performanceZones = createStandardizedPerformanceZones(GRAPH_HEIGHT_LARGE, 0, chartColors);

    // Calculate trend using utility function
    const trend = calculateRetrievabilityTrend(retrievabilityData);

    // Get today's data for insights
    const todayData = retrievabilityData[0]; // Today (leftmost, in UTC)
    const currentRetrievability = todayData?.averageRetrievability || 0;
    const criticalWords = todayData?.criticalWords || 0;

    return {
      retrievabilityPath: path.toSVGString(),
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
