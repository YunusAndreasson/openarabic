import { useMemo } from 'react';

import type { DataPoint } from '@/components/common/charts';
import { generateChartSubtitle } from '@/components/common/charts/ChartMessages';
import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  getEffectiveChartHeight,
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

interface ChartInsights {
  currentCount: number;
  trend: 'declining' | 'improving' | 'stable';
  totalCount: number;
  weeklyChange?: number;
}

interface ParsedWord {
  createdAt: Date;
  lastReview: Date | null;
  state: number;
  stability?: number;
}

interface DailyData {
  date: Date;
  totalCount: number;
}

interface CountBasedChartConfig<T extends DailyData> {
  /**
   * Parse StudyWord into simplified format for counting
   */
  parseWord: (word: StudyWord) => ParsedWord;

  /**
   * Determine if a word meets the counting criteria for a given date
   */
  shouldCountWord: (word: ParsedWord, date: Date) => boolean;

  /**
   * Build daily data record with correct field names
   */
  buildDailyData: (date: Date, count: number, totalCount: number) => T;

  /**
   * Extract count value from daily data
   */
  getCount: (data: T) => number;

  /**
   * Message to show when count is zero
   */
  zeroStateMessage: string;

  /**
   * Field name for the path in return object
   */
  pathFieldName: string;

  /**
   * Field name for insights total
   */
  insightsTotalFieldName: string;
}

interface UseCountBasedChartReturn<T extends DailyData> {
  path: string;
  hasData: boolean;
  milestones: Milestone[];
  points: ChartPoint[];
  tooltipPoints: DataPoint<T>[];
  subtitle: string;
  xLabels: string[];
  xLabelPositions: number[];
  insights: ChartInsights;
  maxCount: number;
}

/**
 * Generic factory hook for count-based vocabulary charts
 *
 * Consolidates shared logic for charts that track word counts over time (learned, mastered, etc.)
 * Eliminates duplication across multiple chart hooks with similar patterns
 */
