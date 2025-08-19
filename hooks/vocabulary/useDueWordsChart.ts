import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@charts/chartColors';
import {
  calculateDataPointPositions,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
  useGraphWidth,
} from '@charts/constants';

import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateDueWordsForecast,
  calculateDueWordsTrend,
  type DueWordsForecast,
} from '@/utils/fsrsUtils';

interface DueWordsChartData {
  dueWordsPath: string;
  hasData: boolean;
  dataPoints: { x: number; y: number; dueWords: number; date: Date }[];
  insights: {
    currentDue: number;
    peakDue: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface UseDueWordsChartResult {
  dueWordsData: DueWordsForecast[];
  chartData: DueWordsChartData;
}

/**
 * Calculate due words forecast and chart metrics for vocabulary words.
 */
export function useDueWordsChart(studyWords: StudyWord[]): UseDueWordsChartResult {
  const chartColors = useChartColors();
  const graphWidth = useGraphWidth();

  const dueWordsData = useMemo<DueWordsForecast[]>(() => {
    return calculateDueWordsForecast(studyWords, DAYS_7);
  }, [studyWords]);

  const chartData = useMemo<DueWordsChartData>(() => {
    // Always render a 7-day chart; show as zeros if there are no words
    if (dueWordsData.length === 0) {
      return {
        dueWordsPath: '',
        hasData: false,
        insights: { currentDue: 0, peakDue: 0, trend: 'stable' },
        dataPoints: [],
      };
    }

    const maxDueWords = Math.max(
      10, // Minimum scale of 10 for better visualization
      Math.max(...dueWordsData.map(d => d.dueWords))
    );

    const path = Skia.Path.Make();
    const points: { x: number; y: number; dueWords: number; date: Date }[] = [];

    // Render all 7 days for continuity
    const dataPointPositions = calculateDataPointPositions(dueWordsData.length);

    dueWordsData.forEach((data, index) => {
      const x = dataPointPositions[index] || 0;
      // Add padding to prevent data points from being clipped at chart edges
      const padding = 8; // 8px padding from top and bottom
      const chartHeight = GRAPH_HEIGHT_LARGE - padding * 2;
      const y = padding + chartHeight - (data.dueWords / maxDueWords) * chartHeight;
      points.push({ x, y, dueWords: data.dueWords, date: data.date });

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

    // Calculate trend using utility function
    const trend = calculateDueWordsTrend(dueWordsData);

    // Get insights
    const todayData = dueWordsData[0]; // Today (leftmost)
    const currentDue = todayData?.dueWords || 0;
    const peakDue = Math.max(...dueWordsData.map(d => d.dueWords));

    return {
      dueWordsPath: path.toSVGString(),
      // Show the chart whenever the user has any study words
      hasData: (studyWords?.length ?? 0) > 0,
      dataPoints: points,
      insights: {
        currentDue,
        peakDue,
        trend,
      },
    };
  }, [dueWordsData, chartColors, graphWidth, studyWords?.length]);

  return { dueWordsData, chartData };
}
