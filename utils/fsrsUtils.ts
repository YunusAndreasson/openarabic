import {
  CRITICAL_RETRIEVABILITY_THRESHOLD,
  URGENT_RETRIEVABILITY_THRESHOLD,
} from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { clamp01, MILLISECONDS_PER_DAY, parseSupabaseTimestamp } from '@/utils/dateTimeUtils';
import { fillTemplate } from '@/utils/fillTemplate';
import { wordRetrievability } from '@/utils/fsrsScheduler';
import { dueTimestampMs, hasBeenPractised } from '@/utils/wordClassification';

export interface RetrievabilityForecast {
  date: Date;
  averageRetrievability: number;
  wordCount: number;
  criticalWords: number;
  urgentWords: number;
}

export interface DueWordsForecast {
  date: Date;
  /**
   * The running backlog: every word due by this bucket if NOTHING is reviewed in
   * between. Non-decreasing by construction, so it is a projection, not a
   * schedule — draw `newlyDue` for "how much does each day ask".
   */
  dueWords: number;
  /**
   * What this bucket adds. Day 0 is everything due now, overdue included; every
   * later day is only the words that fall due after the previous bucket and by
   * this one — so a word due later tonight lands on tomorrow, the day a learner
   * who reviews once a day will meet it. This is the series the charts draw.
   */
  newlyDue: number;
  totalWords: number;
}

/**
 * Calculate retrievability on the word's own model's forgetting curve, so it
 * agrees with the scheduler that grades that word.
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

  // Clamped at zero: a review stamped after `targetDate` (a device clock that
  // has since moved back) is a word seen just now, and a negative elapsed time
  // takes the curve's base below zero, which is NaN rather than a recall.
  const daysSinceReview = Math.max(
    0,
    (targetDate.getTime() - lastReview.getTime()) / MILLISECONDS_PER_DAY,
  );

  return clamp01(wordRetrievability(word, daysSinceReview));
}

/**
 * Generate forecast dates for the next 7 days
 * Internal helper function for calculateRetrievabilityForecast and calculateDueWordsForecast
 */
function generateForecastDates(days: number = 7, now: Date = new Date()): Date[] {
  // The first bucket is NOW, not the end of today. Both readers treat it as a
  // statement about this moment — the due chart's first column is labelled
  // "Now" and sits beside a CTA that counts what is due right now, and the
  // recall figure says "right now". Anchoring the bucket
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
  now: Date = new Date(),
): RetrievabilityForecast[] {
  // Filter to only include words that have actually been reviewed.
  //
  // `hasBeenPractised` is the app-wide gate (state !== New && reps > 0) and the
  // only correct one: a never-practised word carries PLACEHOLDER FSRS values,
  // not nulls, so a looser test silently admits words whose "last review" is
  // just their save timestamp. Every number derived from this forecast — the
  // memory gauge and the practice hero among them — inherits this filter, so
  // it has to be the same rule the rest of the app uses.
  const validWords = studyWords.reduce<(StudyWord & { lastReviewDate: Date })[]>((acc, w) => {
    if (hasBeenPractised(w) && w.fsrs_last_review) {
      const lastReviewDate = parseSupabaseTimestamp(w.fsrs_last_review);
      if (lastReviewDate) acc.push({ ...w, lastReviewDate });
    }
    return acc;
  }, []);

  // Generate future dates for forecasting
  const dates = generateForecastDates(days, now);

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

// `calculateRetrievabilityTrend` used to live here and was deleted, not moved.
// It compared today's average recall against the average over a no-review
// future — but the forgetting curve is monotonically decreasing, so the change
// was always <= 0 and 'improving' was unreachable. It reported the *rate* of
// decay dressed up as a judgement about the learner, and nothing rendered it.
// `calculateDueWordsTrend` went the same way, for the same reason: a
// forward-only forecast cannot describe a direction the learner is moving in.

/**
 * Due-words forecast for the next `days` days: per bucket, the running backlog
 * (`dueWords`) and what that bucket adds (`newlyDue`). See `DueWordsForecast`
 * for which one a chart should draw.
 * Optimized: Pre-computes word data once, then iterates dates
 */
export function calculateDueWordsForecast(
  studyWords: StudyWord[],
  days: number = 7,
  now: Date = new Date(),
): DueWordsForecast[] {
  // ONE rule decides both which words belong to this forecast and, per day,
  // whether they have come due — so the denominator and the counts can never
  // disagree about the same row. The pre-filter here used to be its own test
  // (`fsrs_due != null || (state ?? New) === New`), which read a NULL state as
  // New while the due rule below did not: a stateless row with no due date was
  // counted in `totalWords` and then never counted as due on any day.
  //
  // `+Infinity` is `dueTimestampMs`' "no usable date and not new" — never due,
  // on any day, so it is not part of the population either.
  //
  // Parsed ONCE per word rather than once per word per day; that is the only
  // reason this precomputes at all. `dueMs <= targetMs` below IS `isDueAt`,
  // with the parse lifted out of the inner loop.
  const dueTimestamps = studyWords
    .map(dueTimestampMs)
    .filter(dueMs => dueMs < Number.POSITIVE_INFINITY);

  // Generate future dates for forecasting
  const dates = generateForecastDates(days, now);

  const dateData = dates.map(date => ({ date, targetMs: date.getTime() }));

  // Calculate due counts for each date
  const dueCounts: number[] = dateData.map(({ targetMs }) => {
    let count = 0;
    for (const dueMs of dueTimestamps) {
      if (dueMs <= targetMs) {
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
      totalWords: dueTimestamps.length,
    };
  });
}

/**
 * How a single word's next review is described to the learner.
 *
 * Calendar days apart, not elapsed 24h blocks. Dividing the raw difference
 * rounded every sub-day gap up to a full day, so a word due ten minutes from
 * now — the normal state at the end of a session, since the learning steps are
 * 1m/6m/10m — was announced as "tomorrow", and a word due tomorrow evening as
 * "in 2 days".
 *
 * A word due later the same calendar day is NOT "due now": the due query
 * (`fsrs_due <= now`) will not serve it yet, so labelling it "Due now"
 * contradicted a Practice screen already showing "All caught up". That is why
 * `WORD_DUE_LATER_TODAY` exists as its own branch rather than collapsing into
 * the `days <= 0` case.
 */
export function getNextReviewLabel(due: string | null): string {
  const dueDate = parseSupabaseTimestamp(due);
  if (!dueDate) return STRINGS.WORD_STATE_NEW;
  const now = new Date();
  if (dueDate.getTime() <= now.getTime()) return STRINGS.WORD_DUE_NOW;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const days = Math.round(
    (startOfDueDay.getTime() - startOfToday.getTime()) / MILLISECONDS_PER_DAY,
  );

  if (days <= 0) return STRINGS.WORD_DUE_LATER_TODAY;
  if (days === 1) return STRINGS.WORD_DUE_TOMORROW;
  return fillTemplate(STRINGS.WORD_DUE_IN_DAYS, { count: days });
}
