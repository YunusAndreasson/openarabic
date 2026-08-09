/**
 * Review exit contract
 * ====================
 *
 * What the app tells the learner after a session ends, checked against the
 * schedule it just wrote. Companion to `practiceChartTruth.test.ts`.
 *
 * Observed live on 2026-08-09 (emulator-5554): a session finished with one
 * word due at 18:35 — ten minutes later — and the Practice tab said
 * "All caught up · Next review tomorrow".
 */

import { describe, expect, test } from '@jest/globals';

import { calculateNextDueDate, formatNextDue } from '@/utils/fsrsUtils';
import type { StudyWord } from '@/types/vocabulary.types';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const wordDueIn = (ms: number): StudyWord =>
  ({
    id: 1,
    user_id: 'user-harness',
    root_id: 1,
    fsrs_due: new Date(Date.now() + ms).toISOString(),
    fsrs_last_review: new Date().toISOString(),
    fsrs_state: 1,
    fsrs_stability: 1,
    fsrs_difficulty: 6.5,
    fsrs_reps: 1,
    fsrs_lapses: 0,
    created_at: new Date().toISOString(),
  }) as unknown as StudyWord;

describe('"Next review …" after a finished session', () => {
  // FSRS learning steps are 1m / 6m / 10m, so a word due minutes from now is
  // the NORMAL state at the end of a session, not an edge case.
  test.each([
    ['1 minute', 1 * MINUTE],
    ['10 minutes', 10 * MINUTE],
    ['2 hours', 2 * HOUR],
  ])('a word due in %s is not described as "tomorrow"', (_label, ms) => {
    expect(formatNextDue(new Date(Date.now() + ms))).not.toBe('tomorrow');
  });

  test('a word due later today is described as today', () => {
    // Anchored well inside the current local day so the assertion is about the
    // rounding rule, not about midnight.
    const nextDue = new Date();
    nextDue.setHours(23, 30, 0, 0);
    const msAway = nextDue.getTime() - Date.now();
    if (msAway < 5 * MINUTE) return; // too close to midnight to be meaningful
    expect(formatNextDue(nextDue)).toBe('today');
  });

  test('a word due tomorrow is still described as tomorrow', () => {
    const nextDue = new Date(Date.now() + 26 * HOUR);
    expect(formatNextDue(nextDue)).toBe('tomorrow');
  });

  test('the copy matches the schedule the session just wrote', () => {
    // End-to-end shape of the live reading: nothing due now, one word ten
    // minutes out. calculateNextDueDate finds it; formatNextDue must describe
    // it honestly.
    const words = [wordDueIn(10 * MINUTE), wordDueIn(26 * HOUR), wordDueIn(50 * HOUR)];
    const nextDue = calculateNextDueDate(words);
    expect(nextDue).not.toBeNull();
    expect(formatNextDue(nextDue)).not.toBe('tomorrow');
  });

  test('the "today" branch is reachable from calculateNextDueDate', () => {
    // calculateNextDueDate only ever returns a STRICTLY future date, so if
    // formatNextDue rounds sub-24h up to "tomorrow", the 'today' string can
    // never be produced by this pairing at all.
    const nextDue = calculateNextDueDate([wordDueIn(30 * MINUTE)]);
    expect(formatNextDue(nextDue)).toBe('today');
  });
});
