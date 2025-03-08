import {
  calculateNextReview,
  shouldRequeueWord,
  calculateReinsertPosition,
  SRS_CONSTANTS,
  SESSION_CONFIG,
  StudyWord,
} from '../../hooks/useSpacedRepetition';

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

// Tests specifically for validating SRS principles
describe('Spaced Repetition System Principles', () => {
  describe('Exponential interval growth', () => {
    it('should increase intervals exponentially with subsequent successful reviews', () => {
      // Create a word with baseline values
      let word = createMockWord({
        interval_days: 1,
        ease_factor: 2.5,
        stability: 1,
        review_count: 0,
        lapses: 0,
      });

      // Track intervals after each successful review
      const intervals = [word.interval_days];

      // Simulate 5 successful reviews
      for (let i = 0; i < 5; i++) {
        const result = calculateNextReview(word, true);

        // Update the word for next review
        word = {
          ...word,
          interval_days: result.newInterval,
          ease_factor: result.newEaseFactor,
          stability: result.newStability,
          review_count: word.review_count + 1,
        };

        intervals.push(word.interval_days);
      }

      // Verify intervals follow exponential growth pattern
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
      }

      // First few intervals should show distinct pattern of growth
      // This is what distinguishes SRS from fixed-interval systems
      expect(intervals[2] - intervals[1]).toBeGreaterThan(intervals[1] - intervals[0]);

      // Final interval should be significantly larger than just linear growth
      // In a linear system with +1 each time, we'd end at 6
      // In our SRS, we should be well beyond that
      expect(intervals[intervals.length - 1]).toBeGreaterThan(6);
    });
  });

  describe('Forgetting curve reset', () => {
    it('should reset intervals when a word is forgotten', () => {
      // Start with a word that has been successfully reviewed many times
      const word = createMockWord({
        interval_days: 30, // A substantial interval
        ease_factor: 2.5,
        stability: 30,
        review_count: 5,
        lapses: 0,
      });

      // Simulate a failure
      const result = calculateNextReview(word, false);

      // Verify the interval is reset to 1
      expect(result.newInterval).toBe(1);

      // Verify stability is reduced but not to zero
      expect(result.newStability).toBeLessThan(word.stability);
      expect(result.newStability).toBeGreaterThan(0);

      // Verify ease factor decreases
      expect(result.newEaseFactor).toBeLessThan(word.ease_factor);
    });
  });

  describe('Ease factor personalization', () => {
    it('should adjust ease factor based on performance history', () => {
      // Start with a new word with ease factor below the maximum
      // The default MAX_EASE_FACTOR is 2.5, so we need to start lower
      let word = createMockWord({
        interval_days: 1,
        ease_factor: 2.3, // Starting below MAX_EASE_FACTOR
        stability: 1,
        review_count: 0,
        lapses: 0,
      });

      // Simulate a word that keeps being forgotten
      const difficultWordSequence = [false, true, false, true, false];

      let difficultWord = { ...word };
      for (const success of difficultWordSequence) {
        const result = calculateNextReview(difficultWord, success);
        difficultWord = {
          ...difficultWord,
          interval_days: result.newInterval,
          ease_factor: result.newEaseFactor,
          stability: result.newStability,
          lapses: success ? difficultWord.lapses : difficultWord.lapses + 1,
          review_count: difficultWord.review_count + 1,
        };
      }

      // Simulate a word that is easily remembered
      const easyWordSequence = [true, true, true, true, true];

      let easyWord = { ...word };
      for (const success of easyWordSequence) {
        const result = calculateNextReview(easyWord, success);
        easyWord = {
          ...easyWord,
          interval_days: result.newInterval,
          ease_factor: result.newEaseFactor,
          stability: result.newStability,
          review_count: easyWord.review_count + 1,
        };
      }

      // The difficult word should have a lower ease factor
      expect(difficultWord.ease_factor).toBeLessThan(word.ease_factor);

      // For the easy word, we need to check if it's at MAX_EASE_FACTOR
      if (word.ease_factor < SRS_CONSTANTS.MAX_EASE_FACTOR) {
        // If starting below MAX_EASE_FACTOR, it should increase
        expect(easyWord.ease_factor).toBeGreaterThan(word.ease_factor);
      } else {
        // If starting at MAX_EASE_FACTOR, it should stay there
        expect(easyWord.ease_factor).toEqual(SRS_CONSTANTS.MAX_EASE_FACTOR);
      }

      // The intervals should reflect the difference in ease
      expect(difficultWord.interval_days).toBeLessThan(easyWord.interval_days);
    });
  });

  describe('Spacing effect', () => {
    it('should apply the spacing effect for longer previous intervals', () => {
      // Create two words with identical properties except previous_interval
      const wordWithShortPrevious = createMockWord({
        stability: 10,
        interval_days: 10,
        previous_interval: 1,
        ease_factor: 2.5,
      });

      const wordWithLongPrevious = createMockWord({
        stability: 10,
        interval_days: 10,
        previous_interval: 20, // Much longer previous interval
        ease_factor: 2.5,
      });

      // Get next review data for both
      const resultShort = calculateNextReview(wordWithShortPrevious, true);
      const resultLong = calculateNextReview(wordWithLongPrevious, true);

      // The word with longer previous interval should get a larger interval boost
      expect(resultLong.newInterval).toBeGreaterThan(resultShort.newInterval);
    });
  });

  describe('Lapse penalty', () => {
    it('should apply recovery penalty for frequently lapsed words', () => {
      // Create two identical words except for lapses count
      const wordWithFewLapses = createMockWord({
        stability: 10,
        interval_days: 10,
        lapses: 1, // Below the threshold that applies penalty
        ease_factor: 2.5,
      });

      const wordWithManyLapses = createMockWord({
        stability: 10,
        interval_days: 10,
        lapses: 5, // Above the threshold that applies penalty
        ease_factor: 2.5,
      });

      // Get next review data for both
      const resultFewLapses = calculateNextReview(wordWithFewLapses, true);
      const resultManyLapses = calculateNextReview(wordWithManyLapses, true);

      // The word with more lapses should get a shorter interval due to the penalty
      expect(resultManyLapses.newInterval).toBeLessThan(resultFewLapses.newInterval);
    });
  });

  describe('Learning efficiency', () => {
    it('should optimize learning through appropriate requeuing strategies', () => {
      // New words should be shown multiple times in a session
      const newWord = createMockWord({
        review_count: 1,
        sessionData: {
          isNew: true,
          remainingReviewsNeeded: SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS,
        },
      });

      // Should requeue even if answered correctly the first time
      expect(shouldRequeueWord(newWord, true)).toBe(true);

      // Failed words should require consecutive successes
      const failedWord = createMockWord({
        sessionData: {
          failedInSession: true,
          consecutiveSuccesses: 0,
        },
      });

      // First success after failure
      expect(shouldRequeueWord(failedWord, true)).toBe(true);

      // After required consecutive successes, should stop requeuing
      const successfulWord = createMockWord({
        sessionData: {
          failedInSession: true,
          consecutiveSuccesses: SESSION_CONFIG.REQUIRED_CONSECUTIVE_SUCCESSES,
        },
      });

      expect(shouldRequeueWord(successfulWord, true)).toBe(false);
    });

    it('should position requeued words optimally for learning', () => {
      // The algorithm should ensure we don't review the same word
      // immediately after failing it, but also not too far away

      // For a 10-word queue at position 5
      const currentPosition = 5;
      const remainingWords = 4; // 10 total - (5+1) current

      // New words should be positioned about halfway through the remaining queue
      const newWord = createMockWord({
        sessionData: {
          isNew: true,
          remainingReviewsNeeded: 1,
        },
      });

      const newWordPosition = calculateReinsertPosition(
        newWord,
        currentPosition,
        remainingWords,
        true // success
      );

      // Should be positioned roughly halfway through remaining words
      expect(newWordPosition).toBeGreaterThan(currentPosition + 1); // Not immediate
      expect(newWordPosition).toBeLessThanOrEqual(currentPosition + 1 + remainingWords); // Within queue

      // Failed words should come back after a few other words
      // This follows principles of interleaving for better learning
      const failedWord = createMockWord();

      const failedWordPosition = calculateReinsertPosition(
        failedWord,
        currentPosition,
        remainingWords,
        false // failure
      );

      // Should be a few words later but within queue
      expect(failedWordPosition).toBeGreaterThan(currentPosition + 1); // Not immediate
      expect(failedWordPosition).toBeLessThanOrEqual(currentPosition + 1 + remainingWords); // Within queue
      expect(failedWordPosition).toBeGreaterThanOrEqual(
        currentPosition + SESSION_CONFIG.REQUEUE_DELAY_MIN
      );
      expect(failedWordPosition).toBeLessThanOrEqual(
        currentPosition + SESSION_CONFIG.REQUEUE_DELAY_MAX + 1
      );
    });
  });

  describe('Long-term memory formation', () => {
    it('should lead to long-term intervals with consistent success', () => {
      let word = createMockWord();

      // Simulate a long sequence of successful reviews (10 reviews)
      for (let i = 0; i < 10; i++) {
        const result = calculateNextReview(word, true);
        word = {
          ...word,
          interval_days: result.newInterval,
          ease_factor: result.newEaseFactor,
          stability: result.newStability,
          previous_interval: word.interval_days,
          review_count: word.review_count + 1,
        };
      }

      // After 10 successful reviews, intervals should be months long
      // This is key for long-term memory formation
      expect(word.interval_days).toBeGreaterThan(30); // At least a month
    });
  });
});
