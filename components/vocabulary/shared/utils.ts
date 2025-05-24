import type { StudyWord } from '@/types/vocabulary.types';

import { DAYS_14, MASTERY_STABILITY_THRESHOLD } from './constants';

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
  const retrievability = Math.pow(1 + daysSinceReview / (9 * stability), -1);

  return Math.max(0, Math.min(1, retrievability));
};

// Calculate learning efficiency score
export const calculateEfficiencyScore = (word: StudyWord): number => {
  const difficulty = word.fsrs_difficulty ?? 0.3;
  const lapses = word.fsrs_lapses ?? 0;
  const stability = word.fsrs_stability ?? 0;
  const state = word.fsrs_state ?? 0;
  const reps = word.fsrs_reps ?? 0;

  let score = 0;

  // State progression (40% weight)
  if (state === 2) score += 40;
  else if (state === 1 && reps > 1) score += 30;
  else if (state === 0 && reps === 1) score += 20;
  else if (state === 3) score += 10;

  // Stability quality (30% weight)
  if (stability >= 30) score += 30;
  else if (stability >= 14) score += 25;
  else if (stability >= 7) score += 20;
  else if (stability >= 3) score += 15;
  else if (stability >= 1) score += 10;

  // Lapse rate (20% weight)
  if (lapses === 0) score += 20;
  else if (lapses === 1) score += 15;
  else if (lapses === 2) score += 10;
  else if (lapses <= 4) score += 5;

  // Difficulty balance (10% weight)
  if (difficulty >= 0.3 && difficulty <= 0.6) score += 10;
  else if (difficulty >= 0.2 && difficulty <= 0.7) score += 7;
  else if (difficulty >= 0.1 && difficulty <= 0.8) score += 5;

  return score;
};

// Get default chart data structure
export const getDefaultChartData = () => ({
  hasData: false,
  insights: { currentValue: 0, trend: 'stable' as const },
});

// Calculate insights from time series data
export const calculateTrendInsights = <T extends { value: number }>(
  data: T[],
  getValue: (item: T) => number = item => item.value
) => {
  if (data.length < 2) {
    return { current: 0, change: 0, trend: 'stable' as const };
  }

  const recent = data.slice(-7);
  const older = data.slice(0, 7);

  const currentAvg = recent.reduce((sum, item) => sum + getValue(item), 0) / recent.length;
  const olderAvg = older.reduce((sum, item) => sum + getValue(item), 0) / older.length;

  const change = currentAvg - olderAvg;
  const trend = change > 10 ? 'improving' : change < -10 ? 'declining' : 'stable';

  return {
    current: Math.round(currentAvg * 10) / 10,
    change: Math.round(change * 10) / 10,
    trend,
  };
};
