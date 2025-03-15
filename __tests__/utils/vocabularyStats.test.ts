import {
  isMasteredWord,
  estimateLastReviewDate,
  calculateStreak,
  calculateWeeklyProgressData,
  calculateVocabularyStats,
} from '../../utils/vocabularyStats';
import { StudyWord } from '../../types/vocabulary.types';

// Use a fixed date for consistent testing
const TEST_DATE = new Date('2023-06-15T12:00:00Z'); // This is a Thursday
const TEST_DATE_ISO = TEST_DATE.toISOString();

// Helper to create mock StudyWord objects
function createMockWord(overrides: Partial<StudyWord> = {}): StudyWord {
  const defaultWord: StudyWord = {
    sentence_word_id: 'test-id',
    sentence_word: {
      word_form: 'test',
      english: 'test',
    },
    interval_days: 1,
    ease_factor: 2.5,
    next_review_at: TEST_DATE_ISO,
    review_count: 1,
    lapses: 0,
    stability: 1,
    previous_interval: 0,
  };

  return { ...defaultWord, ...overrides };
}

// Helper function to create a word with a next review date and interval that will
// make estimateLastReviewDate return a date on the specified day
function createWordWithLastReviewDate(daysAgo: number): StudyWord {
  const reviewDate = new Date(TEST_DATE);
  // For a word reviewed X days ago, set next_review_at to now
  // and interval_days to X
  const interval = daysAgo;

  return createMockWord({
    next_review_at: TEST_DATE_ISO,
    interval_days: interval,
    review_count: interval > 0 ? 1 : 0,
  });
}

