import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateDueWords,
  calculateLearningWords,
  calculateMasteredWords,
  calculateStrugglingWords,
  calculateWordCategories,
  isStrugglingWord,
} from '@/utils/wordClassification';

// Helper to create study words for this test
const createStudyWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
  createTestWord(overrides);

describe('wordClassification', () => {
  describe('isStrugglingWord', () => {
    it('should identify struggling words correctly', () => {
      const strugglingWord = createStudyWord({
        fsrs_difficulty: 8.5,
        fsrs_lapses: 2,
        fsrs_last_review: new Date().toISOString(),
        fsrs_reps: 3,
      });

      expect(isStrugglingWord(strugglingWord)).toBe(true);
    });

    it('should not identify normal words as struggling', () => {
      const normalWord = createStudyWord({
        fsrs_difficulty: 6.5,
        fsrs_lapses: 0,
        fsrs_stability: 10,
      });

      expect(isStrugglingWord(normalWord)).toBe(false);
    });
  });

  describe('calculateDueWords', () => {
    it('should count due words correctly', () => {
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

    it('should handle null due dates', () => {
      const words = [
        createStudyWord({ fsrs_due: null, fsrs_state: 2 }), // No due date, review state
        createStudyWord({ fsrs_due: null, fsrs_state: 0 }), // No due date, new state (always due)
      ];

      expect(calculateDueWords(words)).toBe(1); // Only new word (state 0) is due
    });
  });

  describe('calculateLearningWords', () => {
    it('should count learning words correctly', () => {
      const words = [
        createStudyWord({ fsrs_state: 0 }), // New - should NOT be counted as learning
        createStudyWord({ fsrs_state: 1 }), // Learning
        createStudyWord({ fsrs_state: 2, fsrs_stability: 3 }), // Review but unstable
        createStudyWord({ fsrs_state: 3 }), // Relearning
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10 }), // Mastered
      ];

      // State 0 (New) words are due for first review, not learning
      // Only states 1, 3, or state 2 with low stability are learning
      expect(calculateLearningWords(words)).toBe(3);
    });
  });

  describe('calculateMasteredWords', () => {
    it('should count mastered words correctly', () => {
      const words = [
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10 }), // Mastered
        createStudyWord({ fsrs_state: 2, fsrs_stability: 3 }), // Not mastered
        createStudyWord({ fsrs_state: 1 }), // Learning
      ];

      expect(calculateMasteredWords(words)).toBe(1);
    });
  });

  describe('calculateStrugglingWords', () => {
    it('should count struggling words that have been reviewed (outside cooldown)', () => {
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
    it('should calculate all categories correctly (respecting struggling cooldown)', () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      const pastBeyondCooldown = new Date(now.getTime() - 13 * 60 * 60 * 1000).toISOString(); // 13 hours ago (beyond 12-hour cooldown)
      const words = [
        createStudyWord({ fsrs_due: pastDate }), // Due
        createStudyWord({ fsrs_state: 0, fsrs_due: null }), // New - should be counted as due for first review
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10, fsrs_due: null }), // Mastered
        createStudyWord({
          fsrs_state: 1, // Learning state
          fsrs_difficulty: 8.5,
          fsrs_lapses: 2,
          fsrs_last_review: pastBeyondCooldown,
          fsrs_reps: 3,
          fsrs_due: null,
        }), // Struggling
      ];

      const result = calculateWordCategories(words);

      expect(result.dueWords).toBe(2); // Past due + new word (state 0)
      expect(result.learningWords).toBe(1); // Only struggling word (state 1)
      expect(result.masteredWords).toBe(1);
      expect(result.strugglingWords).toBe(1);
    });

    it('should prioritize dueWords prop over calculated value', () => {
      const words = [createStudyWord({ fsrs_due: null })]; // No due words
      const result = calculateWordCategories(words, 5); // But prop says 5

      expect(result.dueWords).toBe(5);
    });
  });
});
