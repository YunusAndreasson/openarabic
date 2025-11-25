import {
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  DEFAULT_SESSION_COOLDOWN_HOURS,
  TREND_CHANGE_THRESHOLD,
  URGENT_RETRIEVABILITY_THRESHOLD,
} from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { normalizeTimestamp } from '@/utils/dateTimeUtils';

export interface RetrievabilityForecast {
  date: Date;
  averageRetrievability: number;
  wordCount: number;
  criticalWords: number;
  urgentWords: number;
}

export interface DueWordsForecast {
  date: Date;
  dueWords: number;
  newlyDue: number;
  totalWords: number;
}

/**
 * Calculate retrievability using FSRS formula
 * R = exp(-t/S) where t = days since review, S = stability
 */
export function calculateRetrievability(
  word: StudyWord,
  targetDate: Date,
  lastReviewDate?: Date,
): number {
  const stability = word.fsrs_stability ?? 0;
  const lastReview = lastReviewDate ?? new Date(word.fsrs_last_review);

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
 * Internal helper function for calculateRetrievabilityForecast and calculateDueWordsForecast
 */
function generateForecastDates(days: number = 7): Date[] {
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
  days: number = 7,
): RetrievabilityForecast[] {
  // Filter to only include words that have been reviewed
  const validWords = studyWords
    .filter(w => w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0)
    .map(w => {
      // We know fsrs_last_review is not null here due to the filter above
      const lastReview = w.fsrs_last_review;
      if (!lastReview) return null; // This should never happen due to filter, but TypeScript safety

      return {
        ...w,
        lastReviewDate: new Date(lastReview),
      };
    })
    .filter((w): w is NonNullable<typeof w> => w !== null); // Remove any null entries

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
 * Calculate trend based on retrievability forecast
 */
export function calculateRetrievabilityTrend(
  retrievabilityData: RetrievabilityForecast[],
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

/**
 * Check if a word is due on a specific date
 */
function isWordDueOnDate(word: StudyWord, targetDate: Date): boolean {
  const dueStr = normalizeTimestamp(word.fsrs_due);
  const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;
  const isDue = Number.isFinite(dueMs) && dueMs <= targetDate.getTime();

  const lastStr = normalizeTimestamp(word.fsrs_last_review);
  const lastMs = lastStr ? Date.parse(lastStr) : 0;
  const cooldownMs = targetDate.getTime() - DEFAULT_SESSION_COOLDOWN_HOURS * 60 * 60 * 1000;
  const isRecentlyReviewed = Number.isFinite(lastMs) && lastMs >= cooldownMs;

  return isDue && !isRecentlyReviewed;
}

/**
 * Calculate due words forecast for the next 7 days
 */
export function calculateDueWordsForecast(
  studyWords: StudyWord[],
  days: number = 7,
): DueWordsForecast[] {
  // Filter to only include words that have FSRS data
  const validWords = studyWords.filter(w => w.fsrs_due != null);

  // Generate future dates for forecasting
  const dates = generateForecastDates(days);

  return dates.map((date, index) => {
    const dueWords = validWords.filter(word => isWordDueOnDate(word, date)).length;

    let newlyDue = dueWords;
    if (index > 0) {
      const previousDate = dates[index - 1];
      if (previousDate) {
        const previouslyDue = validWords.filter(word => isWordDueOnDate(word, previousDate)).length;
        newlyDue = Math.max(0, dueWords - previouslyDue);
      }
    }

    return {
      date,
      dueWords,
      newlyDue,
      totalWords: validWords.length,
    };
  });
}

/**
 * Calculate trend for due words forecast
 */
export function calculateDueWordsTrend(
  dueWordsData: DueWordsForecast[],
): 'increasing' | 'decreasing' | 'stable' {
  if (dueWordsData.length < 2) return 'stable';

  const todayData = dueWordsData[0]; // Today (leftmost)
  const futureData = dueWordsData.slice(1);

  const currentDue = todayData?.dueWords || 0;
  const peakDue = Math.max(...futureData.map(d => d.dueWords));

  // Calculate trend based on whether due words will increase significantly
  const change = peakDue - currentDue;
  const threshold = Math.max(5, currentDue * 0.2); // At least 5 words or 20% increase

  return change > threshold ? 'increasing' : change < -threshold ? 'decreasing' : 'stable';
}

/**
 * Calculate the date when the next word becomes due
 * Returns null if no words are scheduled or all words are currently due
 */
export function calculateNextDueDate(studyWords: StudyWord[]): Date | null {
  if (studyWords.length === 0) return null;

  const now = new Date();
  const validDueDates = studyWords
    .filter(word => word.fsrs_due != null)
    .map(word => {
      const dueStr = normalizeTimestamp(word.fsrs_due);
      return dueStr ? new Date(dueStr) : null;
    })
    .filter((date): date is Date => date !== null && date.getTime() > now.getTime());

  if (validDueDates.length === 0) return null;

  // Find the earliest due date
  return new Date(Math.min(...validDueDates.map(d => d.getTime())));
}
