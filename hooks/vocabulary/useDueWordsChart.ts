import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  getEffectiveChartHeight,
} from '@/constants/chartConstants';
import { buildSmoothChartPath } from '@/utils/chartPathBuilder';
import { getNiceAxisMax } from '@/utils/chartUtils';
import { useMemo } from 'react';

import type { StudyWord } from '@/types/vocabulary.types';
import { calculateDueWordsForecast, type DueWordsForecast } from '@/utils/fsrsUtils';

/** Below this the forecast is a handful of words and the line would fill the box. */
const MIN_DUE_WORDS_SCALE = 10;

/**
 * The top of the forecast's y-axis. The hook scales the line to it and the
 * chart labels the gridlines from it, so both read it from here.
 */
export function getDueWordsAxisMax(
  forecast: readonly Pick<DueWordsForecast, 'dueWords'>[],
): number {
  const peak = forecast.reduce((max, day) => Math.max(max, day.dueWords), 0);
  return getNiceAxisMax(Math.max(MIN_DUE_WORDS_SCALE, peak));
}

interface DueWordsChartData {
  dueWordsPath: string;
  hasData: boolean;
  dataPoints: { x: number; y: number; dueWords: number; date: Date }[];
  insights: {
    currentDue: number;
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
        insights: { currentDue: 0 },
        dataPoints: [],
      };
    }

    const maxDueWords = getDueWordsAxisMax(dueWordsData);

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

    // Get insights
    const todayData = dueWordsData[0]; // Today (leftmost)
    const currentDue = todayData?.dueWords || 0;

    return {
      dueWordsPath,
      // Show the chart whenever the user has any study words
      hasData: (studyWords?.length ?? 0) > 0,
      dataPoints: points,
      insights: {
        currentDue,
      },
    };
  }, [dueWordsData, studyWords?.length]);

  return { dueWordsData, chartData };
}
