/**
 * getNextReviewLabel Tests
 *
 * Regression coverage for the practice word detail screen's "Next review"
 * label — must never claim "Due now" for a word the due query (fsrs_due <=
 * now) won't actually serve yet.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { STRINGS } from '@/constants/strings';
import { getNextReviewLabel } from '@/utils/fsrsUtils';

describe('getNextReviewLabel', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-10T10:17:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns New for a null due date', () => {
    expect(getNextReviewLabel(null)).toBe(STRINGS.WORD_STATE_NEW);
  });

  test('returns Due now for a due date already in the past', () => {
    expect(getNextReviewLabel('2026-08-10T03:16:00.000+00:00')).toBe(STRINGS.WORD_DUE_NOW);
  });

  // Regression: the due-for-review query requires fsrs_due <= now, so a word
  // scheduled for later today was never actually served by "Review N words" —
  // labelling it "Due now" here contradicted the Practice screen showing
  // "All caught up" for the exact same word. See app/(tabs)/practice/word.tsx.
  test('returns Later today for a due date later on the same calendar day', () => {
    expect(getNextReviewLabel('2026-08-10T18:24:00.000+00:00')).toBe(STRINGS.WORD_DUE_LATER_TODAY);
  });

  test('returns Tomorrow for a due date on the next calendar day', () => {
    expect(getNextReviewLabel('2026-08-11T09:00:00.000+00:00')).toBe(STRINGS.WORD_DUE_TOMORROW);
  });

  test('returns the day count for a due date further in the future', () => {
    expect(getNextReviewLabel('2026-08-15T09:00:00.000+00:00')).toBe(
      STRINGS.WORD_DUE_IN_DAYS.replace('{count}', '5'),
    );
  });

  // Observed live on 2026-08-09 (emulator-5554): a session finished with one
  // word due ten minutes later and the app said "Next review tomorrow".
  // FSRS learning steps are 1m / 6m / 10m, so a word due minutes from now is
  // the NORMAL state at the end of a session, not an edge case — rounding the
  // raw difference up to a whole day is what produced that copy.
  test.each([
    ['1 minute', 1],
    ['10 minutes', 10],
    ['2 hours', 120],
  ])('a word due in %s is never described as tomorrow', (_label, minutes) => {
    const due = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    expect(getNextReviewLabel(due)).not.toBe(STRINGS.WORD_DUE_TOMORROW);
  });
});
