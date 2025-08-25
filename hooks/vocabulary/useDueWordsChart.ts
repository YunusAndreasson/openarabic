import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@charts/ChartColors';
import {
  calculateDataPointPositions,
  CHART_VISUAL,
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
      // Use consistent padding approach like MasteryChart
      const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;
      const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING;
      // Fix Y-coordinate calculation: higher due words should be at top (more concerning)
      // When dueWords = 0, y = TOP_PADDING + chartHeight (bottom)
      // When dueWords = maxDueWords, y = TOP_PADDING (top)
      const y = TOP_PADDING + (chartHeight - (data.dueWords / maxDueWords) * chartHeight);
      points.push({ x, y, dueWords: data.dueWords, date: data.date });

      if (index === 0) {
        path.moveTo(x, y);
      } else {
        const prevPoint = points[index - 1];
        if (prevPoint) {
          // Create smooth curves using cubic bezier (like MasteryChart)
          // This creates much more natural-looking curves
          const controlX1 = prevPoint.x + (x - prevPoint.x) * 0.3;
          const controlY1 = prevPoint.y;
          const controlX2 = prevPoint.x + (x - prevPoint.x) * 0.7;
          const controlY2 = y;
          path.cubicTo(controlX1, controlY1, controlX2, controlY2, x, y);
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
