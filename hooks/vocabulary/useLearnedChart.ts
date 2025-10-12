import { useMemo } from 'react';

import type { DataPoint } from '@/components/common/charts';
import { generateChartSubtitle } from '@/components/common/charts/ChartMessages';
import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  GRAPH_HEIGHT_LARGE,
} from '@/components/common/charts/constants';
import { buildSmoothChartPath } from '@/components/common/charts/pathBuilder';
import { generateDateRange } from '@/components/common/charts/utils';
import { MASTERY_TREND_THRESHOLD } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

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

interface ChartData {
  learnedPath: string;
  hasData: boolean;
  milestones: Milestone[];
  points: ChartPoint[];
  insights: ChartInsights;
  maxCount: number;
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
  const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;

  const parsedWords = useMemo(
    () =>
      studyWords.map(word => ({
        // Robust normalization for Supabase timestamp (Hermes-friendly)
        // Fallback to epoch if parsing fails so words are counted historically
        createdAt: parseSupabaseTimestamp(word.created_at) ?? new Date(0),
        lastReview: parseSupabaseTimestamp(word.fsrs_last_review),
        state: word.fsrs_state,
      })),
    [studyWords]
  );

  const learnedData = useMemo(() => {
    const dates = generateDateRange(DAYS_7);

    return dates.map(date => {
      let learnedCount = 0;
      let totalCount = 0;

      parsedWords.forEach(word => {
        if (word.createdAt <= date) {
          totalCount++;

          const { state, lastReview } = word;

          // Count all State 2 words that have been reviewed by this date
          if (state === 2 && lastReview && lastReview <= date) {
            learnedCount++;
          }
        }
      });

      const learnedRate = totalCount > 0 ? (learnedCount / totalCount) * 100 : 0;
      return { date, learnedCount, totalCount, learnedRate };
    });
  }, [parsedWords]);

  const chartData = useMemo<ChartData>(() => {
    // Always render a 7-day chart; show as zeros if there was no recent activity
    if (learnedData.length === 0) {
      return {
        learnedPath: '',
        hasData: false,
        milestones: [] as Milestone[],
        points: [] as ChartPoint[],
        insights: { currentCount: 0, trend: 'stable' as const, totalLearned: 0 },
        maxCount: 0,
      };
    }

    const maxCount = Math.max(1, Math.max(...learnedData.map(d => d.learnedCount)));
    const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING;

    // Create smooth curve using shared path builder utility
    const dataPointPositions = calculateDataPointPositions(learnedData.length);
    const { path: learnedPath, points } = buildSmoothChartPath({
      data: learnedData,
      dataPointPositions,
      calculateY: data => TOP_PADDING + (chartHeight - (data.learnedCount / maxCount) * chartHeight),
      buildPoint: (x, y, data) => ({ x, y, count: data.learnedCount, date: data.date }),
    });

    // Milestones based on word count thresholds (10, 25, 50, 100 words)
    const countMilestones = [10, 25, 50, 100];
    const milestones = countMilestones
      .map(target => {
        const milestone = learnedData.find(d => d.learnedCount >= target);
        if (milestone) {
          const index = learnedData.indexOf(milestone);
          const x = dataPointPositions[index] || 0;
          const y = TOP_PADDING + (chartHeight - (milestone.learnedCount / maxCount) * chartHeight);
          return { x, y, count: target, achieved: true, date: milestone.date } as Milestone;
        }
        return { x: 0, y: 0, count: target, achieved: false, date: new Date() } as Milestone;
      })
      .filter(m => m.achieved);

    const recent = learnedData.slice(-4);
    const older = learnedData.slice(-7, -4);

    const currentCount = recent[recent.length - 1]?.learnedCount || 0;
    const recentAvg =
      recent.length > 0 ? recent.reduce((sum, day) => sum + day.learnedCount, 0) / recent.length : 0;
    const olderAvg =
      older.length > 0 ? older.reduce((sum, day) => sum + day.learnedCount, 0) / older.length : 0;

    const change = recentAvg - olderAvg;
    const trend =
      change > MASTERY_TREND_THRESHOLD
        ? 'improving'
        : change < -MASTERY_TREND_THRESHOLD
        ? 'declining'
        : 'stable';
    const totalLearned = recent[recent.length - 1]?.learnedCount || 0;

    return {
      learnedPath,
      // Show the chart whenever the user has any study words, regardless of due words
      hasData: (studyWords?.length ?? 0) > 0,
      milestones,
      points,
      insights: {
        currentCount: Math.round(currentCount),
        trend,
        totalLearned,
        weeklyChange: Math.round(change),
      },
      maxCount,
    };
  }, [learnedData, studyWords?.length]);

  const subtitle = useMemo(() => {
    const { currentCount, trend, weeklyChange } = chartData.insights;

    if (currentCount === 0) {
      return 'Start reviewing to see learned words';
    }

    return generateChartSubtitle.mastery(currentCount, trend, weeklyChange ?? 0);
  }, [chartData.insights]);

  const tooltipPoints: DataPoint<LearnedRecord>[] = useMemo(() => {
    return chartData.points
      .map((point, index) => {
        const data = learnedData[index];
        if (!data || !point || typeof point.x !== 'number' || typeof point.y !== 'number')
          return null;

        return {
          x: point.x,
          y: point.y,
          value: `${data.learnedCount} words`,
          label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          data,
        } as DataPoint<LearnedRecord>;
      })
      .filter(
        (point): point is DataPoint<LearnedRecord> =>
          point !== null && !!point.label && !!point.value
      );
  }, [chartData.points, learnedData]);

  const xLabels = useMemo(
    () =>
      learnedData.map(d =>
        d.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
      ),
    [learnedData]
  );
  const xLabelPositions = useMemo(() => chartData.points.map(p => p.x), [chartData.points]);

  return {
    learnedPath: chartData.learnedPath,
    hasData: chartData.hasData,
    milestones: chartData.milestones,
    points: chartData.points,
    tooltipPoints,
    subtitle,
    xLabels,
    xLabelPositions,
    insights: chartData.insights,
    maxCount: chartData.maxCount,
  };
}
