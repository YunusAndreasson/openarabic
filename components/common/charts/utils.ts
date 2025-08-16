import type { ChartColors } from '@/types/ui/chart.types';
import type { StudyWord } from '@/types/vocabulary.types';

import { PERFORMANCE_THRESHOLDS } from './constants';

// Generate date range for charts - using UTC to avoid timezone issues
export const generateDateRange = (days: number) => {
  const today = new Date();
  // Create UTC date for today at 23:59:59.999
  const utcToday = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999)
  );

  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(utcToday);
    date.setUTCDate(utcToday.getUTCDate() - i);
    dates.push(date);
  }

  return dates;
};

// Get UTC date string (YYYY-MM-DD) for consistent timezone handling
export const getUTCDateString = (date: Date): string => {
  const dateString = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  )
    .toISOString()
    .split('T')[0];
  return dateString || '';
};

// Check if dates match (same day) - using UTC to avoid timezone issues
export const isSameDay = (date1: Date, date2: Date): boolean => {
  // Convert both dates to UTC and compare year/month/day
  const utc1 = new Date(Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate()));
  const utc2 = new Date(Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate()));
  return utc1.getTime() === utc2.getTime();
};

// Calculate retrievability using FSRS formula
export const calculateRetrievability = (
  word: StudyWord,
  targetDate: Date,
  lastReviewDate?: Date
): number => {
  const stability = word.fsrs_stability ?? 0;
  const lastReview =
    lastReviewDate ?? (word.fsrs_last_review ? new Date(word.fsrs_last_review) : null);

  if (!lastReview || stability <= 0) {
    return 0;
  }

  const daysSinceReview = (targetDate.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

  // Correct FSRS retrievability formula: R = exp(-t/S)
  // where t = days since review, S = stability
  const retrievability = Math.exp(-daysSinceReview / stability);

  return Math.max(0, Math.min(1, retrievability));
};

// Calculate learning efficiency score
export const calculateEfficiencyScore = (word: StudyWord): number => {
  // Handle NaN and invalid values
  const difficulty = isNaN(word.fsrs_difficulty ?? 6.5) ? 6.5 : word.fsrs_difficulty ?? 6.5;
  const lapses = isNaN(word.fsrs_lapses ?? 0) ? 0 : word.fsrs_lapses ?? 0;
  const stability = isNaN(word.fsrs_stability ?? 0) ? 0 : word.fsrs_stability ?? 0;
  const state = isNaN(word.fsrs_state ?? 0) ? 0 : word.fsrs_state ?? 0;
  const reps = isNaN(word.fsrs_reps ?? 0) ? 0 : word.fsrs_reps ?? 0;

  let score = 0;

  // State progression (40% weight) - aligned with FSRS states
  if (state === 2 && stability >= 5) {
    // Mastered: review state with good stability
    score += 40;
  } else if (state === 2 && stability < 5) {
    // Review but unstable
    score += 30;
  } else if (state === 1 && reps > 1) {
    // Learning with progress
    score += 25;
  } else if (state === 0 && reps === 1) {
    // Just started learning
    score += 15;
  } else if (state === 3) {
    // Relearning (failed)
    score += 10;
  }

  // Stability quality (30% weight) - better thresholds
  if (stability >= 30) score += 30;
  else if (stability >= 14) score += 25;
  else if (stability >= 7) score += 20;
  else if (stability >= 3) score += 15;
  else if (stability >= 1) score += 10;
  else if (stability > 0) score += 5;

  // Lapse rate (20% weight) - penalize failures more appropriately
  if (lapses === 0) score += 20;
  else if (lapses === 1) score += 15;
  else if (lapses === 2) score += 10;
  else if (lapses <= 4) score += 5;
  // No points for 5+ lapses

  // Difficulty balance (10% weight) - FSRS difficulty ranges 5-10, optimal around 6.5-8.0
  if (difficulty >= 6.0 && difficulty <= 8.5) score += 10; // Optimal learning zone
  else if (difficulty >= 5.5 && difficulty <= 9.0) score += 7; // Good range
  else if (difficulty >= 5.0 && difficulty <= 9.5) score += 5; // Acceptable range
  else if (difficulty >= 4.5 && difficulty <= 10.0) score += 2; // Edge cases

  return Math.min(100, score); // Cap at 100
};

/**
 * Creates standardized performance zones for charts
 * Simplified: Clean 4-zone system with unified sage green theme
 * @param chartHeight - Height of the chart area
 * @param topPadding - Top padding (default 0)
 * @param chartColors - Chart colors object
 * @returns Array of performance zone objects
 */
export const createStandardizedPerformanceZones = (
  chartHeight: number,
  topPadding: number = 0,
  chartColors: ChartColors
) => {
  const availableHeight = chartHeight - topPadding;

  return [
    {
      name: 'Excellent',
      min: PERFORMANCE_THRESHOLDS.EXCELLENT,
      max: 100,
      color: chartColors.withOpacity(chartColors.performance.excellent, 0.15),
      y: topPadding,
      height: ((100 - PERFORMANCE_THRESHOLDS.EXCELLENT) / 100) * availableHeight,
    },
    {
      name: 'Good',
      min: PERFORMANCE_THRESHOLDS.GOOD,
      max: PERFORMANCE_THRESHOLDS.EXCELLENT,
      color: chartColors.withOpacity(chartColors.performance.good, 0.15),
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.EXCELLENT) / 100) * availableHeight,
      height:
        ((PERFORMANCE_THRESHOLDS.EXCELLENT - PERFORMANCE_THRESHOLDS.GOOD) / 100) * availableHeight,
    },
    {
      name: 'Fair',
      min: PERFORMANCE_THRESHOLDS.FAIR,
      max: PERFORMANCE_THRESHOLDS.GOOD,
      color: chartColors.withOpacity(chartColors.performance.moderate, 0.15),
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.GOOD) / 100) * availableHeight,
      height: ((PERFORMANCE_THRESHOLDS.GOOD - PERFORMANCE_THRESHOLDS.FAIR) / 100) * availableHeight,
    },
    {
      name: 'Poor',
      min: PERFORMANCE_THRESHOLDS.POOR,
      max: PERFORMANCE_THRESHOLDS.FAIR,
      color: chartColors.withOpacity(chartColors.performance.poor, 0.15),
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.FAIR) / 100) * availableHeight,
      height: ((PERFORMANCE_THRESHOLDS.FAIR - PERFORMANCE_THRESHOLDS.POOR) / 100) * availableHeight,
    },
  ];
};

/**
 * Creates a smooth area fill path for line charts
 * @param smoothPath - The main line path
 * @param graphWidth - Width of the graph
 * @param graphHeight - Height of the graph
 * @returns Area fill path string
 */
export const createAreaFillPath = (
  smoothPath: string,
  graphWidth: number,
  graphHeight: number
): string => {
  return `${smoothPath} L ${graphWidth} ${graphHeight} L 0 ${graphHeight} Z`;
};

// UTC date format helpers (DRY across charts)
export const formatWeekdayUTC = (date: Date): string =>
  date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

export const formatMonthDayUTC = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

export const calculateSevenDayAverage = (values: number[]): number => {
  if (values.length === 0) return 0;
  const sum = values.reduce((s, v) => s + v, 0);
  return sum / values.length;
};
