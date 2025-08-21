import type { StudyWord } from '@/types/vocabulary.types';
import {
  calculateDueWords,
  calculateLearningWords,
  calculateMasteredWords,
  calculateStrugglingWords,
  calculateWordCategories,
  isStrugglingWord,
} from '@/utils/wordClassification';

// Mock data for testing
const createStudyWord = (overrides: Partial<StudyWord> = {}): StudyWord => ({
  id: 1,
  root_id: 1,
  sentence_id: 1,
  position: 1,
  word_form: 'test',
  english: 'test',
  difficulty_level: 5,
  grammar_note: null,
  created_at: '2024-01-01T00:00:00Z',
  fsrs_state: 0,
  fsrs_difficulty: 6.5,
  fsrs_stability: 0,
  fsrs_lapses: 0,
  fsrs_reps: 0,
  fsrs_last_review: null,
  fsrs_due: null,
  ...overrides,
});

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
        createStudyWord({ fsrs_due: pastDate }),
        createStudyWord({ fsrs_due: futureDate }),
        createStudyWord({ fsrs_due: pastDate }),
      ];

      expect(calculateDueWords(words)).toBe(2);
    });

    it('should handle null due dates', () => {
      const words = [createStudyWord({ fsrs_due: null }), createStudyWord({ fsrs_due: null })];

      expect(calculateDueWords(words)).toBe(0);
    });
  });

  describe('calculateLearningWords', () => {
    it('should count learning words correctly', () => {
      const words = [
        createStudyWord({ fsrs_state: 0 }), // New
        createStudyWord({ fsrs_state: 1 }), // Learning
        createStudyWord({ fsrs_state: 2, fsrs_stability: 3 }), // Review but unstable
        createStudyWord({ fsrs_state: 3 }), // Relearning
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10 }), // Mastered
      ];

      expect(calculateLearningWords(words)).toBe(4);
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
        createStudyWord({ fsrs_state: 0 }), // Learning
        createStudyWord({ fsrs_state: 2, fsrs_stability: 10 }), // Mastered
        createStudyWord({
          fsrs_state: 1, // Learning state
          fsrs_difficulty: 8.5,
          fsrs_lapses: 2,
          fsrs_last_review: pastBeyondCooldown,
          fsrs_reps: 3,
        }), // Struggling
      ];

      const result = calculateWordCategories(words);

      expect(result.dueWords).toBe(1);
      expect(result.learningWords).toBe(3); // Due word (state 0) + learning word (state 0) + struggling word (state 1)
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
