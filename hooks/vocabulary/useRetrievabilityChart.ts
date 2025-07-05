import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import {
  calculateDataPointPositions,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
  useGraphWidth,
} from '@/components/vocabulary/shared/constants';
import {
  calculateRetrievability,
  createStandardizedPerformanceZones,
} from '@/components/vocabulary/shared/utils';
import {
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  TREND_CHANGE_THRESHOLD,
  URGENT_RETRIEVABILITY_THRESHOLD,
} from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';

interface RetrievabilityForecast {
  date: Date;
  averageRetrievability: number;
  wordCount: number;
  criticalWords: number;
  urgentWords: number;
}

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

  const validWords = useMemo<(StudyWord & { lastReviewDate: Date })[]>(
    () =>
      studyWords
        .filter(w => w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0)
        .map(w => ({ ...w, lastReviewDate: new Date(w.fsrs_last_review as string) })),
    [studyWords]
  );

  const retrievabilityData = useMemo<RetrievabilityForecast[]>(() => {
    // Generate future dates starting from today for memory decay forecasting
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const dates: Date[] = [];
    for (let i = 0; i < DAYS_7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i); // Future dates starting from today
      date.setHours(23, 59, 59, 999);
      dates.push(date);
    }

    return dates.map(date => {
      let totalRetrievability = 0;
      let wordCount = 0;
      let criticalWords = 0;
      let urgentWords = 0;

      validWords.forEach(word => {
        const retrievability = calculateRetrievability(word, date, word.lastReviewDate);
        totalRetrievability += retrievability;
        wordCount++;

        if (retrievability < CRITICAL_RETRIEVABILITY_THRESHOLD) {
          criticalWords++;
        }
        if (retrievability < URGENT_RETRIEVABILITY_THRESHOLD) {
          urgentWords++;
        }
      });

      const averageRetrievability = wordCount > 0 ? (totalRetrievability / wordCount) * 100 : 0;
      return { date, averageRetrievability, wordCount, criticalWords, urgentWords };
    });
  }, [validWords]);

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

    // For future predictions, analyze the forecast trend
    const todayData = retrievabilityData[0]; // Today (leftmost)
    const futureData = retrievabilityData.slice(1); // Next 6 days

    const currentRetrievability = todayData?.averageRetrievability || 0;
    const futureAvg =
      futureData.length > 0
        ? futureData.reduce((sum, day) => sum + day.averageRetrievability, 0) / futureData.length
        : 0;

    // Calculate trend based on future decay prediction
    const change = futureAvg - currentRetrievability;
    const trend =
      change > TREND_CHANGE_THRESHOLD
        ? 'improving' // Unlikely for memory decay, but possible with reviews
        : change < -TREND_CHANGE_THRESHOLD
        ? 'declining' // Expected for memory decay
        : 'stable';

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
