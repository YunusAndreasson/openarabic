import type { StudyWord } from '@/types/vocabulary.types';
import { normalizeTimestamp } from '@/utils/dateTimeUtils';

/**
 * Simple classification for "hard" words based on FSRS lapses.
 * A word is considered hard if the user has forgotten it 2+ times.
 *
 * Used for:
 * - Article recommendations (Strategy 2: difficult words)
 * - Recommendation engine insights
 */
export function isHardWord(word: StudyWord): boolean {
  return (word.fsrs_lapses ?? 0) >= 2;
}

/**
 * Count words reviewed since local midnight.
 * One fsrs_last_review per word is the only per-day review granularity the
 * schema allows — unique words reviewed, which is the unit a learner thinks in.
 */
export function countReviewedToday(studyWords: StudyWord[]): number {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startMs = startOfToday.getTime();

  return studyWords.filter(word => {
    // `fsrs_reps > 0` is the only honest test for "has been reviewed".
    // createResetFSRSUpdate stamps fsrs_last_review at creation on a card with
    // reps 0, so keying off the timestamp alone reported every word ADDED
    // today as REVIEWED today — measured on a live account as "10 reviewed
    // today" against a total of one actual review.
    if ((word.fsrs_reps ?? 0) <= 0) return false;

    const lastStr = normalizeTimestamp(word.fsrs_last_review);
    const lastMs = lastStr ? Date.parse(lastStr) : 0;
    return Number.isFinite(lastMs) && lastMs >= startMs;
  }).length;
}

// ===== WORD STATUS UTILITY FUNCTIONS FOR DICTIONARY UI =====

/**
 * Is this word due for review right now?
 *
 * The single source of truth for "due" on the client, and deliberately the same
 * rule the server's `onlyDue` filter uses: `fsrs_due <= now`, plus new words,
 * which are always due for their first review.
 *
 * No session cooldown here. That is a gate on re-serving the words a
 * just-finished session covered — the server applies it only when a session
 * completed inside the window, and even then exempts states 0/1/3 (see
 * studyWordsFSRSService.getFSRSWords). Baking it unconditionally into the
 * client's "is this word due" test made these counts disagree with both the
 * server and the due-words forecast beside them.
 */
export function isDueWord(word: StudyWord): boolean {
  // New words (state 0) are always due for their first review
  if (word.fsrs_state === 0) {
    return true;
  }

  const dueStr = normalizeTimestamp(word.fsrs_due);
  const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;

  return Number.isFinite(dueMs) && dueMs <= Date.now();
}

/**
 * Has this word ever actually been reviewed?
 *
 * Not a formality, and NOT a null check. A brand-new study word is written with
 * *placeholder* FSRS values rather than empty ones — `createInitialFSRSEntry`
 * stamps stability 0.4, difficulty 6.5, and `fsrs_last_review` set to the moment
 * it was saved (that column is NOT NULL). Read naively, those columns claim
 * "moderately hard, holds for a day, last reviewed just now" about a word the
 * learner has never once been asked, and every surface that ranks or draws FSRS
 * state repeats the claim. Gate on this first.
 *
 * `createResetFSRSUpdate` writes the same values, so a word whose progress was
 * reset correctly reads as never-practised again.
 */
export function hasBeenPractised(word: StudyWord): boolean {
  return (word.fsrs_state ?? 0) !== 0 && (word.fsrs_reps ?? 0) > 0;
}

/**
 * Determines if a word is mastered (for Dictionary UI status badges)
 * Mastered = State 2 + stability >= 5
 */
export function isMasteredWord(word: StudyWord): boolean {
  const state = word.fsrs_state;
  const stability = word.fsrs_stability ?? 0;
  return state === 2 && stability >= 5;
}
