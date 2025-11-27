/**
 * useRecommendationEngine Hook Tests
 *
 * Tests recommendation logic for vocabulary study guidance.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { renderHook } from '@testing-library/react-native';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { useRecommendationEngine } from '@/hooks/study/useRecommendationEngine';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock fsrsUtils
jest.mock('@/utils/fsrsUtils', () => ({
  calculateNextDueDate: jest.fn(() => null),
}));

describe('useRecommendationEngine', () => {
  const createMockWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
    ({
      id: 1,
      user_id: 'user-123',
      root_id: 42,
      fsrs_state: 2, // Review state
      fsrs_stability: 10,
      fsrs_difficulty: 0.3,
      fsrs_due: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      fsrs_last_review: new Date().toISOString(),
      fsrs_reps: 5,
      fsrs_lapses: 0,
      fsrs_elapsed_days: 1,
      fsrs_scheduled_days: 3,
      created_at: new Date().toISOString(),
      root: {
        id: 42,
        letters: 'كتب',
        meaning: 'to write',
        audio_url: null,
        audio_url_en: null,
      },
      ...overrides,
    }) as StudyWord;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('No Words State', () => {
    test('returns start recommendation when no words', () => {
      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: [],
          dueWordsCount: 0,
          currentRetention: 0,
          learningWords: 0,
          masteredWords: 0,
        }),
      );

      expect(result.current.type).toBe('start');
      expect(result.current.message).toContain('Start by adding');
    });
  });

  describe('Review States', () => {
    test('returns review recommendation when words are due', () => {
      const words = [createMockWord()];

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 3,
          currentRetention: 80,
          learningWords: 1,
          masteredWords: 0,
        }),
      );

      expect(result.current.type).toBe('review');
      expect(result.current.message).toContain('due');
    });

    test('returns urgent review when retention is low', () => {
      const words = [createMockWord()];

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 5,
          currentRetention: 40, // Below 50% threshold
          learningWords: 1,
          masteredWords: 0,
        }),
      );

      expect(result.current.type).toBe('review');
      expect(result.current.message).toContain('Memory Strength is at 40%');
      expect(result.current.message).toContain('below 50%');
    });

    test('mentions struggling words when retention is low and words are struggling', () => {
      // Create words with high lapses (struggling)
      const strugglingWords = [
        createMockWord({ fsrs_lapses: 4 }),
        createMockWord({ fsrs_lapses: 5 }),
        createMockWord({ fsrs_lapses: 3 }),
      ];

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: strugglingWords,
          dueWordsCount: 3,
          currentRetention: 40,
          learningWords: 3,
          masteredWords: 0,
        }),
      );

      expect(result.current.type).toBe('review');
      expect(result.current.message).toContain('difficult words');
    });
  });

  describe('Consolidation States', () => {
    test('returns consolidate when learning load is heavy (>70%)', () => {
      const learningWords = Array(8)
        .fill(null)
        .map((_, i) => createMockWord({ id: i, fsrs_state: 1 })); // New/learning state
      const masteredWords = Array(2)
        .fill(null)
        .map((_, i) => createMockWord({ id: i + 8, fsrs_state: 2 }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: [...learningWords, ...masteredWords],
          dueWordsCount: 0,
          currentRetention: 70,
          learningWords: 8, // 80% of total
          masteredWords: 2,
        }),
      );

      expect(result.current.type).toBe('consolidate');
      expect(result.current.message).toContain('active learning');
    });

    test('returns consolidate with balanced message for moderate load (50-70%)', () => {
      const words = Array(10)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0,
          currentRetention: 75,
          learningWords: 6, // 60% of total
          masteredWords: 4,
        }),
      );

      expect(result.current.type).toBe('consolidate');
      expect(result.current.message).toContain('growing stronger');
    });
  });

  describe('Add Words State', () => {
    test('encourages adding words when vocabulary is small and caught up', () => {
      const words = Array(20)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0,
          currentRetention: 85,
          learningWords: 5, // 25% - not heavy
          masteredWords: 15,
        }),
      );

      expect(result.current.type).toBe('add_words');
      expect(result.current.message).toContain('room to grow');
    });
  });

  describe('Balanced State', () => {
    test('returns balanced when established vocabulary and caught up', () => {
      const words = Array(65)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0,
          currentRetention: 90,
          learningWords: 10,
          masteredWords: 55, // Not a milestone number (10, 25, 50, 100, etc.)
        }),
      );

      expect(result.current.type).toBe('balanced');
      expect(result.current.message).toContain('All caught up');
      expect(result.current.message).toContain('55 words mastered');
    });
  });

  describe('Milestone Messages', () => {
    test('celebrates 10 words mastered milestone', () => {
      const words = Array(10)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0, // Must be 0 for milestone to show
          currentRetention: 85,
          learningWords: 0,
          masteredWords: 10,
        }),
      );

      expect(result.current.type).toBe('milestone');
      expect(result.current.message).toContain('10 words mastered');
    });

    test('celebrates 100 words mastered milestone', () => {
      const words = Array(100)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0,
          currentRetention: 90,
          learningWords: 0,
          masteredWords: 100,
        }),
      );

      expect(result.current.type).toBe('milestone');
      expect(result.current.message).toContain('100 words mastered');
    });

    test('celebrates 7-day streak milestone', () => {
      const words = Array(20)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0,
          currentRetention: 85,
          learningWords: 5,
          masteredWords: 15,
          currentStreak: 7,
        }),
      );

      expect(result.current.type).toBe('milestone');
      expect(result.current.message).toContain('7-day streak');
    });

    test('does not show milestone when words are due', () => {
      const words = Array(10)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 3, // Has due words
          currentRetention: 85,
          learningWords: 0,
          masteredWords: 10,
        }),
      );

      // Should be review, not milestone
      expect(result.current.type).toBe('review');
    });
  });

  describe('Context Information', () => {
    test('includes streak context in balanced message', () => {
      const words = Array(65)
        .fill(null)
        .map((_, i) =>
          createMockWord({
            id: i,
            fsrs_last_review: new Date().toISOString(), // Reviewed today
          }),
        );

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0,
          currentRetention: 90,
          learningWords: 10,
          masteredWords: 55, // Not a milestone number
          currentStreak: 15, // Not a streak milestone (7, 30, 60, 100, 365)
        }),
      );

      expect(result.current.message).toContain('15-day streak');
    });

    test('includes milestone hint when close to next milestone', () => {
      const words = Array(48)
        .fill(null)
        .map((_, i) => createMockWord({ id: i }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: words,
          dueWordsCount: 0,
          currentRetention: 85,
          learningWords: 0,
          masteredWords: 48, // 2 away from 50
        }),
      );

      expect(result.current.message).toContain('2');
      expect(result.current.message).toContain('50');
    });
  });
});
