import { useChartColors } from '@/constants/chartColors';
import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  getEffectiveChartHeight,
  GRAPH_HEIGHT_LARGE,
} from '@/constants/chartConstants';
import { buildSmoothChartPath } from '@/utils/chartPathBuilder';
import { createStandardizedPerformanceZones } from '@/utils/chartDataUtils';
import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { calculateRetrievabilityForecast, type RetrievabilityForecast } from '@/utils/fsrsUtils';

interface RetrievabilityChartData {
  retrievabilityPath: string;
  hasData: boolean;
  dangerZones: ReturnType<typeof createStandardizedPerformanceZones>;
  dataPoints: { x: number; y: number; retrievability: number; date: Date }[];
  insights: {
    currentRetrievability: number;
    /** Forecast average retrievability at the end of the window (no reviews) */
    weekRetrievability: number;
    criticalWords: number;
    /**
     * How many more words drop below the critical recall threshold by the end of
     * the window if nothing is reviewed. The forgetting curve only decreases, so
     * this is never negative.
     */
    criticalWordsInWeek: number;
    /**
     * Expected number of words recallable right now — the sum of every measured
     * word's recall probability, which is `currentRetrievability` un-averaged.
     *
     * Deliberately derived from the same figures as `currentRetrievability` so
     * the practice hero's count and the memory sheet's percentage are the same
     * fact in two units and can never drift apart.
     */
    recallableWords: number;
    /**
     * How many words the percentage is actually averaged over — only those with
     * a review behind them. A word that has never been shown has no memory
     * state to decay, so it cannot be in this average, and the surfaces above
     * must not imply it is. Zero here means there is nothing to measure yet,
     * which is NOT the same as 0% recall.
     */
    measuredWords: number;
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

  const retrievabilityData = useMemo<RetrievabilityForecast[]>(() => {
    return calculateRetrievabilityForecast(studyWords, DAYS_7);
  }, [studyWords]);

  const chartData = useMemo<RetrievabilityChartData>(() => {
    // Always render a 7-day chart; show as zeros if there was no recent activity
    if (retrievabilityData.length === 0) {
      return {
        retrievabilityPath: '',
        hasData: false,
        insights: {
          currentRetrievability: 0,
          weekRetrievability: 0,
          criticalWords: 0,
          criticalWordsInWeek: 0,
          recallableWords: 0,
          measuredWords: 0,
        },
        dangerZones: [],
        dataPoints: [],
      };
    }

    const maxRetrievability = Math.max(
      100,
      Math.max(...retrievabilityData.map(d => d.averageRetrievability)),
    );

    // Create smooth curve using shared path builder utility
    const chartHeight = getEffectiveChartHeight();
    const dataPointPositions = calculateDataPointPositions(retrievabilityData.length);

    const { path: retrievabilityPath, points } = buildSmoothChartPath({
      data: retrievabilityData,
      dataPointPositions,
      calculateY: data =>
        CHART_VISUAL.CHART_TOP_PADDING +
        (chartHeight - (data.averageRetrievability / maxRetrievability) * chartHeight),
      buildPoint: (x, y, data) => ({
        x,
        y,
        retrievability: data.averageRetrievability,
        date: data.date,
      }),
    });

    const performanceZones = createStandardizedPerformanceZones(GRAPH_HEIGHT_LARGE, 0, chartColors);

    // Get today's data for insights
    const todayData = retrievabilityData[0]; // Today (leftmost, in UTC)
    const currentRetrievability = todayData?.averageRetrievability || 0;
    const criticalWords = todayData?.criticalWords || 0;
    // End of the forecast window — where memory lands if nothing is reviewed
    const weekData = retrievabilityData[retrievabilityData.length - 1];
    const weekRetrievability = weekData?.averageRetrievability || 0;

    // Only words with a review behind them carry a memory state, so they are
    // the only ones the forgetting curve can speak for.
    const measuredWords = todayData?.wordCount ?? 0;

    // Σ R over measured words. Computed from the UNROUNDED average so it stays
    // the same quantity the gauge shows, and clamped so it can never claim more
    // recallable words than there are words to recall.
    const recallableWords = Math.min(
      measuredWords,
      Math.round((currentRetrievability / 100) * measuredWords),
    );

    // How many more words slip below the critical line across the window.
    // Max(0, …) is defensive only: retrievability decays monotonically, so the
    // week's critical count can never be lower than today's.
    const criticalWordsInWeek = Math.max(0, (weekData?.criticalWords ?? 0) - criticalWords);

    return {
      retrievabilityPath,
      // Needs something measured, not merely something saved. With words added
      // but none practised the average is taken over an empty set and rendered
      // as a flat 0% — telling a learner who just built a list that they would
      // remember none of it. That is an empty state, not a score.
      hasData: measuredWords > 0,
      dangerZones: performanceZones,
      dataPoints: points,
      insights: {
        currentRetrievability: Math.round(currentRetrievability),
        weekRetrievability: Math.round(weekRetrievability),
        criticalWords,
        criticalWordsInWeek,
        recallableWords,
        measuredWords,
      },
    };
  }, [retrievabilityData, chartColors]);

  return { retrievabilityData, chartData };
}
