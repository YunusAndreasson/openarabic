import { useMemo } from 'react';

import type { DataPoint } from '@/components/common/charts';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

import { parseWordWithStability, useCountBasedChart } from './useCountBasedChart';

interface MasteryRecord {
  date: Date;
  masteredCount: number;
  totalCount: number;
  masteryRate: number;
}

interface ChartInsights {
  currentCount: number;
  trend: 'declining' | 'improving' | 'stable';
  totalMastered: number;
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

interface UseMasteryChartReturn {
  masteryPath: string;
  hasData: boolean;
  milestones: Milestone[];
  points: ChartPoint[];
  tooltipPoints: DataPoint<MasteryRecord>[];
  subtitle: string;
  xLabels: string[];
  xLabelPositions: number[];
  insights: ChartInsights;
  maxCount: number;
}

export function useMasteryChart(studyWords: StudyWord[] = []): UseMasteryChartReturn {
  // Configuration for mastered words chart
  const config = useMemo(
    () => ({
      parseWord: parseWordWithStability,
      shouldCountWord: (word: ReturnType<typeof parseWordWithStability>, date: Date) => {
        const { state, stability, lastReview } = word;
        // Count State 2 words with stability >= 5 that have been reviewed by this date
        return state === 2 && (stability ?? 0) >= 5 && lastReview !== null && lastReview <= date;
      },
      buildDailyData: (date: Date, count: number, totalCount: number): MasteryRecord => {
        const masteryRate = totalCount > 0 ? (count / totalCount) * 100 : 0;
        return { date, masteredCount: count, totalCount, masteryRate };
      },
      getCount: (data: MasteryRecord) => data.masteredCount,
      zeroStateMessage: STRINGS.START_REVIEWING_TO_BUILD_STRENGTH,
      pathFieldName: 'masteryPath',
      insightsTotalFieldName: 'totalMastered',
    }),
    [],
  );

  // Use generic factory with mastery-specific configuration
  const result = useCountBasedChart(studyWords, config);

  // Map generic result to mastery-specific field names
  return {
    masteryPath: result.path,
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
      totalMastered: result.insights.totalCount,
      weeklyChange: result.insights.weeklyChange,
    },
    maxCount: result.maxCount,
  };
}
