// Import the necessary functions
const { calculateNextReview, SRS_CONSTANTS } = require('../../hooks/useSpacedRepetition');

// Add Jest globals
/* global describe, it, expect */

// Create a simple test for ease factor behavior
describe('Ease Factor Behavior', () => {
  it('should respect MAX_EASE_FACTOR when increasing ease factor', () => {
    // Create a word with ease factor at MAX_EASE_FACTOR
    const word = {
      sentence_word_id: '1',
      sentence_word: {
        word_form: 'test',
        english: 'test',
      },
      interval_days: 1,
      ease_factor: SRS_CONSTANTS.MAX_EASE_FACTOR, // Already at max
      next_review_at: new Date().toISOString(),
      review_count: 0,
      lapses: 0,
      stability: 1,
      previous_interval: 0,
    };

    // Calculate next review with success
    const result = calculateNextReview(word, true);

    // The ease factor should not exceed MAX_EASE_FACTOR
    expect(result.newEaseFactor).toBeLessThanOrEqual(SRS_CONSTANTS.MAX_EASE_FACTOR);

    // Print the values for debugging
    console.log(`Original ease factor: ${word.ease_factor}`);
    console.log(`New ease factor: ${result.newEaseFactor}`);
    console.log(`MAX_EASE_FACTOR: ${SRS_CONSTANTS.MAX_EASE_FACTOR}`);
  });

  it('should decrease ease factor on failure', () => {
    // Create a word with ease factor at 2.5
    const word = {
      sentence_word_id: '1',
      sentence_word: {
        word_form: 'test',
        english: 'test',
      },
      interval_days: 1,
      ease_factor: 2.5,
      next_review_at: new Date().toISOString(),
      review_count: 0,
      lapses: 0,
      stability: 1,
      previous_interval: 0,
    };

    // Calculate next review with failure
    const result = calculateNextReview(word, false);

    // The ease factor should decrease
    expect(result.newEaseFactor).toBeLessThan(word.ease_factor);

    // Print the values for debugging
    console.log(`Original ease factor: ${word.ease_factor}`);
    console.log(`New ease factor after failure: ${result.newEaseFactor}`);
  });
});