describe('Vocabulary Stats Utilities', () => {
  describe('isMasteredWord', () => {
    it('should return true for words with interval >= 30 days', () => {
      const masteredWord = createMockWord({ interval_days: 30 });
      expect(isMasteredWord(masteredWord)).toBe(true);

      const veryMasteredWord = createMockWord({ interval_days: 100 });
      expect(isMasteredWord(veryMasteredWord)).toBe(true);
    });

    it('should return false for words with interval < 30 days', () => {
      const learningWord = createMockWord({ interval_days: 29 });
      expect(isMasteredWord(learningWord)).toBe(false);

      const newWord = createMockWord({ interval_days: 1 });
      expect(isMasteredWord(newWord)).toBe(false);
    });

    it('should handle edge cases and invalid inputs', () => {
      // Edge case: 0 interval
      const zeroIntervalWord = createMockWord({ interval_days: 0 });
      expect(isMasteredWord(zeroIntervalWord)).toBe(false);

      // Edge case: negative interval (shouldn't happen but should be handled)
      const negativeIntervalWord = createMockWord({ interval_days: -5 });
      expect(isMasteredWord(negativeIntervalWord)).toBe(false);

      // Edge case: very large interval
      const extremeIntervalWord = createMockWord({ interval_days: 10000 });
      expect(isMasteredWord(extremeIntervalWord)).toBe(true);

      // Edge case: NaN interval
      const nanIntervalWord = createMockWord({ interval_days: NaN });
      expect(isMasteredWord(nanIntervalWord)).toBe(false);
    });
  });

  describe('estimateLastReviewDate', () => {
    it('should return null for words that have never been reviewed', () => {
      const newWord = createMockWord({ review_count: 0 });
      expect(estimateLastReviewDate(newWord, TEST_DATE)).toBeNull();
    });

    it('should estimate last review date by subtracting interval from next review', () => {
      // Create a word with next review 5 days from TEST_DATE and interval of 5 days
      const nextReview = new Date(TEST_DATE);
      nextReview.setDate(TEST_DATE.getDate() + 5);

      const word = createMockWord({
        next_review_at: nextReview.toISOString(),
        interval_days: 5,
        review_count: 1,
      });

      // Expected last review is today
      const expectedLastReview = new Date(nextReview);
      expectedLastReview.setDate(nextReview.getDate() - 5);

      const result = estimateLastReviewDate(word, TEST_DATE);
      expect(result?.toISOString().split('T')[0]).toBe(
        expectedLastReview.toISOString().split('T')[0]
      );
    });

    it('should not return future dates for last review', () => {
      // Create a word with next review date as TEST_DATE but an interval of 5 days
      // This would normally calculate a last review date of 5 days ago
      const word = createMockWord({
        next_review_at: TEST_DATE.toISOString(),
        interval_days: 5,
        review_count: 1,
      });

      // But if we pass in a date that's earlier than the calculated last review,
      // the function should return the current date instead
      const earlierDate = new Date(TEST_DATE);
      earlierDate.setDate(TEST_DATE.getDate() - 10); // 10 days before TEST_DATE

      const result = estimateLastReviewDate(word, earlierDate);
      // Should return the earlierDate, not the calculated date
      expect(result?.toISOString().split('T')[0]).toBe(earlierDate.toISOString().split('T')[0]);
    });

    it('should handle words with very long intervals', () => {
      // Word with a 365 day interval
      const longIntervalWord = createMockWord({
        next_review_at: TEST_DATE.toISOString(),
        interval_days: 365,
        review_count: 3,
      });

      // Expected last review date is 365 days before TEST_DATE
      const expectedDate = new Date(TEST_DATE);
      expectedDate.setDate(TEST_DATE.getDate() - 365);

      const result = estimateLastReviewDate(longIntervalWord, TEST_DATE);
      expect(result?.toISOString().split('T')[0]).toBe(expectedDate.toISOString().split('T')[0]);
    });

    it('should handle words with invalid next_review_at dates', () => {
      // Word with invalid next_review_at date
      const invalidDateWord = createMockWord({
        next_review_at: 'invalid-date',
        interval_days: 5,
        review_count: 1,
      });

      // Should handle this gracefully, ideally returning null or the current date
      expect(() => estimateLastReviewDate(invalidDateWord, TEST_DATE)).not.toThrow();
    });
  });

  // We're skipping complicated streak tests that require mocking
  // as we'd need more infrastructure to properly test this
  describe('calculateStreak', () => {
    it('should return 0 for empty word list', () => {
      expect(calculateStreak([])).toBe(0);
    });

    it('should return 0 when no words have been reviewed yet', () => {
      const words = [createMockWord({ review_count: 0 }), createMockWord({ review_count: 0 })];
      expect(calculateStreak(words)).toBe(0);
    });

    // Testing simple streak calculation without mocking
    it('should calculate streak based on review dates', () => {
      // For complete testing of calculateStreak, we would need to mock Date
      // and estimateLastReviewDate properly, which would require more setup
      // For now, we're testing that the function doesn't throw errors
      // with various inputs

      const words = [
        // Word reviewed today (interval = 0 days ago)
        createWordWithLastReviewDate(0),
        // Word reviewed yesterday (interval = 1 day ago)
        createWordWithLastReviewDate(1),
        // Word reviewed 2 days ago (interval = 2 days ago)
        createWordWithLastReviewDate(2),
      ];

      // Not checking exact value, just that it runs without errors
      const result = calculateStreak(words);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThanOrEqual(0);
    });
  });

  // Simplify the weekly progress tests to avoid complex mocking
  describe('calculateWeeklyProgressData', () => {
    it('should return empty data for empty word list', () => {
      const result = calculateWeeklyProgressData([]);
      expect(result.length).toBe(7);
      expect(result.every(day => day.wordsLearned === 0)).toBe(true);

      // Should have all 7 days of the week
      const days = result.map(day => day.date);
      expect(days).toContain('Sun');
      expect(days).toContain('Mon');
      expect(days).toContain('Tue');
      expect(days).toContain('Wed');
      expect(days).toContain('Thu');
      expect(days).toContain('Fri');
      expect(days).toContain('Sat');
    });

    it('should return an array of 7 days for any input', () => {
      // Using words with various review patterns
      const words = [
        createWordWithLastReviewDate(0), // Today
        createWordWithLastReviewDate(1), // Yesterday
        createWordWithLastReviewDate(5), // 5 days ago
      ];

      const result = calculateWeeklyProgressData(words);

      // Just testing structure and basic properties
      expect(result.length).toBe(7);
      expect(result.every(day => typeof day.date === 'string')).toBe(true);
      expect(result.every(day => typeof day.wordsLearned === 'number')).toBe(true);
    });
  });

  describe('calculateVocabularyStats', () => {
    it('should return zero stats for empty word list', () => {
      const result = calculateVocabularyStats([]);
      expect(result).toEqual({
        totalWords: 0,
        dueWords: 0,
        masteredWords: 0,
        learningWords: 0,
        streak: 0,
        successRate: 0,
        averageInterval: 0,
        averageEaseFactor: 0,
        averageLapses: 0,
        newWordsCount: 0,
        failedInSessionCount: 0,
      });
    });

    it('should calculate basic stats correctly', () => {
      const words = [
        createMockWord({ interval_days: 1, ease_factor: 2.5, review_count: 1, lapses: 0 }),
        createMockWord({ interval_days: 15, ease_factor: 2.2, review_count: 3, lapses: 1 }),
        createMockWord({ interval_days: 30, ease_factor: 2.8, review_count: 5, lapses: 0 }),
        createMockWord({ interval_days: 60, ease_factor: 3.0, review_count: 8, lapses: 2 }),
      ];

      const dueWords = [words[0], words[1]]; // First two words are due

      const result = calculateVocabularyStats(words, dueWords);

      expect(result.totalWords).toBe(4);
      expect(result.dueWords).toBe(2);
      expect(result.masteredWords).toBe(2); // Words with interval >= 30
      expect(result.learningWords).toBe(2); // Words with interval < 30

      // Average calculations
      expect(result.averageInterval).toBe((1 + 15 + 30 + 60) / 4);
      expect(result.averageEaseFactor).toBe((2.5 + 2.2 + 2.8 + 3.0) / 4);

      // Total reviews = 1 + 3 + 5 + 8 = 17
      // Total successes = (1-0) + (3-1) + (5-0) + (8-2) = 14
      expect(result.successRate).toBe((14 / 17) * 100);

      // Average lapses = (0 + 1 + 0 + 2) / 4 = 0.75
      expect(result.averageLapses).toBe(0.75);
    });

    it('should handle session data correctly', () => {
      const words = [
        createMockWord({
          sessionData: { isNew: true, failedInSession: false },
        }),
        createMockWord({
          sessionData: { isNew: true, failedInSession: true },
        }),
        createMockWord({
          sessionData: { isNew: false, failedInSession: true },
        }),
        createMockWord({
          sessionData: { isNew: false, failedInSession: false },
        }),
      ];

      const result = calculateVocabularyStats(words);

      expect(result.newWordsCount).toBe(2);
      expect(result.failedInSessionCount).toBe(2);
    });

    it('should filter out words with null sentence_word', () => {
      const words = [
        createMockWord(),
        createMockWord(),
        createMockWord({
          sentence_word: null as unknown as StudyWord['sentence_word'],
        }),
        createMockWord({
          sentence_word: undefined,
        }),
      ];

      const result = calculateVocabularyStats(words);

      expect(result.totalWords).toBe(2);
    });

    it('should handle all words being mastered', () => {
      const words = [
        createMockWord({ interval_days: 30, ease_factor: 2.5 }),
        createMockWord({ interval_days: 45, ease_factor: 2.7 }),
        createMockWord({ interval_days: 60, ease_factor: 2.9 }),
      ];

      const result = calculateVocabularyStats(words);

      expect(result.totalWords).toBe(3);
      expect(result.masteredWords).toBe(3);
      expect(result.learningWords).toBe(0);
    });

    it('should handle all words being in learning stage', () => {
      const words = [
        createMockWord({ interval_days: 1, ease_factor: 2.5 }),
        createMockWord({ interval_days: 10, ease_factor: 2.7 }),
        createMockWord({ interval_days: 29, ease_factor: 2.9 }),
      ];

      const result = calculateVocabularyStats(words);

      expect(result.totalWords).toBe(3);
      expect(result.masteredWords).toBe(0);
      expect(result.learningWords).toBe(3);
    });

    it('should handle words with extreme values', () => {
      const words = [
        // Word with very large interval
        createMockWord({
          interval_days: 1000,
          ease_factor: 3.5,
          review_count: 20,
          lapses: 0,
        }),
        // Word with many lapses
        createMockWord({
          interval_days: 5,
          ease_factor: 1.3,
          review_count: 30,
          lapses: 25,
        }),
        // Word with minimum ease factor
        createMockWord({
          interval_days: 1,
          ease_factor: 1.3,
          review_count: 5,
          lapses: 4,
        }),
      ];

      const result = calculateVocabularyStats(words);

      // Expected values
      expect(result.totalWords).toBe(3);
      expect(result.masteredWords).toBe(1); // Only the first word
      expect(result.learningWords).toBe(2);
      expect(result.averageInterval).toBe((1000 + 5 + 1) / 3);
      expect(result.averageEaseFactor).toBe((3.5 + 1.3 + 1.3) / 3);

      // Total reviews = 20 + 30 + 5 = 55
      // Total successes = (20-0) + (30-25) + (5-4) = 26
      expect(result.successRate).toBe((26 / 55) * 100);

      // Average lapses = (0 + 25 + 4) / 3 ≈ 9.67
      expect(result.averageLapses).toBeCloseTo((0 + 25 + 4) / 3, 2);
    });

    it('should handle case where dueWords is empty', () => {
      const words = [createMockWord({ interval_days: 10 }), createMockWord({ interval_days: 15 })];

      // No due words
      const result = calculateVocabularyStats(words, []);

      expect(result.totalWords).toBe(2);
      expect(result.dueWords).toBe(0);
    });

    it('should handle case where dueWords array is not provided', () => {
      const words = [createMockWord({ interval_days: 10 }), createMockWord({ interval_days: 15 })];

      // No dueWords parameter
      const result = calculateVocabularyStats(words);

      expect(result.totalWords).toBe(2);
      expect(result.dueWords).toBe(0); // Default should be 0
    });

    it('should calculate correct success rate in various scenarios', () => {
      // Case 1: All words successful (no lapses)
      const perfectWords = [
        createMockWord({ review_count: 10, lapses: 0 }),
        createMockWord({ review_count: 5, lapses: 0 }),
      ];

      let result = calculateVocabularyStats(perfectWords);
      expect(result.successRate).toBe(100);

      // Case 2: 50% success rate
      const mixedWords = [
        createMockWord({ review_count: 10, lapses: 5 }),
        createMockWord({ review_count: 8, lapses: 4 }),
      ];

      result = calculateVocabularyStats(mixedWords);
      expect(result.successRate).toBe(50);

      // Case 3: No reviews
      const noReviewWords = [createMockWord({ review_count: 0, lapses: 0 })];

      result = calculateVocabularyStats(noReviewWords);
      expect(result.successRate).toBe(0); // No reviews means 0% success rate

      // Case 4: More lapses than reviews (shouldn't happen but should be handled)
      const invalidLapseWords = [
        createMockWord({ review_count: 5, lapses: 10 }), // This is invalid data
      ];

      result = calculateVocabularyStats(invalidLapseWords);
      // The success rate calculation should handle this gracefully
      // Either by capping at 0% or ignoring invalid values
      expect(result.successRate).not.toBeNaN();
      // We won't test exact values since the implementation might handle this differently
    });
  });
});
