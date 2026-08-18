/**
 * Word Classification Tests
 *
 * Tests word classification utilities for FSRS vocabulary.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - these are synchronous tests
 * - Note: No jest.mocked() needed - no mocks used
 */

import { describe, expect, test } from '@jest/globals';

import { LEGACY_NULL_TIMESTAMP, createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import type { StudyWord } from '@/types/vocabulary.types';
import { calculateDueWordsForecast } from '@/utils/fsrsUtils';
import { filterDueWords } from '@/utils/newWordPacing';
import {
  dueTimestampMs,
  isDueAt,
  isDueWord,
  isHardWord,
  isMasteredWord,
} from '@/utils/wordClassification';

// Helper to create study words for this test
const createStudyWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
  createTestWord(overrides);

describe('wordClassification', () => {
  describe('isHardWord', () => {
    test('should identify hard words (lapses >= 2)', () => {
      const hardWord = createStudyWord({
        fsrs_lapses: 2,
      });

      expect(isHardWord(hardWord)).toBeTruthy();
    });

    test('should identify very hard words (lapses > 2)', () => {
      const veryHardWord = createStudyWord({
        fsrs_lapses: 5,
      });

      expect(isHardWord(veryHardWord)).toBeTruthy();
    });

    test('should not identify words with 1 lapse as hard', () => {
      const normalWord = createStudyWord({
        fsrs_lapses: 1,
      });

      expect(isHardWord(normalWord)).toBeFalsy();
    });

    test('should not identify words with 0 lapses as hard', () => {
      const easyWord = createStudyWord({
        fsrs_lapses: 0,
      });

      expect(isHardWord(easyWord)).toBeFalsy();
    });

    test('should handle null lapses as 0', () => {
      const wordWithNullLapses = createStudyWord({
        fsrs_lapses: null,
      });

      expect(isHardWord(wordWithNullLapses)).toBeFalsy();
    });
  });

  /**
   * "Due" used to be re-implemented four times — here, in `filterDueWords`, in
   * the forecast's private precompute, and inline in the background task. They
   * disagreed in two ways that no test covered, so these pin the consolidation
   * rather than the individual functions.
   */
  describe('dueTimestampMs — the one place a due date becomes a number', () => {
    test('reads an offset-less Postgres stamp as UTC, not device-local', () => {
      // What `timestamp without time zone` puts on the wire: space separator,
      // no offset. A raw `Date.parse` reads this in the DEVICE's zone, which
      // shifted every due check by the learner's offset from UTC — silently,
      // and in whichever direction they happened to live. This was live in the
      // background task, whose count feeds the home-screen badge.
      const word = createStudyWord({ fsrs_state: 2, fsrs_due: '2026-08-18 10:00:00' });

      expect(dueTimestampMs(word)).toBe(Date.parse('2026-08-18T10:00:00Z'));
    });

    test('handles the whole-hour "+00" offset, which is NOT valid ISO 8601', () => {
      // Postgres renders a whole-hour UTC offset as `+00`. `Date.parse` returns
      // NaN for that in both V8 and Hermes once the separator is a 'T' — and
      // every consumer reads NaN as "not due", so the word simply never comes
      // up again. normalizeTimestamp widens it to `+00:00`.
      const word = createStudyWord({ fsrs_state: 2, fsrs_due: '2026-08-18T10:00:00+00' });

      expect(Number.isNaN(Date.parse('2026-08-18T10:00:00+00'))).toBe(true); // the trap
      expect(dueTimestampMs(word)).toBe(Date.parse('2026-08-18T10:00:00Z'));
    });

    test('a new word is always due, however its due date reads', () => {
      const noDate = createStudyWord({ fsrs_state: 0, fsrs_due: null });
      const farFuture = createStudyWord({ fsrs_state: 0, fsrs_due: '2099-01-01T00:00:00Z' });

      expect(isDueAt(noDate, Date.now())).toBe(true);
      expect(isDueAt(farFuture, Date.now())).toBe(true);
    });

    test('an unusable due date is never due, rather than always', () => {
      // The safe direction: withhold a review rather than invent one.
      const noDate = createStudyWord({ fsrs_state: 2, fsrs_due: null });
      const garbage = createStudyWord({ fsrs_state: 2, fsrs_due: 'not-a-date' });

      expect(isDueAt(noDate, Date.now())).toBe(false);
      expect(isDueAt(garbage, Date.now())).toBe(false);
    });

    test('a NULL state is not treated as New — the server does not match it either', () => {
      // The forecast's copy tested `(state ?? New) === New` while every other
      // caller tested `=== New`, so a stateless row with no due date charted as
      // due on all seven days and was then never served.
      const stateless = createStudyWord({ fsrs_state: null, fsrs_due: null });

      expect(isDueAt(stateless, Date.now())).toBe(false);
    });
  });

  describe('every "due" surface agrees on the same word set', () => {
    const nowMs = Date.parse('2026-08-18T12:00:00Z');
    const words: StudyWord[] = [
      createStudyWord({ root_id: 1 as never, fsrs_state: 0, fsrs_due: null }),
      createStudyWord({ root_id: 2 as never, fsrs_state: 2, fsrs_due: '2026-08-18 09:00:00' }),
      createStudyWord({ root_id: 3 as never, fsrs_state: 2, fsrs_due: '2026-08-18 09:00:00+00' }),
      createStudyWord({ root_id: 4 as never, fsrs_state: 2, fsrs_due: '2099-01-01T00:00:00Z' }),
      createStudyWord({ root_id: 5 as never, fsrs_state: 1, fsrs_due: '2026-08-18T11:00:00Z' }),
      createStudyWord({ root_id: 6 as never, fsrs_state: null, fsrs_due: null }),
      createStudyWord({ root_id: 7 as never, fsrs_state: 2, fsrs_due: 'not-a-date' }),
    ];

    test('isDueAt and filterDueWords count the same words when no cooldown applies', () => {
      const direct = words.filter(word => isDueAt(word, nowMs));
      const paced = filterDueWords(words, { lastCompletedAt: undefined, nowMs });

      expect(paced.map(w => w.root_id)).toEqual(direct.map(w => w.root_id));
      // Sanity: the fixture actually exercises both outcomes.
      expect(direct.length).toBe(4);
    });

    test('the forecast counts and its totalWords use the same rule', () => {
      // The pre-filter used to read a NULL state as New while the due rule did
      // not, so a stateless row with no due date inflated `totalWords` and was
      // then never counted as due on any day. One rule now decides both.
      const forecast = calculateDueWordsForecast(words, 7);
      const forecastable = words.filter(w => dueTimestampMs(w) < Number.POSITIVE_INFINITY);

      expect(forecast[0]?.totalWords).toBe(forecastable.length);
      // roots 6 (no state, no date) and 7 (unparseable) can never come due.
      expect(forecastable.map(w => w.root_id)).not.toContain(6);
      expect(forecastable.map(w => w.root_id)).not.toContain(7);
    });

    test("the forecast's first bucket equals the live due count", () => {
      // generateForecastDates anchors bucket 0 at NOW precisely so the chart's
      // "Today" and the CTA counting what is due right now cannot disagree.
      const liveDue = words.filter(isDueWord).length;

      expect(calculateDueWordsForecast(words, 7)[0]?.dueWords).toBe(liveDue);
    });
  });

  describe('isDueWord', () => {
    test('should return true for new words (state 0)', () => {
      const newWord = createStudyWord({ fsrs_state: 0 });
      expect(isDueWord(newWord)).toBeTruthy();
    });

    test('should return true for words past due date', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const dueWord = createStudyWord({
        fsrs_state: 2,
        fsrs_due: pastDate,
        fsrs_last_review: LEGACY_NULL_TIMESTAMP,
      });

      expect(isDueWord(dueWord)).toBeTruthy();
    });

    test('should return false for words not yet due', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const notDueWord = createStudyWord({
        fsrs_state: 2,
        fsrs_due: futureDate,
      });

      expect(isDueWord(notDueWord)).toBeFalsy();
    });

    test('an overdue word stays due even if it was reviewed recently', () => {
      // "Due" is a property of the schedule: fsrs_due has passed. The 2h
      // session cooldown is a separate gate on re-serving a finished session's
      // words, applied server-side only when a session just completed (and
      // exempting states 0/1/3 even then). Applying it here unilaterally made
      // this classifier disagree with both the server's `onlyDue` filter and
      // the due-words forecast rendered beside it.
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const recentReview = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // 30 min ago

      const recentlyReviewedWord = createStudyWord({
        fsrs_state: 2,
        fsrs_due: pastDate,
        fsrs_last_review: recentReview,
      });

      expect(isDueWord(recentlyReviewedWord)).toBe(true);
    });
  });

  describe('isMasteredWord', () => {
    test('should return true for state 2 with stability >= 5', () => {
      const masteredWord = createStudyWord({
        fsrs_state: 2,
        fsrs_stability: 5,
      });
      expect(isMasteredWord(masteredWord)).toBeTruthy();
    });

    test('should return false for state 2 with stability < 5', () => {
      const notMasteredWord = createStudyWord({
        fsrs_state: 2,
        fsrs_stability: 4.9,
      });
      expect(isMasteredWord(notMasteredWord)).toBeFalsy();
    });

    test('should return false for non-state-2 words even with high stability', () => {
      const learningWord = createStudyWord({
        fsrs_state: 1,
        fsrs_stability: 10,
      });
      expect(isMasteredWord(learningWord)).toBeFalsy();
    });

    test('should handle null stability as 0', () => {
      const wordWithNullStability = createStudyWord({
        fsrs_state: 2,
        fsrs_stability: null,
      });
      expect(isMasteredWord(wordWithNullStability)).toBeFalsy();
    });
  });
});
