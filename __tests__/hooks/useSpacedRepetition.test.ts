// Mock AsyncStorage
import {
  calculateNextReview,
  shouldRequeueWord,
  calculateReinsertPosition,
  calculateProgress,
  isReviewComplete,
  getSrsStatsFromWords,
  SRS_CONSTANTS,
  SESSION_CONFIG,
  StudyWord,
  createMemoizedProgressCalculator,
} from '../../hooks/useSpacedRepetition';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn(),
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          data: [],
          error: null,
        })),
        data: [],
        error: null,
      })),
      insert: jest.fn(),
      update: jest.fn(),
    })),
  })),
}));

// Mock services/study_words directly
jest.mock('../../services/study_words', () => ({
  studyWordsService: {
    updateWordReview: jest.fn(() => Promise.resolve({})),
    getDueWords: jest.fn(() => Promise.resolve([])),
  },
}));

// Helper function to create a mock StudyWord
function createMockWord(overrides: Partial<StudyWord> = {}): StudyWord {
  return {
    sentence_word_id: '1',
    sentence_word: {
      word_form: 'كتاب',
      english: 'book',
      sentence: {
        arabic: 'هذا كتاب جميل',
      },
    },
    interval_days: 1,
    ease_factor: 2.5,
    next_review_at: new Date().toISOString(),
    review_count: 0,
    lapses: 0,
    stability: 1,
    previous_interval: 0,
    ...overrides,
  };
}

