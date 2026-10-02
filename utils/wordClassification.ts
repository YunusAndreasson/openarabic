import { State } from 'ts-fsrs';

import { MASTERY_MIN_STABILITY } from '@/constants/fsrs';
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
export function countReviewedToday(studyWords: StudyWord[], now: Date = new Date()): number {
  const startOfToday = new Date(now);
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
 * When this word next comes up for review, as an epoch timestamp in ms.
 *
 * The one place a `fsrs_due` string becomes a number. Two sentinels carry the
 * cases that are not really timestamps, so every caller can compare rather than
 * branch:
 *   - `-Infinity` for a NEW word — always due, whether or not it carries a date.
 *   - `+Infinity` for a missing or unparseable one — never due, which is the
 *     safe direction: it withholds a review rather than inventing one.
 *
 * `normalizeTimestamp` is not optional here. Postgres renders a whole-hour UTC
 * offset as `+00` and a `timestamp without time zone` with no offset at all,
 * and a raw `Date.parse` reads the latter as DEVICE-LOCAL — shifting every due
 * check by the device's offset, silently, in whichever direction the learner
 * happens to be from UTC. See the note on `normalizeTimestamp` itself.
 */
export function dueTimestampMs(word: StudyWord): number {
  // A NULL state is deliberately NOT treated as New. The four call sites this
  // replaces disagreed on exactly that: three tested `=== State.New` while the
  // forecast's private copy tested `(state ?? State.New) === State.New`, so a
  // pre-migration row with no state and no due date was charted as due on every
  // one of the next seven days and then never served. The server settles it —
  // `fsrs_state.eq.0` does not match NULL in SQL — so the majority reading is
  // also the correct one, and the chart now agrees with the queue beside it.
  if (word.fsrs_state === State.New) return Number.NEGATIVE_INFINITY;

  const dueStr = normalizeTimestamp(word.fsrs_due);
  const dueMs = dueStr ? Date.parse(dueStr) : Number.POSITIVE_INFINITY;

  return Number.isFinite(dueMs) ? dueMs : Number.POSITIVE_INFINITY;
}

/**
 * Was/is this word due at `atMs`?
 *
 * THE definition of "due" on the client, and deliberately the same rule the
 * server's `onlyDue` filter uses: `fsrs_due <= atMs`, plus new words, which are
 * always due for their first review.
 *
 * Takes the instant as an argument because the callers genuinely differ — "due
 * now" for the badge and the dictionary, "due on day N" for the seven-day
 * forecast, and an injected clock for the pacing filter so it stays pure. They
 * were three separate re-implementations of this comparison plus a fourth
 * inside the background task, and the background one skipped the timestamp
 * normalization, so its count could disagree with the app's by the device's
 * UTC offset.
 *
 * No session cooldown here. That is a gate on re-serving the words a
 * just-finished session covered — the server applies it only when a session
 * completed inside the window, and even then exempts New/Learning/Relearning
 * (see studyWordsFSRSService.getFSRSWords). Baking it unconditionally into the
 * client's "is this word due" test made these counts disagree with both the
 * server and the due-words forecast beside them. `filterDueWords` layers it on
 * top for the one caller that wants it.
 */
export function isDueAt(word: StudyWord, atMs: number): boolean {
  return dueTimestampMs(word) <= atMs;
}

/** Is this word due for review right now? See `isDueAt`. */
export function isDueWord(word: StudyWord): boolean {
  return isDueAt(word, Date.now());
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
  return (word.fsrs_state ?? State.New) !== State.New && (word.fsrs_reps ?? 0) > 0;
}

/**
 * Is this word mastered? Graduated to Review AND held for at least
 * MASTERY_MIN_STABILITY days.
 *
 * THE definition of "mastered" for the whole app — the dictionary badge, the
 * memory stage ladder, the server's category filter and the completion
 * screen's "mastered this session" count all resolve to this one rule. Both
 * halves are named so a surface cannot quietly adopt its own bar (a
 * `Strength: Strong` at stability >= 7 drifted away from it once already).
 */
export function isMasteredWord(word: StudyWord): boolean {
  return word.fsrs_state === State.Review && (word.fsrs_stability ?? 0) >= MASTERY_MIN_STABILITY;
}
