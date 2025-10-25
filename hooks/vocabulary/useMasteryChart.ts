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

interface ChartData {
  masteryPath: string;
  hasData: boolean;
  milestones: Milestone[];
  points: ChartPoint[];
  insights: ChartInsights;
  maxCount: number;
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
  const TOP_PADDING = CHART_VISUAL.CHART_TOP_PADDING;

  const parsedWords = useMemo(
    () =>
      studyWords.map(word => ({
        // Robust normalization for Supabase timestamp (Hermes-friendly)
        // Fallback to epoch if parsing fails so words are counted historically
        createdAt: parseSupabaseTimestamp(word.created_at) ?? new Date(0),
        lastReview: parseSupabaseTimestamp(word.fsrs_last_review),
        state: word.fsrs_state,
        stability: word.fsrs_stability ?? 0,
      })),
    [studyWords],
  );

  const masteryData = useMemo(() => {
    const dates = generateDateRange(DAYS_7);

    return dates.map(date => {
      let masteredCount = 0;
      let totalCount = 0;

      parsedWords.forEach(word => {
        if (word.createdAt <= date) {
          totalCount++;

          const { state, stability, lastReview } = word;

          if (state === 2 && stability >= 5 && lastReview && lastReview <= date) {
            masteredCount++;
          }
        }
      });

      const masteryRate = totalCount > 0 ? (masteredCount / totalCount) * 100 : 0;
      return { date, masteredCount, totalCount, masteryRate };
    });
  }, [parsedWords]);

  const chartData = useMemo<ChartData>(() => {
    // Always render a 7-day chart; show as zeros if there was no recent activity
    if (masteryData.length === 0) {
      return {
        masteryPath: '',
        hasData: false,
        milestones: [] as Milestone[],
        points: [] as ChartPoint[],
        insights: { currentCount: 0, trend: 'stable' as const, totalMastered: 0 },
        maxCount: 0,
      };
    }

    const maxCount = Math.max(1, Math.max(...masteryData.map(d => d.masteredCount)));
    const chartHeight = GRAPH_HEIGHT_LARGE - TOP_PADDING;

    // Create smooth curve using shared path builder utility
    const dataPointPositions = calculateDataPointPositions(masteryData.length);
    const { path: masteryPath, points } = buildSmoothChartPath({
      data: masteryData,
      dataPointPositions,
      calculateY: data =>
        TOP_PADDING + (chartHeight - (data.masteredCount / maxCount) * chartHeight),
      buildPoint: (x, y, data) => ({ x, y, count: data.masteredCount, date: data.date }),
    });

    // Milestones based on word count thresholds (10, 25, 50, 100 words)
    const countMilestones = [10, 25, 50, 100];
    const milestones = countMilestones
      .map(target => {
        const milestone = masteryData.find(d => d.masteredCount >= target);
        if (milestone) {
          const index = masteryData.indexOf(milestone);
          const x = dataPointPositions[index] || 0;
          const y =
            TOP_PADDING + (chartHeight - (milestone.masteredCount / maxCount) * chartHeight);
          return { x, y, count: target, achieved: true, date: milestone.date } as Milestone;
        }
        return { x: 0, y: 0, count: target, achieved: false, date: new Date() } as Milestone;
      })
      .filter(m => m.achieved);

    const recent = masteryData.slice(-4);
    const older = masteryData.slice(-7, -4);

    const currentCount = recent[recent.length - 1]?.masteredCount || 0;
    const recentAvg =
      recent.length > 0
        ? recent.reduce((sum, day) => sum + day.masteredCount, 0) / recent.length
        : 0;
    const olderAvg =
      older.length > 0 ? older.reduce((sum, day) => sum + day.masteredCount, 0) / older.length : 0;

    const change = recentAvg - olderAvg;
    const trend =
      change > MASTERY_TREND_THRESHOLD
        ? 'improving'
        : change < -MASTERY_TREND_THRESHOLD
          ? 'declining'
          : 'stable';
    const totalMastered = recent[recent.length - 1]?.masteredCount || 0;

    return {
      masteryPath,
      // Show the chart whenever the user has any study words, regardless of due words
      hasData: (studyWords?.length ?? 0) > 0,
      milestones,
      points,
      insights: {
        currentCount: Math.round(currentCount),
        trend,
        totalMastered,
        weeklyChange: Math.round(change),
      },
      maxCount,
    };
  }, [masteryData, studyWords?.length]);

  const subtitle = useMemo(() => {
    const { currentCount, trend, weeklyChange } = chartData.insights;

    if (currentCount === 0) {
      return 'Start reviewing to build memory strength';
    }

    return generateChartSubtitle.mastery(currentCount, trend, weeklyChange ?? 0);
  }, [chartData.insights]);

  const tooltipPoints: DataPoint<MasteryRecord>[] = useMemo(() => {
    return chartData.points
      .map((point, index) => {
        const data = masteryData[index];
        if (!data || !point || typeof point.x !== 'number' || typeof point.y !== 'number')
          return null;

        return {
          x: point.x,
          y: point.y,
          value: `${data.masteredCount} words`,
          label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          data,
        } as DataPoint<MasteryRecord>;
      })
      .filter(
        (point): point is DataPoint<MasteryRecord> =>
          point !== null && !!point.label && !!point.value,
      );
  }, [chartData.points, masteryData]);

  const xLabels = useMemo(
    () =>
      masteryData.map(d =>
        d.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
      ),
    [masteryData],
  );
  const xLabelPositions = useMemo(() => chartData.points.map(p => p.x), [chartData.points]);

  return {
    masteryPath: chartData.masteryPath,
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