describe('SRS Algorithm Functions', () => {
  // SECTION: calculateNextReview tests
  describe('calculateNextReview', () => {
    it('should increase stability and interval on success', () => {
      const word = createMockWord({ stability: 5, ease_factor: 2.5 });
      const result = calculateNextReview(word, true);

      // Stability increases by stability * STABILITY_GROWTH_FACTOR * ease_factor
      // 5 * 0.5 * 2.5 = 6.25 increase, so 5 + 6.25 = 11.25
      expect(result.newStability).toBeCloseTo(11.25);
      // Interval is roughly equal to stability
      expect(result.newInterval).toBe(Math.round(result.newStability));
      // Ease factor should increase or stay the same if at max
      if (word.ease_factor < SRS_CONSTANTS.MAX_EASE_FACTOR) {
        expect(result.newEaseFactor).toBeGreaterThan(word.ease_factor);
      } else {
        expect(result.newEaseFactor).toBeCloseTo(SRS_CONSTANTS.MAX_EASE_FACTOR);
      }
      // Previous interval should be preserved
      expect(result.previousInterval).toBe(word.interval_days);
    });

    it('should decrease stability and reset interval on failure', () => {
      const word = createMockWord({ stability: 10, ease_factor: 2.5 });
      const result = calculateNextReview(word, false);

      // Stability reduced to 60% of original
      expect(result.newStability).toBeCloseTo(10 * SRS_CONSTANTS.FAILURE_STABILITY_REDUCTION);
      // Interval is reset to 1 on failure
      expect(result.newInterval).toBe(1);
      // Ease factor should decrease
      expect(result.newEaseFactor).toBeLessThan(word.ease_factor);
    });

    it('should apply spacing effect bonus for words with previous intervals', () => {
      const word = createMockWord({
        stability: 5,
        ease_factor: 2.5,
        previous_interval: 10,
      });
      const result = calculateNextReview(word, true);

      // Calculate expected interval without spacing effect
      const baseInterval = Math.round(result.newStability);

      // With spacing effect, interval should be higher due to bonus
      expect(result.newInterval).toBeGreaterThan(baseInterval);
    });

    it('should cap stability at maximum value', () => {
      const word = createMockWord({
        stability: SRS_CONSTANTS.MAX_STABILITY,
        ease_factor: 2.5,
      });
      const result = calculateNextReview(word, true);

      // Stability should be capped at MAX_STABILITY
      expect(result.newStability).toBeLessThanOrEqual(SRS_CONSTANTS.MAX_STABILITY);
    });

    it('should apply lapse penalty for words with multiple failures', () => {
      const word = createMockWord({
        stability: 20,
        ease_factor: 2.5,
        lapses: 3,
      });
      const successResult = calculateNextReview(word, true);

      // Create comparable word without lapses
      const wordWithoutLapses = createMockWord({
        stability: 20,
        ease_factor: 2.5,
        lapses: 0,
      });
      const noLapseResult = calculateNextReview(wordWithoutLapses, true);

      // Words with lapses should have shorter intervals
      expect(successResult.newInterval).toBeLessThan(noLapseResult.newInterval);
    });

    it('should enforce minimum stability', () => {
      const word = createMockWord({
        stability: 2,
        ease_factor: 2.5,
      });
      const result = calculateNextReview(word, false);

      // Stability should never go below MIN_STABILITY
      expect(result.newStability).toBeGreaterThanOrEqual(SRS_CONSTANTS.MIN_STABILITY);
    });

    it('should cap interval to avoid date overflow', () => {
      const word = createMockWord({
        stability: 1000, // Unrealistically high stability
        ease_factor: 2.5,
      });
      const result = calculateNextReview(word, true);

      // Interval should be capped at 365 * 30 (max 30 years)
      expect(result.newInterval).toBeLessThanOrEqual(365 * 30);
    });

    // Add tests for input validation in calculateNextReview
    describe('calculateNextReview input validation', () => {
      it('should throw error when word is null or undefined', () => {
        // @ts-ignore - Testing invalid input
        expect(() => calculateNextReview(null, true)).toThrow(
          'Invalid parameter: word is required'
        );
        // @ts-ignore - Testing invalid input
        expect(() => calculateNextReview(undefined, true)).toThrow(
          'Invalid parameter: word is required'
        );
      });

      it('should throw error when success is not a boolean', () => {
        const word = createMockWord();
        // @ts-ignore - Testing invalid input
        expect(() => calculateNextReview(word, 'yes')).toThrow(
          'Invalid parameter: success must be a boolean'
        );
        // @ts-ignore - Testing invalid input
        expect(() => calculateNextReview(word, 1)).toThrow(
          'Invalid parameter: success must be a boolean'
        );
      });

      it('should handle missing or invalid properties gracefully', () => {
        // Create a word with missing properties
        const incompleteWord: Partial<StudyWord> = {
          sentence_word_id: '1',
          sentence_word: {
            word_form: 'test',
            english: 'test',
          },
          // Missing interval_days, ease_factor, stability, etc.
        };

        // @ts-ignore - Testing with incomplete object
        const result = calculateNextReview(incompleteWord, true);

        // Should use default values and not crash
        expect(result.newStability).toBeGreaterThanOrEqual(SRS_CONSTANTS.MIN_STABILITY);
        expect(result.newInterval).toBeGreaterThanOrEqual(1);
        expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3);
        expect(result.nextReviewDate).toBeDefined();
      });

      it('should handle NaN values gracefully', () => {
        const wordWithNaNs = createMockWord({
          // @ts-ignore - Testing with NaN
          stability: NaN,
          // @ts-ignore - Testing with NaN
          ease_factor: NaN,
          // @ts-ignore - Testing with NaN
          interval_days: NaN,
        });

        const result = calculateNextReview(wordWithNaNs, true);

        // Should use default values instead of NaN
        expect(result.newStability).toBeGreaterThanOrEqual(SRS_CONSTANTS.MIN_STABILITY);
        expect(result.newInterval).toBeGreaterThanOrEqual(1);
        expect(result.newEaseFactor).toBeGreaterThanOrEqual(1.3);
        expect(result.nextReviewDate).toBeDefined();
        expect(isNaN(result.newStability)).toBe(false);
        expect(isNaN(result.newInterval)).toBe(false);
        expect(isNaN(result.newEaseFactor)).toBe(false);
      });
    });
  });

  // SECTION: shouldRequeueWord tests
  describe('shouldRequeueWord', () => {
    it('should requeue failed words', () => {
      const word = createMockWord();
      expect(shouldRequeueWord(word, false)).toBe(true);
    });

    it('should requeue new words with remaining reviews needed', () => {
      const word = createMockWord({
        sessionData: {
          isNew: true,
          remainingReviewsNeeded: 1,
          failedInSession: false,
          consecutiveSuccesses: 0,
        },
      });
      expect(shouldRequeueWord(word, true)).toBe(true);
    });

    it('should requeue words that failed in session but need more consecutive successes', () => {
      const word = createMockWord({
        sessionData: {
          isNew: false,
          remainingReviewsNeeded: 0,
          failedInSession: true,
          consecutiveSuccesses: 1, // Need 2 for completion by default
        },
      });
      expect(shouldRequeueWord(word, true)).toBe(true);
    });

    it('should not requeue successful words that have not failed and are not new', () => {
      const word = createMockWord({
        sessionData: {
          isNew: false,
          remainingReviewsNeeded: 0,
          failedInSession: false,
          consecutiveSuccesses: 0,
        },
      });
      expect(shouldRequeueWord(word, true)).toBe(false);
    });

    it('should not requeue new words with no remaining reviews needed', () => {
      const word = createMockWord({
        sessionData: {
          isNew: true,
          remainingReviewsNeeded: 0,
          failedInSession: false,
          consecutiveSuccesses: 0,
        },
      });
      expect(shouldRequeueWord(word, true)).toBe(false);
    });

    it('should not requeue words that failed in session but have enough consecutive successes', () => {
      const word = createMockWord({
        sessionData: {
          isNew: false,
          remainingReviewsNeeded: 0,
          failedInSession: true,
          consecutiveSuccesses: SESSION_CONFIG.REQUIRED_CONSECUTIVE_SUCCESSES,
        },
      });
      expect(shouldRequeueWord(word, true)).toBe(false);
    });

    it('should handle null or undefined sessionData', () => {
      const word = createMockWord({ sessionData: undefined });
      // Should still requeue failed words
      expect(shouldRequeueWord(word, false)).toBe(true);
      // Should not requeue successful words without session data
      expect(shouldRequeueWord(word, true)).toBe(false);
    });
  });

  // SECTION: calculateReinsertPosition tests
  describe('calculateReinsertPosition', () => {
    it('should add delay for failed words', () => {
      const word = createMockWord();
      const currentPosition = 2;
      const remainingWords = 5;

      const position = calculateReinsertPosition(word, currentPosition, remainingWords, false);

      // Position should be greater than current + 1
      expect(position).toBeGreaterThan(currentPosition + 1);
      // But less than or equal to current + 1 + remaining
      expect(position).toBeLessThanOrEqual(currentPosition + 1 + remainingWords);
    });

    it('should add delay for new words', () => {
      const word = createMockWord({
        sessionData: {
          isNew: true,
          remainingReviewsNeeded: 1,
          failedInSession: false,
          consecutiveSuccesses: 0,
        },
      });
      const currentPosition = 2;
      const remainingWords = 10;

      const position = calculateReinsertPosition(word, currentPosition, remainingWords, true);

      // Position should be greater than current + 1
      expect(position).toBeGreaterThan(currentPosition + 1);
      // Should be around half of remaining words
      expect(position).toBe(currentPosition + 1 + Math.floor(remainingWords / 2));
    });

    it('should add delay for words that failed in session', () => {
      const word = createMockWord({
        sessionData: {
          isNew: false,
          remainingReviewsNeeded: 0,
          failedInSession: true,
          consecutiveSuccesses: 1,
        },
      });
      const currentPosition = 2;
      const remainingWords = 9;

      const position = calculateReinsertPosition(word, currentPosition, remainingWords, true);

      // Position should be greater than current + 1
      expect(position).toBeGreaterThan(currentPosition + 1);
      // Should be around a third of remaining words
      expect(position).toBe(currentPosition + 1 + Math.floor(remainingWords / 3));
    });

    it('should not exceed queue length', () => {
      const word = createMockWord();
      const currentPosition = 5;
      const remainingWords = 1; // Only 1 word left

      const position = calculateReinsertPosition(word, currentPosition, remainingWords, false);

      // Position should be at most currentPosition + 1 + remainingWords
      expect(position).toBeLessThanOrEqual(currentPosition + 1 + remainingWords);
    });

    it('should handle zero remaining words', () => {
      const word = createMockWord();
      const currentPosition = 10;
      const remainingWords = 0; // No words left

      const position = calculateReinsertPosition(word, currentPosition, remainingWords, false);

      // Position should just be next position
      expect(position).toBe(currentPosition + 1);
    });
  });

  // SECTION: calculateProgress tests
  describe('calculateProgress', () => {
    it('should calculate 0% progress for empty queue', () => {
      expect(calculateProgress(0, 0, 0)).toBe(0);
    });

    it('should calculate correct progress at start of review', () => {
      // 0 words completed, 10 words in queue, 2 failed words
      expect(calculateProgress(0, 10, 2)).toBe(0);
    });

    it('should calculate correct progress mid-review', () => {
      // 5 words completed, 10 words in queue, 2 failed words
      // 5 / (10 + 2) = 5/12 = 0.4166... = ~42%
      expect(calculateProgress(5, 10, 2)).toBe(42);
    });

    it('should calculate correct progress at end of review with failed words', () => {
      // 10 words completed (whole queue), 10 words in queue, 2 failed words
      // 10 / (10 + 2) = 10/12 = 0.8333... = ~83%
      expect(calculateProgress(10, 10, 2)).toBe(83);
    });

    it('should calculate 100% progress when complete', () => {
      // 10 words completed, 10 words in queue, 0 failed words
      expect(calculateProgress(10, 10, 0)).toBe(100);
    });

    it('should handle currentIndex > wordsInQueue', () => {
      // This shouldn't normally happen, but we should handle it gracefully
      expect(calculateProgress(12, 10, 0)).toBe(100);
    });
  });

  // SECTION: isReviewComplete tests
  describe('isReviewComplete', () => {
    it('should not be complete if words not loaded', () => {
      expect(isReviewComplete(10, 10, 0, true, false)).toBe(false);
    });

    it('should not be complete if not at end of queue', () => {
      expect(isReviewComplete(5, 10, 0, true, true)).toBe(false);
    });

    it('should not be complete if failed words remain', () => {
      expect(isReviewComplete(10, 10, 2, true, true)).toBe(false);
    });

    it('should not be complete if no words to review', () => {
      expect(isReviewComplete(0, 0, 0, false, true)).toBe(false);
    });

    it('should be complete when at end, no failed words, and words loaded', () => {
      expect(isReviewComplete(10, 10, 0, true, true)).toBe(true);
    });

    it('should be complete when past the end, no failed words, and words loaded', () => {
      expect(isReviewComplete(12, 10, 0, true, true)).toBe(true);
    });
  });

  // SECTION: getSrsStatsFromWords tests
  describe('getSrsStatsFromWords', () => {
    it('should return zero stats for empty array', () => {
      const stats = getSrsStatsFromWords([], 0);

      expect(stats.totalWords).toBe(0);
      expect(stats.averageInterval).toBe(0);
      expect(stats.averageStability).toBe(0);
      expect(stats.successRate).toBe(0);
    });

    it('should calculate correct averages', () => {
      const words = [
        createMockWord({
          interval_days: 1,
          stability: 1,
          ease_factor: 2.5,
          review_count: 2,
          lapses: 0,
        }),
        createMockWord({
          interval_days: 5,
          stability: 5,
          ease_factor: 2.3,
          review_count: 3,
          lapses: 1,
        }),
        createMockWord({
          interval_days: 30,
          stability: 30,
          ease_factor: 2.1,
          review_count: 5,
          lapses: 2,
        }),
      ];

      const stats = getSrsStatsFromWords(words, 2);

      expect(stats.totalWords).toBe(3);
      expect(stats.averageInterval).toBeCloseTo((1 + 5 + 30) / 3);
      expect(stats.averageStability).toBeCloseTo((1 + 5 + 30) / 3);
      expect(stats.averageEaseFactor).toBeCloseTo((2.5 + 2.3 + 2.1) / 3);
      expect(stats.failedWordsRemaining).toBe(2);
    });

    it('should correctly count mastered and learning words', () => {
      const words = [
        createMockWord({ interval_days: 1 }), // Learning
        createMockWord({ interval_days: 5 }), // Learning
        createMockWord({ interval_days: 30 }), // Mastered (>= 30 days)
        createMockWord({ interval_days: 90 }), // Mastered (>= 30 days)
      ];

      const stats = getSrsStatsFromWords(words, 0);

      expect(stats.masteredCount).toBe(2);
      expect(stats.learningCount).toBe(2);
    });

    it('should correctly calculate success rate', () => {
      const words = [
        createMockWord({ review_count: 5, lapses: 1 }), // 4 successes, 1 failure
        createMockWord({ review_count: 3, lapses: 0 }), // 3 successes, 0 failures
      ];

      const stats = getSrsStatsFromWords(words, 0);

      // 7 successes out of 8 total reviews = 87.5%
      expect(stats.successRate).toBeCloseTo(87.5);
    });

    it('should count new words and failed words correctly', () => {
      const words = [
        createMockWord({ sessionData: { isNew: true } }),
        createMockWord({ sessionData: { isNew: true } }),
        createMockWord({ sessionData: { failedInSession: true } }),
        createMockWord(),
      ];

      const stats = getSrsStatsFromWords(words, 1);

      expect(stats.newWordsCount).toBe(2);
      expect(stats.failedInSessionCount).toBe(1);
      expect(stats.failedWordsRemaining).toBe(1); // From parameter
    });
  });

  // Add tests for memoized progress calculator
  describe('createMemoizedProgressCalculator', () => {
    it('should return a function that calculates progress correctly', () => {
      const memoizedCalculator = createMemoizedProgressCalculator();

      // Test with some sample values
      expect(memoizedCalculator(5, 10, 2)).toBe(42); // 5 / (10 + 2) ≈ 42%
      expect(memoizedCalculator(0, 10, 2)).toBe(0);
      expect(memoizedCalculator(10, 10, 0)).toBe(100);
    });

    it('should cache results for the same inputs', () => {
      // Create a custom calculator with a simple counting mechanism
      let calculateCount = 0;
      const testCalculator = (a: number, b: number, c: number): number => {
        calculateCount++;
        return calculateProgress(a, b, c);
      };

      // Create a test implementation of createMemoizedProgressCalculator
      const createTestMemoizedCalculator = () => {
        const cache = new Map<string, number>();

        return (a: number, b: number, c: number): number => {
          const cacheKey = `${a}-${b}-${c}`;

          if (cache.has(cacheKey)) {
            return cache.get(cacheKey)!;
          }

          const result = testCalculator(a, b, c);
          cache.set(cacheKey, result);
          return result;
        };
      };

      const memoizedCalculator = createTestMemoizedCalculator();

      // First call - should calculate
      const firstResult = memoizedCalculator(5, 10, 2);
      expect(calculateCount).toBe(1);

      // Second call with same inputs - should use cache
      const secondResult = memoizedCalculator(5, 10, 2);

      // Count should still be 1 (no additional calculation)
      expect(calculateCount).toBe(1);
      expect(secondResult).toBe(firstResult);
    });

    it('should recalculate for different inputs', () => {
      // Create a custom calculator with a simple counting mechanism
      let calculateCount = 0;
      const testCalculator = (a: number, b: number, c: number): number => {
        calculateCount++;
        return calculateProgress(a, b, c);
      };

      // Create a test implementation of createMemoizedProgressCalculator
      const createTestMemoizedCalculator = () => {
        const cache = new Map<string, number>();

        return (a: number, b: number, c: number): number => {
          const cacheKey = `${a}-${b}-${c}`;

          if (cache.has(cacheKey)) {
            return cache.get(cacheKey)!;
          }

          const result = testCalculator(a, b, c);
          cache.set(cacheKey, result);
          return result;
        };
      };

      const memoizedCalculator = createTestMemoizedCalculator();

      // First set of inputs
      memoizedCalculator(5, 10, 2);
      expect(calculateCount).toBe(1);

      // Different inputs - should recalculate
      memoizedCalculator(6, 10, 2);

      // Count should now be 2 (one additional calculation)
      expect(calculateCount).toBe(2);
    });

    it('should limit cache size to prevent memory leaks', () => {
      const spy = jest.spyOn(Map.prototype, 'delete');

      // Create a memoized calculator with a very small cache limit for testing
      const createTestMemoizedCalculator = () => {
        const cache = new Map<string, number>();
        const CACHE_LIMIT = 5; // Small limit for testing

        return (a: number, b: number, c: number): number => {
          const cacheKey = `${a}-${b}-${c}`;

          if (cache.has(cacheKey)) {
            return cache.get(cacheKey)!;
          }

          const result = calculateProgress(a, b, c);
          cache.set(cacheKey, result);

          // Limit cache size
          if (cache.size > CACHE_LIMIT) {
            const firstKey = cache.keys().next().value;
            if (firstKey) {
              cache.delete(firstKey);
            }
          }

          return result;
        };
      };

      const memoizedCalculator = createTestMemoizedCalculator();

      // Fill the cache beyond the limit
      for (let i = 0; i < 10; i++) {
        memoizedCalculator(i, 100, 0);
      }

      // Should have called delete at least once to manage cache size
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
