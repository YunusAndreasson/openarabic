import type { StudyWord } from '@/types/vocabulary.types';

import { MASTERY_STABILITY_THRESHOLD, PERFORMANCE_THRESHOLDS } from './constants';

// Generate date range for charts
export const generateDateRange = (days: number) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dates: Date[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(23, 59, 59, 999);
    dates.push(date);
  }

  return dates;
};

// Check if dates match (same day)
export const isSameDay = (date1: Date, date2: Date): boolean => {
  return date1.toDateString() === date2.toDateString();
};

// Calculate FSRS word state
export const getWordState = (word: StudyWord) => {
  const state = word.fsrs_state;
  const stability = word.fsrs_stability ?? 0;
  const hasReview = !!word.fsrs_last_review;

  if (state === 0 || !hasReview) {
    return 'new';
  } else if (
    state === 1 ||
    state === 3 ||
    (state === 2 && stability < MASTERY_STABILITY_THRESHOLD)
  ) {
    return 'learning';
  } else if (state === 2 && stability >= MASTERY_STABILITY_THRESHOLD) {
    return 'mastered';
  } else {
    return 'learning'; // fallback
  }
};

// Calculate retrievability using FSRS formula
export const calculateRetrievability = (word: StudyWord, targetDate: Date): number => {
  const stability = word.fsrs_stability ?? 0;
  const lastReview = word.fsrs_last_review ? new Date(word.fsrs_last_review) : null;

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
  const difficulty = word.fsrs_difficulty ?? 6.5; // Default to medium difficulty in 5-10 range
  const lapses = word.fsrs_lapses ?? 0;
  const stability = word.fsrs_stability ?? 0;
  const state = word.fsrs_state ?? 0;
  const reps = word.fsrs_reps ?? 0;

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
  if (difficulty >= 6.0 && difficulty <= 8.5)
    score += 10; // Optimal learning zone
  else if (difficulty >= 5.5 && difficulty <= 9.0)
    score += 7; // Good range
  else if (difficulty >= 5.0 && difficulty <= 9.5)
    score += 5; // Acceptable range
  else if (difficulty >= 4.5 && difficulty <= 10.0) score += 2; // Edge cases

  return Math.min(100, score); // Cap at 100
};

/**
 * Creates standardized performance zones for charts
 * @param chartHeight - Height of the chart area
 * @param topPadding - Top padding (default 0)
 * @param chartColors - Chart colors object
 * @returns Array of performance zone objects
 */
export const createStandardizedPerformanceZones = (
  chartHeight: number,
  topPadding: number = 0,
  chartColors: any
) => {
  const availableHeight = chartHeight - topPadding;

  return [
    {
      name: 'Excellent',
      min: PERFORMANCE_THRESHOLDS.EXCELLENT,
      max: 100,
      color: chartColors.performance.excellent,
      y: topPadding,
      height: ((100 - PERFORMANCE_THRESHOLDS.EXCELLENT) / 100) * availableHeight,
    },
    {
      name: 'Good',
      min: PERFORMANCE_THRESHOLDS.GOOD,
      max: PERFORMANCE_THRESHOLDS.EXCELLENT,
      color: chartColors.performance.good,
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.EXCELLENT) / 100) * availableHeight,
      height:
        ((PERFORMANCE_THRESHOLDS.EXCELLENT - PERFORMANCE_THRESHOLDS.GOOD) / 100) * availableHeight,
    },
    {
      name: 'Fair',
      min: PERFORMANCE_THRESHOLDS.FAIR,
      max: PERFORMANCE_THRESHOLDS.GOOD,
      color: chartColors.performance.moderate,
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.GOOD) / 100) * availableHeight,
      height: ((PERFORMANCE_THRESHOLDS.GOOD - PERFORMANCE_THRESHOLDS.FAIR) / 100) * availableHeight,
    },
    {
      name: 'Poor',
      min: PERFORMANCE_THRESHOLDS.POOR,
      max: PERFORMANCE_THRESHOLDS.FAIR,
      color: chartColors.performance.poor,
      y: topPadding + ((100 - PERFORMANCE_THRESHOLDS.FAIR) / 100) * availableHeight,
      height: ((PERFORMANCE_THRESHOLDS.FAIR - PERFORMANCE_THRESHOLDS.POOR) / 100) * availableHeight,
    },
  ];
};

/**
 * Generates standardized subtitle based on performance value
 * @param value - Performance value (0-100)
 * @param metricName - Name of the metric (e.g., 'efficiency', 'retention', 'mastery')
 * @param trend - Optional trend direction
 * @param trendValue - Optional trend change value
 * @returns Subtitle string
 */
export const generatePerformanceSubtitle = (
  value: number,
  metricName: string,
  trend?: 'improving' | 'declining' | 'stable',
  trendValue?: number
): string => {
  if (value === 0) {
    return `Study words to track ${metricName}`;
  }

  // Enhanced trend messaging with actionable insights
  if (trend && trendValue !== undefined) {
    if (trend === 'improving') {
      return `${metricName} improving by ${Math.abs(trendValue)}% - keep it up!`;
    }
    if (trend === 'declining') {
      return `${metricName} down ${Math.abs(trendValue)}% - review more often`;
    }
  }

  // Enhanced performance messaging with encouragement
  if (value >= PERFORMANCE_THRESHOLDS.EXCELLENT) {
    return `Excellent ${metricName} - you're mastering this!`;
  }
  if (value >= PERFORMANCE_THRESHOLDS.GOOD) {
    return `Good ${metricName} - steady progress`;
  }
  if (value >= PERFORMANCE_THRESHOLDS.FAIR) {
    return `Fair ${metricName} - practice more for improvement`;
  }
  return `Focus on improving ${metricName} with regular practice`;
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