export function useCountBasedChart<T extends DailyData>(
  studyWords: StudyWord[],
  config: CountBasedChartConfig<T>,
): UseCountBasedChartReturn<T> {
  // Parse words with configuration-specific logic
  const parsedWords = useMemo(
    () => studyWords.map(config.parseWord),
    [studyWords, config.parseWord],
  );

  // Generate daily data using configuration-specific counting logic
  const dailyData = useMemo(() => {
    const dates = generateDateRange(DAYS_7);

    return dates.map(date => {
      let count = 0;
      let totalCount = 0;

      parsedWords.forEach(word => {
        if (word.createdAt <= date) {
          totalCount++;

          if (config.shouldCountWord(word, date)) {
            count++;
          }
        }
      });

      return config.buildDailyData(date, count, totalCount);
    });
  }, [parsedWords, config]);

  // Build chart data (path, milestones, trend analysis)
  const chartData = useMemo(() => {
    if (dailyData.length === 0) {
      return {
        path: '',
        hasData: false,
        milestones: [] as Milestone[],
        points: [] as ChartPoint[],
        insights: { currentCount: 0, trend: 'stable' as const, totalCount: 0 },
        maxCount: 0,
      };
    }

    const counts = dailyData.map(config.getCount);
    const maxCount = Math.max(1, Math.max(...counts));
    const chartHeight = getEffectiveChartHeight();

    // Create smooth curve using shared path builder utility
    const dataPointPositions = calculateDataPointPositions(dailyData.length);
    const { path, points } = buildSmoothChartPath({
      data: dailyData,
      dataPointPositions,
      calculateY: data =>
        CHART_VISUAL.CHART_TOP_PADDING +
        (chartHeight - (config.getCount(data) / maxCount) * chartHeight),
      buildPoint: (x, y, data) => ({ x, y, count: config.getCount(data), date: data.date }),
    });

    // Milestones based on word count thresholds (10, 25, 50, 100 words)
    const countMilestones = [10, 25, 50, 100];
    const milestones = countMilestones
      .map(target => {
        const milestone = dailyData.find(d => config.getCount(d) >= target);
        if (milestone) {
          const index = dailyData.indexOf(milestone);
          const x = dataPointPositions[index] || 0;
          const milestoneCount = config.getCount(milestone);
          const y =
            CHART_VISUAL.CHART_TOP_PADDING +
            (chartHeight - (milestoneCount / maxCount) * chartHeight);
          return { x, y, count: target, achieved: true, date: milestone.date } as Milestone;
        }
        return { x: 0, y: 0, count: target, achieved: false, date: new Date() } as Milestone;
      })
      .filter(m => m.achieved);

    // Trend analysis: compare recent 4 days vs older 3 days
    const recent = dailyData.slice(-4);
    const older = dailyData.slice(-7, -4);

    const lastDayForCurrent = recent[recent.length - 1];
    const currentCount = lastDayForCurrent ? config.getCount(lastDayForCurrent) : 0;
    const recentAvg =
      recent.length > 0
        ? recent.reduce((sum, day) => sum + config.getCount(day), 0) / recent.length
        : 0;
    const olderAvg =
      older.length > 0
        ? older.reduce((sum, day) => sum + config.getCount(day), 0) / older.length
        : 0;

    const change = recentAvg - olderAvg;
    const trend: 'declining' | 'improving' | 'stable' =
      change > MASTERY_TREND_THRESHOLD
        ? 'improving'
        : change < -MASTERY_TREND_THRESHOLD
          ? 'declining'
          : 'stable';
    const lastDay = recent[recent.length - 1];
    const totalCount = lastDay ? config.getCount(lastDay) : 0;

    return {
      path,
      hasData: studyWords.length > 0,
      milestones,
      points,
      insights: {
        currentCount: Math.round(currentCount),
        trend,
        totalCount,
        weeklyChange: Math.round(change),
      },
      maxCount,
    };
  }, [dailyData, config, studyWords.length]);

  // Generate subtitle based on current state
  const subtitle = useMemo(() => {
    const { currentCount, trend, weeklyChange } = chartData.insights;

    if (currentCount === 0) {
      return config.zeroStateMessage;
    }

    return generateChartSubtitle.mastery(currentCount, trend, weeklyChange ?? 0);
  }, [chartData.insights, config.zeroStateMessage]);

  // Build tooltip points for interactive display
  const tooltipPoints: DataPoint<T>[] = useMemo(() => {
    return chartData.points
      .map((point, index) => {
        const data = dailyData[index];
        if (!data || !point || typeof point.x !== 'number' || typeof point.y !== 'number')
          return null;

        return {
          x: point.x,
          y: point.y,
          value: `${config.getCount(data)} words`,
          label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          data,
        } as DataPoint<T>;
      })
      .filter(
        (point): point is DataPoint<T> =>
          point !== null && Boolean(point.label) && Boolean(point.value),
      );
  }, [chartData.points, dailyData, config]);

  // Generate x-axis labels (day names)
  const xLabels = useMemo(
    () =>
      dailyData.map(d => d.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })),
    [dailyData],
  );
  const xLabelPositions = useMemo(() => chartData.points.map(p => p.x), [chartData.points]);

  return {
    path: chartData.path,
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

/**
 * Helper to create parsed word for learned/mastery charts
 */
export function parseWordBasic(word: StudyWord): ParsedWord {
  return {
    createdAt: parseSupabaseTimestamp(word.created_at) ?? new Date(0),
    lastReview: parseSupabaseTimestamp(word.fsrs_last_review),
    state: word.fsrs_state ?? 0,
  };
}

/**
 * Helper to create parsed word with stability for mastery charts
 */
export function parseWordWithStability(word: StudyWord): ParsedWord {
  return {
    createdAt: parseSupabaseTimestamp(word.created_at) ?? new Date(0),
    lastReview: parseSupabaseTimestamp(word.fsrs_last_review),
    state: word.fsrs_state ?? 0,
    stability: word.fsrs_stability ?? 0,
  };
}
