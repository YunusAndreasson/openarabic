import { useMemo } from 'react';

import type { DataPoint } from '@/components/common/charts';
import type { StudyWord } from '@/types/vocabulary.types';

import { parseWordBasic, useCountBasedChart } from './useCountBasedChart';

interface LearnedRecord {
  date: Date;
  learnedCount: number;
  totalCount: number;
  learnedRate: number;
}

interface ChartInsights {
  currentCount: number;
  trend: 'declining' | 'improving' | 'stable';
  totalLearned: number;
  weeklyChange?: number;
}

interface Milestone {
  x: number;
  y: number;
  count: number;
  achieved: boolean;
  date: Date;
}

interface ChartPoint {
  x: number;
  y: number;
  count: number;
  date: Date;
}

interface UseLearnedChartReturn {
  learnedPath: string;
  hasData: boolean;
  milestones: Milestone[];
  points: ChartPoint[];
  tooltipPoints: DataPoint<LearnedRecord>[];
  subtitle: string;
  xLabels: string[];
  xLabelPositions: number[];
  insights: ChartInsights;
  maxCount: number;
}

export function useLearnedChart(studyWords: StudyWord[] = []): UseLearnedChartReturn {
  // Configuration for learned words chart
  const config = useMemo(
    () => ({
      parseWord: parseWordBasic,
      shouldCountWord: (word: ReturnType<typeof parseWordBasic>, date: Date) => {
        const { state, lastReview } = word;
        // Count all State 2 words that have been reviewed by this date
        return state === 2 && lastReview !== null && lastReview <= date;
      },
      buildDailyData: (date: Date, count: number, totalCount: number): LearnedRecord => {
        const learnedRate = totalCount > 0 ? (count / totalCount) * 100 : 0;
        return { date, learnedCount: count, totalCount, learnedRate };
      },
      getCount: (data: LearnedRecord) => data.learnedCount,
      zeroStateMessage: 'Start reviewing to see learned words',
      pathFieldName: 'learnedPath',
      insightsTotalFieldName: 'totalLearned',
    }),
    [],
  );

  // Use generic factory with learned-specific configuration
  const result = useCountBasedChart(studyWords, config);

  // Map generic result to learned-specific field names
  return {
    learnedPath: result.path,
    hasData: result.hasData,
    milestones: result.milestones,
    points: result.points,
    tooltipPoints: result.tooltipPoints,
    subtitle: result.subtitle,
    xLabels: result.xLabels,
    xLabelPositions: result.xLabelPositions,
    insights: {
      currentCount: result.insights.currentCount,
      trend: result.insights.trend,
      totalLearned: result.insights.totalCount,
      weeklyChange: result.insights.weeklyChange,
    },
    maxCount: result.maxCount,
  };
}
