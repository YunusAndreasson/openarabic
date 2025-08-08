import {
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  TREND_CHANGE_THRESHOLD,
  URGENT_RETRIEVABILITY_THRESHOLD,
} from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';

export interface RetrievabilityForecast {
  date: Date;
  averageRetrievability: number;
  wordCount: number;
  criticalWords: number;
  urgentWords: number;
}

/**
 * Calculate retrievability using FSRS formula
 * R = exp(-t/S) where t = days since review, S = stability
 */
export function calculateRetrievability(
  word: StudyWord,
  targetDate: Date,
  lastReviewDate?: Date
): number {
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
}

/**
 * Generate forecast dates for the next 7 days
 */
export function generateForecastDates(days: number = 7): Date[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dates: Date[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i); // Future dates starting from today
    date.setHours(23, 59, 59, 999);
    dates.push(date);
  }

  return dates;
}

/**
 * Calculate retrievability forecast for a set of study words
 */
export function calculateRetrievabilityForecast(
  studyWords: StudyWord[],
  days: number = 7
): RetrievabilityForecast[] {
  // Filter to only include words that have been reviewed
  const validWords = studyWords
    .filter(w => w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0)
    .map(w => ({
      ...w,
      lastReviewDate: new Date(w.fsrs_last_review!),
    }));

  // Generate future dates for forecasting
  const dates = generateForecastDates(days);

  return dates.map(date => {
    let totalRetrievability = 0;
    let wordCount = 0;
    let criticalWords = 0;
    let urgentWords = 0;

    validWords.forEach(word => {
      const retrievability = calculateRetrievability(word, date, word.lastReviewDate);
      totalRetrievability += retrievability;
      wordCount++;

      if (retrievability < CRITICAL_RETRIEVABILITY_THRESHOLD) {
        criticalWords++;
      }
      if (retrievability < URGENT_RETRIEVABILITY_THRESHOLD) {
        urgentWords++;
      }
    });

    const averageRetrievability = wordCount > 0 ? (totalRetrievability / wordCount) * 100 : 0;
    return { date, averageRetrievability, wordCount, criticalWords, urgentWords };
  });
}

/**
 * Calculate critical words count for a given date
 */
export function calculateCriticalWords(
  studyWords: StudyWord[],
  targetDate: Date = new Date()
): number {
  const validWords = studyWords.filter(w => w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0);

  return validWords.filter(word => {
    const retrievability = calculateRetrievability(word, targetDate);
    return retrievability < CRITICAL_RETRIEVABILITY_THRESHOLD;
  }).length;
}

/**
 * Calculate trend based on retrievability forecast
 */
export function calculateRetrievabilityTrend(
  retrievabilityData: RetrievabilityForecast[]
): 'improving' | 'declining' | 'stable' {
  if (retrievabilityData.length < 2) return 'stable';

  const todayData = retrievabilityData[0]; // Today (leftmost)
  const futureData = retrievabilityData.slice(1);

  const currentRetrievability = todayData?.averageRetrievability || 0;
  const futureAvg =
    futureData.length > 0
      ? futureData.reduce((sum, day) => sum + day.averageRetrievability, 0) / futureData.length
      : 0;

  // Calculate trend based on future decay prediction
  const change = futureAvg - currentRetrievability;
  return change > TREND_CHANGE_THRESHOLD
    ? 'improving' // Unlikely for memory decay, but possible with reviews
    : change < -TREND_CHANGE_THRESHOLD
    ? 'declining' // Expected for memory decay
    : 'stable';
}
