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

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import type { StudyWord } from '@/types/vocabulary.types';
import { isDueWord, isHardWord, isMasteredWord } from '@/utils/wordClassification';

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
        fsrs_last_review: null,
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
