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
import {
  calculateDueWords,
  calculateLearnedWords,
  calculateMasteredWords,
  calculateStrugglingWords,
  calculateWordCategories,
  isDueWord,
  isExtraHardWord,
  isLearnedWord,
  isMasteredWord,
  isStrugglingWord,
  isUnstableWord,
} from '@/utils/wordClassification';

// Helper to create study words for this test
const createStudyWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
  createTestWord(overrides);

describe('wordClassification', () => {
  describe('isStrugglingWord', () => {
    test('should identify struggling words correctly', () => {
      const strugglingWord = createStudyWord({
        fsrs_difficulty: 8.5,
        fsrs_lapses: 2,
        fsrs_last_review: new Date().toISOString(),
        fsrs_reps: 3,
      });

      expect(isStrugglingWord(strugglingWord)).toBe(true);
    });

    test('should not identify normal words as struggling', () => {
      const normalWord = createStudyWord({
        fsrs_difficulty: 6.5,
        fsrs_lapses: 0,
        fsrs_stability: 10,
      });

      expect(isStrugglingWord(normalWord)).toBe(false);
    });
  });

  describe('calculateDueWords', () => {
    test('should count due words correctly', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // Tomorrow

      const words = [
        createStudyWord({ fsrs_due: pastDate, fsrs_state: 2, fsrs_last_review: null }), // Past due, review state
        createStudyWord({ fsrs_due: futureDate, fsrs_state: 2, fsrs_last_review: null }), // Future due, review state
        createStudyWord({ fsrs_due: pastDate, fsrs_state: 0, fsrs_last_review: null }), // Past due, new state (always due)
      ];

      expect(calculateDueWords(words)).toBe(2); // Past due words only
    });

    test('should handle null due dates', () => {
      const words = [
        createStudyWord({ fsrs_due: null, fsrs_state: 2 }), // No due date, review state
        createStudyWord({ fsrs_due: null, fsrs_state: 0 }), // No due date, new state (always due)
      ];

      expect(calculateDueWords(words)).toBe(1); // Only new word (state 0) is due
    });
  });

  describe('calculateMasteredWords', () => {
    test('should count mastered words correctly', () => {
      const words = [
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10 }), // Mastered
        createStudyWord({ fsrs_state: 2, fsrs_stability: 3 }), // Not mastered
        createStudyWord({ fsrs_state: 1 }), // Learning
      ];

      expect(calculateMasteredWords(words)).toBe(1);
    });
  });

  describe('calculateStrugglingWords', () => {
    test('should count struggling words that have been reviewed (outside cooldown)', () => {
      const now = new Date();
      const pastBeyondCooldown = new Date(now.getTime() - 13 * 60 * 60 * 1000).toISOString(); // 13 hours ago (beyond 12-hour cooldown)
      const words = [
        createStudyWord({
          fsrs_difficulty: 8.5,
          fsrs_lapses: 2,
          fsrs_last_review: pastBeyondCooldown,
          fsrs_reps: 3,
        }), // Struggling and reviewed
        createStudyWord({
          fsrs_difficulty: 8.5,
          fsrs_lapses: 2,
          fsrs_last_review: null,
          fsrs_reps: 0,
        }), // Struggling but not reviewed
        createStudyWord({
          fsrs_difficulty: 6.5,
          fsrs_lapses: 0,
          fsrs_last_review: now,
          fsrs_reps: 3,
        }), // Not struggling
      ];

      expect(calculateStrugglingWords(words)).toBe(1);
    });
  });

  describe('calculateWordCategories', () => {
    test('should calculate all categories correctly (respecting struggling cooldown)', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const pastBeyondCooldown = new Date(now.getTime() - 13 * 60 * 60 * 1000).toISOString(); // 13 hours ago (beyond 12-hour cooldown)
      const words = [
        createStudyWord({ fsrs_due: pastDate }), // Due
        createStudyWord({ fsrs_state: 0, fsrs_due: null }), // New - should be counted as due for first review
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10, fsrs_due: null }), // Mastered (and learned)
        createStudyWord({
          fsrs_state: 1, // Learning state
          fsrs_difficulty: 8.5,
          fsrs_lapses: 2,
          fsrs_last_review: pastBeyondCooldown,
          fsrs_reps: 3,
          fsrs_due: null,
        }), // Struggling (but not learned yet)
      ];

      const result = calculateWordCategories(words);

      expect(result.dueWords).toBe(2); // Past due + new word (state 0)
      expect(result.masteredWords).toBe(1);
      expect(result.strugglingWords).toBe(1);
    });

    test('should prioritize dueWords prop over calculated value', () => {
      const words = [createStudyWord({ fsrs_due: null })]; // No due words
      const result = calculateWordCategories(words, 5); // But prop says 5

      expect(result.dueWords).toBe(5);
    });
  });

  describe('calculateLearnedWords', () => {
    test('should count all state 2 words as learned', () => {
      const words = [
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10 }), // Mastered (still learned)
        createStudyWord({ fsrs_state: 2, fsrs_stability: 3 }), // Not mastered but learned
        createStudyWord({ fsrs_state: 1 }), // Learning, not learned
        createStudyWord({ fsrs_state: 0 }), // New, not learned
      ];

      expect(calculateLearnedWords(words)).toBe(2);
    });

    test('should return 0 for empty array', () => {
      expect(calculateLearnedWords([])).toBe(0);
    });

    test('should return 0 when no state 2 words exist', () => {
      const words = [createStudyWord({ fsrs_state: 0 }), createStudyWord({ fsrs_state: 1 })];

      expect(calculateLearnedWords(words)).toBe(0);
    });
  });

  describe('isUnstableWord', () => {
    test('should identify unstable words (low stability + high difficulty)', () => {
      const unstableWord = createStudyWord({
        fsrs_stability: 5, // <= 7 threshold
        fsrs_difficulty: 8, // >= 7.5 threshold
      });

      expect(isUnstableWord(unstableWord)).toBe(true);
    });

    test('should not mark stable words as unstable', () => {
      const stableWord = createStudyWord({
        fsrs_stability: 10, // > 7 threshold
        fsrs_difficulty: 8,
      });

      expect(isUnstableWord(stableWord)).toBe(false);
    });

    test('should not mark low difficulty words as unstable', () => {
      const easyWord = createStudyWord({
        fsrs_stability: 5,
        fsrs_difficulty: 5, // < 7.5 threshold
      });

      expect(isUnstableWord(easyWord)).toBe(false);
    });

    test('should handle null values with defaults', () => {
      const wordWithNulls = createStudyWord({
        fsrs_stability: null,
        fsrs_difficulty: null,
      });

      // Default stability is 0 (<= 7), default difficulty is 6.5 (< 7.5)
      expect(isUnstableWord(wordWithNulls)).toBe(false);
    });
  });

  describe('isDueWord', () => {
    test('should return true for new words (state 0)', () => {
      const newWord = createStudyWord({ fsrs_state: 0 });
      expect(isDueWord(newWord)).toBe(true);
    });

    test('should return true for words past due date', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const dueWord = createStudyWord({
        fsrs_state: 2,
        fsrs_due: pastDate,
        fsrs_last_review: null,
      });

      expect(isDueWord(dueWord)).toBe(true);
    });

    test('should return false for words not yet due', () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const notDueWord = createStudyWord({
        fsrs_state: 2,
        fsrs_due: futureDate,
      });

      expect(isDueWord(notDueWord)).toBe(false);
    });

    test('should return false for recently reviewed words', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const recentReview = new Date(now.getTime() - 30 * 60 * 1000).toISOString(); // 30 min ago

      const recentlyReviewedWord = createStudyWord({
        fsrs_state: 2,
        fsrs_due: pastDate,
        fsrs_last_review: recentReview,
      });

      expect(isDueWord(recentlyReviewedWord)).toBe(false);
    });
  });

  describe('isLearnedWord', () => {
    test('should return true for state 2 words', () => {
      const learnedWord = createStudyWord({ fsrs_state: 2 });
      expect(isLearnedWord(learnedWord)).toBe(true);
    });

    test('should return false for state 0 words', () => {
      const newWord = createStudyWord({ fsrs_state: 0 });
      expect(isLearnedWord(newWord)).toBe(false);
    });

    test('should return false for state 1 words', () => {
      const learningWord = createStudyWord({ fsrs_state: 1 });
      expect(isLearnedWord(learningWord)).toBe(false);
    });
  });

  describe('isMasteredWord', () => {
    test('should return true for state 2 with stability >= 5', () => {
      const masteredWord = createStudyWord({
        fsrs_state: 2,
        fsrs_stability: 5,
      });
      expect(isMasteredWord(masteredWord)).toBe(true);
    });

    test('should return false for state 2 with stability < 5', () => {
      const notMasteredWord = createStudyWord({
        fsrs_state: 2,
        fsrs_stability: 4.9,
      });
      expect(isMasteredWord(notMasteredWord)).toBe(false);
    });

    test('should return false for non-state-2 words even with high stability', () => {
      const learningWord = createStudyWord({
        fsrs_state: 1,
        fsrs_stability: 10,
      });
      expect(isMasteredWord(learningWord)).toBe(false);
    });

    test('should handle null stability as 0', () => {
      const wordWithNullStability = createStudyWord({
        fsrs_state: 2,
        fsrs_stability: null,
      });
      expect(isMasteredWord(wordWithNullStability)).toBe(false);
    });
  });

  describe('isExtraHardWord', () => {
    test('should return true for difficulty > 8.0', () => {
      const hardWord = createStudyWord({ fsrs_difficulty: 8.5 });
      expect(isExtraHardWord(hardWord)).toBe(true);
    });

    test('should return false for difficulty <= 8.0', () => {
      const normalWord = createStudyWord({ fsrs_difficulty: 8.0 });
      expect(isExtraHardWord(normalWord)).toBe(false);
    });

    test('should return false for difficulty at default (6.5)', () => {
      const defaultWord = createStudyWord({ fsrs_difficulty: 6.5 });
      expect(isExtraHardWord(defaultWord)).toBe(false);
    });

    test('should handle null difficulty with default value', () => {
      const wordWithNullDifficulty = createStudyWord({ fsrs_difficulty: null });
      // Default is 6.5, which is <= 8.0
      expect(isExtraHardWord(wordWithNullDifficulty)).toBe(false);
    });
  });
});
