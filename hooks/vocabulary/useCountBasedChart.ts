import { useMemo } from 'react';

import type { DataPoint } from '@/components/common/charts';
import {
  calculateDataPointPositions,
  CHART_VISUAL,
  DAYS_7,
  getEffectiveChartHeight,
} from '@/constants/chartConstants';
import { STRINGS } from '@/constants/strings';
import { buildSmoothChartPath } from '@/utils/chartPathBuilder';
import { generateDateRange } from '@/utils/chartDataUtils';
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
  /** Count change across the chart window (last day minus first day) */
  windowChange?: number;
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

  /**
   * Days of history to chart (default 7). Windows longer than a week get
   * weekly axis labels and weekly marker/tooltip sampling — the line still
   * renders every day.
   */
  windowDays?: number;
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
  const windowDays = config.windowDays ?? DAYS_7;

  // Parse words with configuration-specific logic
  const parsedWords = useMemo(
    () => studyWords.map(config.parseWord),
    [studyWords, config.parseWord],
  );

  // Generate daily data using configuration-specific counting logic
  const dailyData = useMemo(() => {
    const dates = generateDateRange(windowDays);

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
  }, [parsedWords, config, windowDays]);

  // Indices carrying markers/labels: every day for a week view,
  // weekly steps back from today for longer windows
  const sampledIndices = useMemo(() => {
    if (dailyData.length <= DAYS_7) {
      return dailyData.map((_, index) => index);
    }
    const lastIndex = dailyData.length - 1;
    const indices: number[] = [];
    for (let index = lastIndex; index >= 0; index -= DAYS_7) {
      indices.unshift(index);
    }
    return indices;
  }, [dailyData]);

  // Build chart data (path, milestones, trend analysis)
  const chartData = useMemo(() => {
    if (dailyData.length === 0) {
      return {
        path: '',
        hasData: false,
        milestones: [] as Milestone[],
        points: [] as ChartPoint[],
        allPoints: [] as ChartPoint[],
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

    // Trend: change across the whole window (cumulative counts only grow,
    // so first-to-last is the honest delta — no rate grading)
    const firstDay = dailyData[0];
    const lastDay = dailyData[dailyData.length - 1];
    const firstCount = firstDay ? config.getCount(firstDay) : 0;
    const totalCount = lastDay ? config.getCount(lastDay) : 0;
    const change = totalCount - firstCount;
    const trend: 'declining' | 'improving' | 'stable' =
      change > MASTERY_TREND_THRESHOLD
        ? 'improving'
        : change < -MASTERY_TREND_THRESHOLD
          ? 'declining'
          : 'stable';

    // Markers/tooltips at sampled indices only; the line covers every day
    const sampledPoints = sampledIndices
      .map(index => points[index])
      .filter((point): point is ChartPoint => Boolean(point));

    return {
      path,
      hasData: studyWords.length > 0,
      milestones,
      points: sampledPoints,
      allPoints: points,
      insights: {
        currentCount: totalCount,
        trend,
        totalCount,
        windowChange: Math.round(change),
      },
      maxCount,
    };
  }, [dailyData, config, studyWords.length, sampledIndices]);

  // Plain, honest subtitle: total + window delta (no performance grading)
  const subtitle = useMemo(() => {
    const { totalCount, windowChange } = chartData.insights;

    if (totalCount === 0) {
      return config.zeroStateMessage;
    }

    const period = windowDays >= 28 ? STRINGS.SUMMARY_THIS_MONTH : STRINGS.SUMMARY_TODAY;
    const delta = windowChange ?? 0;
    const deltaText = delta > 0 ? ` · +${delta} ${period.toLowerCase()}` : '';
    return `${totalCount} ${STRINGS.MASTERED_LOWER}${deltaText}`;
  }, [chartData.insights, config.zeroStateMessage, windowDays]);

  // Build tooltip points for interactive display (sampled indices)
  const tooltipPoints: DataPoint<T>[] = useMemo(() => {
    return sampledIndices
      .map(index => {
        const data = dailyData[index];
        const point = chartData.allPoints[index];
        if (!data || !point || typeof point.x !== 'number' || typeof point.y !== 'number')
          return null;

        return {
          x: point.x,
          y: point.y,
          value: `${config.getCount(data)} ${STRINGS.SUMMARY_WORDS_SUFFIX}`,
          label: data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          data,
        } as DataPoint<T>;
      })
      .filter(
        (point): point is DataPoint<T> =>
          point !== null && Boolean(point.label) && Boolean(point.value),
      );
  }, [chartData.allPoints, dailyData, config, sampledIndices]);

  // X-axis labels: weekday names for a week, "3w/2w/1w + today" for a month
  const xLabels = useMemo(() => {
    const lastIndex = dailyData.length - 1;
    return sampledIndices.map(index => {
      const data = dailyData[index];
      if (!data) return '';
      if (dailyData.length <= DAYS_7) {
        return data.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
      }
      const weeksAgo = Math.round((lastIndex - index) / DAYS_7);
      // The last label is replaced by "Today" in ChartAxes
      return weeksAgo === 0
        ? data.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })
        : `${weeksAgo}w`;
    });
  }, [dailyData, sampledIndices]);

  const xLabelPositions = useMemo(
    () =>
      sampledIndices
        .map(index => chartData.allPoints[index]?.x)
        .filter((x): x is number => typeof x === 'number'),
    [chartData.allPoints, sampledIndices],
  );

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
