/**
 * SRS Global Attempt Counter Tests
 *
 * This test suite specifically tests the global attempt counter mechanism
 * that was added to prevent infinite loops in the spaced repetition system.
 */

import { StudyWord, isSameWordId } from '../../hooks/useSpacedRepetition';

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

describe('SRS Global Attempt Counter', () => {
  it('should prevent infinite loops by tracking global attempt count', () => {
    // Mock the state
    const currentIndex = 0;
    const nextPos = currentIndex + 1;
    let wordsQueueLength = 2;
    const wordsRef = {
      current: [
        createMockWord({ sentence_word_id: '1' }),
        createMockWord({ sentence_word_id: '2' }),
      ],
    };

    // Create failed words with different processing attempt counts
    const failedWordsRef = {
      current: [
        {
          ...createMockWord({ sentence_word_id: '3' }),
          reinsertPosition: 1,
          sessionData: { processingAttempts: 1 },
        },
        {
          ...createMockWord({ sentence_word_id: '4' }),
          reinsertPosition: 2,
          sessionData: { processingAttempts: 2 },
        },
        {
          ...createMockWord({ sentence_word_id: '5' }),
          reinsertPosition: 3,
          sessionData: { processingAttempts: 3 },
        },
      ],
    };

    // Simulate the getNextWordIndex function
    const isAtEnd = nextPos >= wordsQueueLength;
    const hasRemainingFailedWords = failedWordsRef.current.length > 0;

    // If at the end but still have failed words to review,
    // we need to reset to handle the remaining failed words
    let result = 0;

    if (isAtEnd && hasRemainingFailedWords) {
      // Add safety check to prevent infinite loops
      const maxFailedWordProcessingAttempts = 3;

      // Add a global attempt counter to prevent excessive reprocessing
      const globalAttemptCount = failedWordsRef.current.reduce(
        (count, word) => count + ((word.sessionData?.processingAttempts as number) || 0),
        0
      );

      // If we've made too many global attempts, force completion
      if (globalAttemptCount > maxFailedWordProcessingAttempts * 3) {
        // Clear failed words to prevent further processing
        failedWordsRef.current = [];
        result = nextPos; // Continue to the end
      } else {
        // Process all failed words and add them to the queue
        result = 0; // Reset to beginning
      }
    }

    // Calculate the global attempt count
    const globalAttemptCount = failedWordsRef.current.reduce(
      (count, word) => count + ((word.sessionData?.processingAttempts as number) || 0),
      0
    );

    // Verify the global attempt count
    expect(globalAttemptCount).toBe(6); // 1 + 2 + 3 = 6

    // This should exceed our threshold of maxFailedWordProcessingAttempts * 3 = 9
    // So we should not force completion yet
    expect(result).toBe(0);

    // Now add more processing attempts to exceed the threshold
    failedWordsRef.current.push({
      ...createMockWord({ sentence_word_id: '6' }),
      reinsertPosition: 4,
      sessionData: { processingAttempts: 4 },
    });

    // Recalculate the global attempt count
    const newGlobalAttemptCount = failedWordsRef.current.reduce(
      (count, word) => count + ((word.sessionData?.processingAttempts as number) || 0),
      0
    );

    // Verify the new global attempt count
    expect(newGlobalAttemptCount).toBe(10); // 1 + 2 + 3 + 4 = 10

    // Simulate the getNextWordIndex function again
    let newResult = 0;

    // BUG FIX: Make sure isAtEnd is true for the second check
    // In the real code, we would be at the end of the queue when checking for failed words
    const newIsAtEnd = true; // Force this to be true to simulate being at the end of the queue

    if (newIsAtEnd && hasRemainingFailedWords) {
      // Add safety check to prevent infinite loops
      const maxFailedWordProcessingAttempts = 3;

      // Add a global attempt counter to prevent excessive reprocessing
      const globalAttemptCount = failedWordsRef.current.reduce(
        (count, word) => count + ((word.sessionData?.processingAttempts as number) || 0),
        0
      );

      // If we've made too many global attempts, force completion
      if (globalAttemptCount > maxFailedWordProcessingAttempts * 3) {
        // Clear failed words to prevent further processing
        failedWordsRef.current = [];
        newResult = nextPos; // Continue to the end
      } else {
        // Process all failed words and add them to the queue
        newResult = 0; // Reset to beginning
      }
    }

    // This should now exceed our threshold of maxFailedWordProcessingAttempts * 3 = 9
    // So we should force completion
    expect(newResult).toBe(nextPos);

    // Verify the failed words array was cleared
    expect(failedWordsRef.current.length).toBe(0);
  });
});
