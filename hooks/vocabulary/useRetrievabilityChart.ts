import { Skia } from '@shopify/react-native-skia';
import { useMemo } from 'react';

import { useChartColors } from '@/components/vocabulary/shared/chartColors';
import {
  useGraphWidth,
  GRAPH_HEIGHT_LARGE,
  DAYS_7,
  CRITICAL_RETRIEVABILITY_THRESHOLD,
} from '@/components/vocabulary/shared/constants';
import {
  calculateRetrievability,
  createStandardizedPerformanceZones,
} from '@/components/vocabulary/shared/utils';
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
export function useRetrievabilityChart(
  studyWords: StudyWord[]
): UseRetrievabilityChartResult {
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
    const today = new Date();
    const dates: Date[] = [];

    for (let i = 0; i < DAYS_7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }

    return dates.map(date => {
      let totalRetrievability = 0;
      let wordCount = 0;
      let criticalWords = 0;
      let urgentWords = 0;

      validWords.forEach(word => {
        const retrievability = calculateRetrievability(
          word,
          date,
          word.lastReviewDate
        );
        totalRetrievability += retrievability;
        wordCount++;

        if (retrievability < CRITICAL_RETRIEVABILITY_THRESHOLD) {
          criticalWords++;
        }
        if (retrievability < 0.5) {
          urgentWords++;
        }
      });

      const averageRetrievability =
        wordCount > 0 ? (totalRetrievability / wordCount) * 100 : 0;
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
    const stepX = graphWidth / (retrievabilityData.length - 1);

    const path = Skia.Path.Make();
    const points: { x: number; y: number; retrievability: number; date: Date }[] = [];

    retrievabilityData.forEach((data, index) => {
      const x = index * stepX;
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

    const performanceZones = createStandardizedPerformanceZones(
      GRAPH_HEIGHT_LARGE,
      0,
      chartColors
    );

    const firstHalf = retrievabilityData.slice(0, 4);
    const secondHalf = retrievabilityData.slice(4, 7);

    const currentRetrievability = retrievabilityData[0]?.averageRetrievability || 0;
    const firstHalfAvg =
      firstHalf.reduce((sum, day) => sum + day.averageRetrievability, 0) / firstHalf.length;
    const secondHalfAvg =
      secondHalf.reduce((sum, day) => sum + day.averageRetrievability, 0) / secondHalf.length;

    const change = firstHalfAvg - secondHalfAvg;
    const trend = change > 3 ? 'improving' : change < -3 ? 'declining' : 'stable';
    const criticalWords = retrievabilityData[0]?.criticalWords || 0;

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
