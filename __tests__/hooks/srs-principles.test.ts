/**
 * SRS Principles Test Suite
 *
 * This test suite validates that our spaced repetition system (SRS) correctly
 * implements the core scientific principles that make spaced repetition effective.
 *
 * Unlike implementation-focused tests, these tests focus on validating that the
 * algorithm behaves according to established learning science principles, regardless
 * of the specific implementation details.
 *
 * Core principles tested:
 *
 * 1. Exponential interval growth - Intervals should grow exponentially with successful reviews
 * 2. Forgetting curve reset - When a word is forgotten, intervals reset but some memory remains
 * 3. Ease factor personalization - The algorithm adapts to individual word difficulty
 * 4. Spacing effect - Longer previous intervals lead to better retention and larger boosts
 * 5. Lapse penalty - Words forgotten multiple times receive shorter intervals
 * 6. Learning efficiency - New and failed words are requeued optimally for learning
 * 7. Long-term memory formation - Consistent success leads to very long intervals
 *
 * These tests serve as both validation and documentation of the SRS algorithm's
 * behavior, ensuring that future changes maintain adherence to these principles.
 */

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
    /**
     * This test validates that the SRS algorithm implements exponential interval growth,
     * which is a fundamental principle in spaced repetition systems.
     *
     * Exponential growth means that intervals increase by a multiplier rather than
     * by a fixed amount, leading to increasingly longer intervals between reviews.
     *
     * Key principles being tested:
     * 1. Intervals should increase exponentially, not linearly
     * 2. The rate of increase should be influenced by the ease factor
     * 3. The growth pattern should be sustainable for long-term learning
     */
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
    /**
     * This test validates that the SRS algorithm properly implements forgetting curve reset,
     * which is a fundamental principle in spaced repetition systems.
     *
     * When a word is forgotten, the algorithm should reset the interval but retain some
     * memory of the previous learning (not starting completely from scratch).
     *
     * Key principles being tested:
     * 1. Intervals should reset to a small value when a word is forgotten
     * 2. Stability should decrease but not to zero (some memory is retained)
     * 3. Ease factor should decrease to make future reviews more frequent
     */
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

      // Verify recovery after failure
      // Create a word that has just been failed
      let recoveryWord = createMockWord({
        interval_days: 1, // Reset interval
        ease_factor: 2.3, // Reduced ease factor
        stability: 10, // Reduced stability
        review_count: 6,
        lapses: 1, // Has one lapse
      });

      // Simulate successful reviews after the failure
      const successfulReviews = 3;
      const intervals = [recoveryWord.interval_days];

      for (let i = 0; i < successfulReviews; i++) {
        const recoveryResult = calculateNextReview(recoveryWord, true);
        recoveryWord = {
          ...recoveryWord,
          interval_days: recoveryResult.newInterval,
          ease_factor: recoveryResult.newEaseFactor,
          stability: recoveryResult.newStability,
          review_count: recoveryWord.review_count + 1,
        };
        intervals.push(recoveryWord.interval_days);
      }

      // Verify recovery shows exponential growth again
      for (let i = 1; i < intervals.length; i++) {
        expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
      }

      // Verify the word can eventually recover to longer intervals
      expect(intervals[intervals.length - 1]).toBeGreaterThan(1);
    });
  });

  describe('Ease factor personalization', () => {
    /**
     * This test validates that the SRS algorithm properly personalizes the ease factor
     * based on a user's performance history with a word.
     *
     * Key principles being tested:
     * 1. Words that are frequently forgotten should become "harder" (lower ease factor)
     * 2. Words that are consistently remembered should become "easier" (higher ease factor)
     * 3. The ease factor directly impacts interval growth
     *
     * Note: We start with an ease factor of 2.3 (below MAX_EASE_FACTOR of 2.5)
     * to ensure we can test both increase and decrease scenarios.
     */
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

      // Verify that the difficult word's ease factor is significantly lower
      // This ensures the algorithm is making meaningful adjustments
      expect(difficultWord.ease_factor).toBeLessThanOrEqual(easyWord.ease_factor - 0.3);
    });
  });

  describe('Spacing effect', () => {
    /**
     * This test validates that the SRS algorithm properly implements the spacing effect,
     * which is a fundamental principle in spaced repetition systems.
     *
     * The spacing effect states that items reviewed after longer intervals should receive
     * a larger boost to their next interval compared to items reviewed after shorter intervals.
     *
     * Key principles being tested:
     * 1. Words with longer previous intervals should get larger interval boosts
     * 2. The boost should be proportional to the previous interval
     * 3. This effect should be present even when other factors are identical
     */
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

      // Calculate the spacing boost ratio
      const spacingBoost = resultLong.newInterval / resultShort.newInterval;

      // The spacing boost should be significant but not excessive
      // These bounds are based on the algorithm's SPACING_EFFECT_STRENGTH
      expect(spacingBoost).toBeGreaterThan(1.1); // At least 10% longer
      expect(spacingBoost).toBeLessThan(2.0); // But not more than double

      // Test with a range of previous intervals to ensure consistent behavior
      const intervals = [1, 5, 10, 30, 60];
      let lastInterval = 0;

      // Each successive interval should produce a larger next interval
      for (const prevInterval of intervals) {
        const testWord = createMockWord({
          stability: 10,
          interval_days: 10,
          previous_interval: prevInterval,
          ease_factor: 2.5,
        });

        const result = calculateNextReview(testWord, true);

        if (lastInterval > 0) {
          // Each increase in previous interval should result in a larger new interval
          expect(result.newInterval).toBeGreaterThan(lastInterval);
        }

        lastInterval = result.newInterval;
      }
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
    /**
     * This test validates that the SRS algorithm implements efficient learning strategies,
     * particularly for new words and words that have been failed.
     *
     * Efficient learning requires:
     * 1. Multiple exposures to new words within a session
     * 2. Requiring consecutive successes for failed words
     * 3. Optimal spacing of requeued words (not too soon, not too late)
     *
     * These principles are based on research showing that:
     * - New information requires multiple exposures to form initial memory
     * - Failed items need successful retrieval to strengthen memory
     * - Optimal spacing improves long-term retention
     */
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

    /**
     * This test validates that the SRS algorithm positions requeued words optimally
     * for effective learning, following principles of interleaving and spacing.
     *
     * Optimal positioning means:
     * 1. Failed words should not be shown immediately (too soon)
     * 2. Failed words should not be delayed too long (forgetting)
     * 3. New words should be spaced appropriately for initial learning
     *
     * These principles ensure that:
     * - Learning is efficient (not wasting time on too-frequent reviews)
     * - Memory formation is optimized (spacing effect)
     * - Difficult words receive appropriate attention
     */
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
    /**
     * This test validates that the SRS algorithm effectively promotes long-term memory formation,
     * which is the ultimate goal of any spaced repetition system.
     *
     * Long-term memory formation requires:
     * 1. Gradually increasing intervals between reviews
     * 2. Eventually reaching very long intervals (months/years)
     * 3. Stable ease factors for well-learned items
     *
     * These principles ensure that:
     * - Well-learned words are not reviewed unnecessarily (efficiency)
     * - The system scales to support years of learning (sustainability)
     * - The ultimate goal of permanent retention is achieved
     */
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
