import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  getEffectiveChartHeight,
} from '@charts/constants';
import { buildSmoothChartPath } from '@charts/pathBuilder';
import { useMemo } from 'react';

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
      Math.max(...dueWordsData.map(d => d.dueWords)),
    );

    // Create smooth curve using shared path builder utility
    const chartHeight = getEffectiveChartHeight();
    const dataPointPositions = calculateDataPointPositions(dueWordsData.length);

    const { path: dueWordsPath, points } = buildSmoothChartPath({
      data: dueWordsData,
      dataPointPositions,
      calculateY: data =>
        CHART_VISUAL.CHART_TOP_PADDING +
        (chartHeight - (data.dueWords / maxDueWords) * chartHeight),
      buildPoint: (x, y, data) => ({ x, y, dueWords: data.dueWords, date: data.date }),
    });

    // Calculate trend using utility function
    const trend = calculateDueWordsTrend(dueWordsData);

    // Get insights
    const todayData = dueWordsData[0]; // Today (leftmost)
    const currentDue = todayData?.dueWords || 0;
    const peakDue = Math.max(...dueWordsData.map(d => d.dueWords));

    return {
      dueWordsPath,
      // Show the chart whenever the user has any study words
      hasData: (studyWords?.length ?? 0) > 0,
      dataPoints: points,
      insights: {
        currentDue,
        peakDue,
        trend,
      },
    };
  }, [dueWordsData, studyWords?.length]);

  return { dueWordsData, chartData };
}
