import { computeDecayFactor, fsrs, generatorParameters } from 'ts-fsrs';

import {
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  OPTIMIZED_FSRS_CONFIG,
  TREND_CHANGE_THRESHOLD,
  URGENT_RETRIEVABILITY_THRESHOLD,
} from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

// Shared FSRS instance for retrievability calculations
// Uses the same config as the review engine for consistency
const FSRS_PARAMS = generatorParameters(OPTIMIZED_FSRS_CONFIG);
const FSRS_INSTANCE = fsrs(FSRS_PARAMS);

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
 * Calculate retrievability using the official FSRS forgetting curve
 * R(t,S) = (1 + FACTOR × t/(9×S))^DECAY
 * Uses ts-fsrs library for algorithm consistency with the review engine
 */
export function calculateRetrievability(
  word: StudyWord,
  targetDate: Date,
  lastReviewDate?: Date,
): number {
  const stability = word.fsrs_stability ?? 0;
  if (!word.fsrs_last_review && !lastReviewDate) return 0;
  // parseSupabaseTimestamp, not `new Date(...)`: the raw constructor reads a
  // zone-less stamp as device-local (Hermes included) while the rest of the
  // app reads it as UTC, and rejects Postgres' "+00" offset outright.
  const lastReview = lastReviewDate ?? parseSupabaseTimestamp(word.fsrs_last_review);

  if (!lastReview) return 0;

  if (Number.isNaN(lastReview.getTime()) || stability <= 0) {
    return 0;
  }

  const daysSinceReview = (targetDate.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

  return Math.max(0, Math.min(1, FSRS_INSTANCE.forgetting_curve(daysSinceReview, stability)));
}

/**
 * Days after the last review until retrievability decays to `threshold`.
 * Closed-form inversion of the ts-fsrs forgetting curve R(t,S) = (1 + factor·t/S)^decay,
 * parameterized from the same weights as the review engine so a library upgrade
 * (e.g. FSRS-6 per-deck decay w[20]) changes both sides together.
 * Returns null when stability or threshold make the question meaningless.
 */
export function timeUntilRetrievability(stabilityDays: number, threshold: number): number | null {
  if (stabilityDays <= 0 || threshold <= 0 || threshold >= 1) return null;

  const { decay, factor } = computeDecayFactor(FSRS_PARAMS.w);
  return (stabilityDays / factor) * (Math.pow(threshold, 1 / decay) - 1);
}

/**
 * Generate forecast dates for the next 7 days
 * Internal helper function for calculateRetrievabilityForecast and calculateDueWordsForecast
 */
function generateForecastDates(days: number = 7): Date[] {
  const now = new Date();

  // The first bucket is NOW, not the end of today. Both charts label it
  // "Today" and read as a statement about this moment — the due chart's
  // "<N> to review today" sits beside a CTA that counts what is due right now,
  // and the retention gauge says "if quizzed right now". Anchoring the bucket
  // at 23:59 made the first one count words that only fall due tonight and the
  // second one charge a full day of extra decay against today's score.
  const dates: Date[] = [now];

  for (let i = 1; i < days; i++) {
    const date = new Date(now);
    date.setDate(now.getDate() + i);
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
  const validWords = studyWords.reduce<(StudyWord & { lastReviewDate: Date })[]>((acc, w) => {
    if (w.fsrs_last_review && (w.fsrs_reps ?? 0) > 0) {
      const lastReviewDate = parseSupabaseTimestamp(w.fsrs_last_review);
      if (lastReviewDate) acc.push({ ...w, lastReviewDate });
    }
    return acc;
  }, []);

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
 * Pre-computed word due data for efficient forecast calculations
 */
interface WordDueData {
  dueMs: number;
  /** State 0 — never studied, so always due for its first review. */
  isNew: boolean;
}

/**
 * Pre-compute due timestamps for all words (single pass)
 */
function precomputeWordDueData(words: StudyWord[]): WordDueData[] {
  return words.map(word => {
    const due = parseSupabaseTimestamp(word.fsrs_due);

    return {
      dueMs: due ? due.getTime() : Number.POSITIVE_INFINITY,
      isNew: (word.fsrs_state ?? 0) === 0,
    };
  });
}

/**
 * Check if a word is due on a specific date using pre-computed data.
 *
 * Deliberately the same rule the server's `onlyDue` filter and
 * `calculateDueWords` use — `fsrs_due <= target OR state 0` — so the forecast's
 * "Today" and the queue the Practice screen actually serves are the same
 * number. It does NOT apply the session cooldown: that is a gate on re-serving
 * a finished session's words, not a property of the schedule, and anchoring it
 * to each forecast day made the chart disagree with the CTA beside it.
 */
function isWordDueOnDateFast(wordData: WordDueData, targetDateMs: number): boolean {
  if (wordData.isNew) return true;
  return Number.isFinite(wordData.dueMs) && wordData.dueMs <= targetDateMs;
}

/**
 * Calculate due words forecast for the next 7 days
 * Optimized: Pre-computes word data once, then iterates dates
 */
export function calculateDueWordsForecast(
  studyWords: StudyWord[],
  days: number = 7,
): DueWordsForecast[] {
  // A new word is due for its first review whether or not it carries a due
  // date, so it cannot be filtered out on `fsrs_due` alone.
  const validWords = studyWords.filter(w => w.fsrs_due != null || (w.fsrs_state ?? 0) === 0);

  // Pre-compute due data for all words (single pass)
  const wordDueData = precomputeWordDueData(validWords);

  // Generate future dates for forecasting
  const dates = generateForecastDates(days);

  const dateData = dates.map(date => ({ date, targetMs: date.getTime() }));

  // Calculate due counts for each date
  const dueCounts: number[] = dateData.map(({ targetMs }) => {
    let count = 0;
    for (const data of wordDueData) {
      if (isWordDueOnDateFast(data, targetMs)) {
        count++;
      }
    }
    return count;
  });

  // Build forecast results
  return dateData.map(({ date }, index) => {
    const dueWords = dueCounts[index] ?? 0;
    const previousDue = index > 0 ? (dueCounts[index - 1] ?? 0) : 0;
    const newlyDue = index > 0 ? Math.max(0, dueWords - previousDue) : dueWords;

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
  const peakDue = futureData.reduce((max, d) => Math.max(max, d.dueWords), 0);

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
  let earliestMs = Infinity;
  for (const word of studyWords) {
    if (word.fsrs_due == null) continue;
    const due = parseSupabaseTimestamp(word.fsrs_due);
    if (!due) continue;
    const dueMs = due.getTime();
    if (dueMs > now.getTime() && dueMs < earliestMs) {
      earliestMs = dueMs;
    }
  }

  return earliestMs === Infinity ? null : new Date(earliestMs);
}

/**
 * Format next due date for display ("today", "tomorrow", "in N days")
 */
export function formatNextDue(nextDue: Date | null): string {
  if (!nextDue) return 'soon';

  // Calendar days apart, not elapsed 24h blocks. Dividing the raw difference
  // rounded every sub-day gap up to a full day, so a word due ten minutes from
  // now — the normal state at the end of a session, since the learning steps
  // are 1m/6m/10m — was announced as "tomorrow", and a word due tomorrow
  // evening as "in 2 days". `calculateNextDueDate` only ever returns a future
  // date, so the 'today' branch was unreachable entirely.
  const startOfLocalDay = (date: Date): number =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

  const days = Math.round(
    (startOfLocalDay(nextDue) - startOfLocalDay(new Date())) / (1000 * 60 * 60 * 24),
  );

  if (days <= 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
