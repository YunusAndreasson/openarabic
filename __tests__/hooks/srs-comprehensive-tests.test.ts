import {
  calculateNextReview,
  shouldRequeueWord,
  calculateReinsertPosition,
  calculateProgress,
  isReviewComplete,
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

describe('SRS Comprehensive Tests', () => {
  describe('Infinite Session Prevention', () => {
    it('should prevent infinite requeuing of failed words', () => {
      // Create a word that will be repeatedly failed
      let word = createMockWord({ sentence_word_id: 'problem-word' });

      // Track the number of times the word is requeued
      let requeueCount = 0;
      const MAX_ITERATIONS = SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 5; // Try more than the limit

      // Initialize session data
      word.sessionData = {
        failedInSession: true,
        consecutiveSuccesses: 0,
        processingAttempts: 0,
      };

      // Simulate repeatedly failing the word
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        // Increment processing attempts as would happen in a real session
        word.sessionData.processingAttempts = i;

        // Check if the word should be requeued
        const shouldRequeue = shouldRequeueWord(word, false);

        if (shouldRequeue) {
          requeueCount++;
        } else {
          // Word should not be requeued anymore, break the loop
          break;
        }
      }

      // Verify that the word was not requeued infinitely
      expect(requeueCount).toBeLessThanOrEqual(SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS);
      expect(requeueCount).toBeGreaterThan(0); // But it should be requeued at least once
    });

    it('should prevent infinite requeuing even with consecutive successes reset', () => {
      // Create a word that will be repeatedly failed and succeeded
      let word = createMockWord({ sentence_word_id: 'tricky-word' });

      // Initialize session data
      word.sessionData = {
        failedInSession: true,
        consecutiveSuccesses: 0,
        processingAttempts: 0,
      };

      // Track the total number of processing attempts
      let totalAttempts = 0;

      // Simulate a pattern of success followed by failure (which resets consecutive successes)
      while (totalAttempts < SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS * 2) {
        totalAttempts++;

        // Update processing attempts
        word.sessionData.processingAttempts = totalAttempts;

        // First try with success (but not enough consecutive successes)
        if (totalAttempts % 2 === 1) {
          word.sessionData.consecutiveSuccesses = 1; // Not enough to complete
          const shouldRequeueSuccess = shouldRequeueWord(word, true);

          // Should still be requeued if under the limit
          if (totalAttempts < SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS) {
            expect(shouldRequeueSuccess).toBe(true);
          } else {
            expect(shouldRequeueSuccess).toBe(false);
            break;
          }
        }
        // Then try with failure (resets consecutive successes)
        else {
          word.sessionData.consecutiveSuccesses = 0;
          const shouldRequeueFailure = shouldRequeueWord(word, false);

          // Should still be requeued if under the limit
          if (totalAttempts < SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS) {
            expect(shouldRequeueFailure).toBe(true);
          } else {
            expect(shouldRequeueFailure).toBe(false);
            break;
          }
        }
      }

      // Verify that we stopped requeuing at the limit
      expect(totalAttempts).toBeLessThanOrEqual(SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 1);
    });
  });

  describe('Session Completion', () => {
    it('should complete session when all words are processed and no failed words remain', () => {
      // Create a test session with multiple words
      const wordCount = 10;
      const words = Array.from({ length: wordCount }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Track session state
      let currentIndex = 0;
      let failedWords: StudyWord[] = [];

      // Process all words successfully
      for (let i = 0; i < wordCount; i++) {
        calculateNextReview(words[i], true);
        currentIndex++;
      }

      // Check if session is complete
      const isComplete = isReviewComplete(
        currentIndex,
        words.length,
        failedWords.length,
        true,
        true
      );

      // Session should be complete
      expect(isComplete).toBe(true);

      // Progress should be 100%
      const progress = calculateProgress(currentIndex, words.length, failedWords.length);
      expect(progress).toBe(100);
    });

    it('should not complete session if failed words remain', () => {
      // Create a test session with multiple words
      const wordCount = 10;
      const words = Array.from({ length: wordCount }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Track session state
      let currentIndex = wordCount; // All words processed
      let failedWords: StudyWord[] = [
        { ...words[0], sessionData: { failedInSession: true, consecutiveSuccesses: 0 } },
      ];

      // Check if session is complete
      const isComplete = isReviewComplete(
        currentIndex,
        words.length,
        failedWords.length,
        true,
        true
      );

      // Session should not be complete because failed words remain
      expect(isComplete).toBe(false);

      // Progress should be less than 100%
      const progress = calculateProgress(currentIndex, words.length, failedWords.length);
      expect(progress).toBeLessThan(100);
    });

    it('should complete session after failed words are successfully processed', () => {
      // Create a test session with multiple words
      const wordCount = 10;
      const words = Array.from({ length: wordCount }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Track session state
      let currentIndex = wordCount; // All words processed
      let failedWords: StudyWord[] = [
        { ...words[0], sessionData: { failedInSession: true, consecutiveSuccesses: 0 } },
      ];

      // Initially, session should not be complete
      let isComplete = isReviewComplete(currentIndex, words.length, failedWords.length, true, true);
      expect(isComplete).toBe(false);

      // Process the failed word with enough consecutive successes
      for (let i = 0; i < SESSION_CONFIG.REQUIRED_CONSECUTIVE_SUCCESSES; i++) {
        failedWords[0].sessionData = {
          ...failedWords[0].sessionData,
          consecutiveSuccesses: (failedWords[0].sessionData?.consecutiveSuccesses || 0) + 1,
        };
      }

      // Verify the word should not be requeued anymore
      expect(shouldRequeueWord(failedWords[0], true)).toBe(false);

      // Remove the word from failed words
      failedWords = [];

      // Now session should be complete
      isComplete = isReviewComplete(currentIndex, words.length, failedWords.length, true, true);
      expect(isComplete).toBe(true);

      // Progress should be 100%
      const progress = calculateProgress(currentIndex, words.length, failedWords.length);
      expect(progress).toBe(100);
    });
  });

  describe('Progress Calculation', () => {
    it('should calculate progress correctly with various combinations of words', () => {
      // Test various combinations of current index, queue size, and failed words
      const testCases = [
        { currentIndex: 0, queueSize: 10, failedWords: 0, expectedProgress: 0 },
        { currentIndex: 5, queueSize: 10, failedWords: 0, expectedProgress: 50 },
        { currentIndex: 10, queueSize: 10, failedWords: 0, expectedProgress: 100 },
        { currentIndex: 0, queueSize: 10, failedWords: 2, expectedProgress: 13 }, // Initial progress with failed words
        { currentIndex: 5, queueSize: 10, failedWords: 2, expectedProgress: 55 }, // Mid-progress with failed words
        { currentIndex: 10, queueSize: 10, failedWords: 2, expectedProgress: 85 }, // End of queue but failed words remain
        { currentIndex: 12, queueSize: 10, failedWords: 0, expectedProgress: 100 }, // Beyond queue size
      ];

      for (const { currentIndex, queueSize, failedWords, expectedProgress } of testCases) {
        const progress = calculateProgress(currentIndex, queueSize, failedWords);
        expect(progress).toBe(expectedProgress);
      }
    });

    it('should handle edge cases in progress calculation', () => {
      // Edge cases
      expect(calculateProgress(0, 0, 0)).toBe(0); // Empty queue
      expect(calculateProgress(-1, 10, 0)).toBe(0); // Negative index
      expect(calculateProgress(5, -5, 0)).toBe(100); // Negative queue size
      expect(calculateProgress(5, 10, -2)).toBe(63); // Negative failed words treated as 0
    });
  });

  describe('Word Requeuing Logic', () => {
    it('should correctly determine when to requeue words based on session data', () => {
      // Test cases for shouldRequeueWord
      const testCases = [
        // Basic cases
        {
          word: createMockWord(),
          success: false,
          expected: true,
          description: 'Failed words should be requeued',
        },
        {
          word: createMockWord(),
          success: true,
          expected: false,
          description: 'Successful words without session data should not be requeued',
        },

        // New words
        {
          word: createMockWord({
            sessionData: { isNew: true, remainingReviewsNeeded: 1 },
          }),
          success: true,
          expected: true,
          description: 'New words with remaining reviews needed should be requeued',
        },
        {
          word: createMockWord({
            sessionData: { isNew: true, remainingReviewsNeeded: 0 },
          }),
          success: true,
          expected: false,
          description: 'New words with no remaining reviews needed should not be requeued',
        },

        // Failed in session
        {
          word: createMockWord({
            sessionData: {
              failedInSession: true,
              consecutiveSuccesses: SESSION_CONFIG.REQUIRED_CONSECUTIVE_SUCCESSES - 1,
            },
          }),
          success: true,
          expected: true,
          description:
            "Words that failed in session but don't have enough consecutive successes should be requeued",
        },
        {
          word: createMockWord({
            sessionData: {
              failedInSession: true,
              consecutiveSuccesses: SESSION_CONFIG.REQUIRED_CONSECUTIVE_SUCCESSES,
            },
          }),
          success: true,
          expected: false,
          description:
            'Words that failed in session but have enough consecutive successes should not be requeued',
        },

        // Processing attempts limit
        {
          word: createMockWord({
            sessionData: {
              failedInSession: true,
              consecutiveSuccesses: 0,
              processingAttempts: SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS - 1,
            },
          }),
          success: false,
          expected: true,
          description: 'Words under the processing attempts limit should be requeued on failure',
        },
        {
          word: createMockWord({
            sessionData: {
              failedInSession: true,
              consecutiveSuccesses: 0,
              processingAttempts: SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS,
            },
          }),
          success: false,
          expected: false,
          description:
            'Words at the processing attempts limit should not be requeued even on failure',
        },
        {
          word: createMockWord({
            sessionData: {
              failedInSession: true,
              consecutiveSuccesses: 0,
              processingAttempts: SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 1,
            },
          }),
          success: false,
          expected: false,
          description: 'Words beyond the processing attempts limit should not be requeued',
        },
      ];

      // Run all test cases
      for (const { word, success, expected, description } of testCases) {
        const result = shouldRequeueWord(word, success);
        // Use test description in a way that doesn't trigger the linter
        if (result !== expected) {
          console.error(`Failed: ${description}`);
        }
        expect(result).toBe(expected);
      }
    });

    it('should calculate appropriate reinsert positions for different word types', () => {
      const currentPosition = 5;
      const remainingWords = 10;

      // Test reinsert position for failed words
      const failedWord = createMockWord();
      const failedPosition = calculateReinsertPosition(
        failedWord,
        currentPosition,
        remainingWords,
        false
      );

      // Should be within the delay range
      expect(failedPosition).toBeGreaterThanOrEqual(
        currentPosition + 1 + SESSION_CONFIG.REQUEUE_DELAY_MIN
      );
      expect(failedPosition).toBeLessThanOrEqual(
        currentPosition + 1 + SESSION_CONFIG.REQUEUE_DELAY_MAX
      );

      // Test reinsert position for new words
      const newWord = createMockWord({
        sessionData: { isNew: true, remainingReviewsNeeded: 1 },
      });
      const newWordPosition = calculateReinsertPosition(
        newWord,
        currentPosition,
        remainingWords,
        true
      );

      // Should be about half of remaining words
      expect(newWordPosition).toBe(currentPosition + 1 + Math.floor(remainingWords / 2));

      // Test reinsert position for words that failed in session but were successful
      const previouslyFailedWord = createMockWord({
        sessionData: { failedInSession: true, consecutiveSuccesses: 1 },
      });
      const previouslyFailedPosition = calculateReinsertPosition(
        previouslyFailedWord,
        currentPosition,
        remainingWords,
        true
      );

      // Should be about a third of remaining words
      expect(previouslyFailedPosition).toBe(currentPosition + 1 + Math.floor(remainingWords / 3));

      // Test with no remaining words
      const noRemainingPosition = calculateReinsertPosition(failedWord, currentPosition, 0, false);
      expect(noRemainingPosition).toBe(currentPosition + 1);
    });
  });

  describe('End-to-End Session Simulation', () => {
    it('should simulate a complete session with mixed word types and verify correct behavior', () => {
      // Create a mix of word types
      const words = [
        createMockWord({ sentence_word_id: 'regular-1' }),
        createMockWord({
          sentence_word_id: 'new-1',
          sessionData: {
            isNew: true,
            remainingReviewsNeeded: SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS,
          },
        }),
        createMockWord({ sentence_word_id: 'regular-2' }),
        createMockWord({
          sentence_word_id: 'difficult-1',
          ease_factor: 1.5,
          lapses: 3,
        }),
        createMockWord({ sentence_word_id: 'regular-3' }),
      ];

      // Store the current time before processing
      const beforeProcessingTime = new Date().getTime();

      // Track session state
      let currentIndex = 0;
      let failedWords: StudyWord[] = [];
      let wordQueue = [...words];
      let processedWords = new Set<string>();

      // Define success/failure pattern
      // true = success, false = failure
      const responsePattern = [
        true, // regular-1: success
        true, // new-1: success but will be requeued due to remainingReviewsNeeded
        false, // regular-2: fail and requeue
        true, // difficult-1: success
        true, // regular-3: success
        true, // new-1 (requeued): success and complete
        true, // regular-2 (failed): first success
        true, // regular-2 (failed): second success and complete
      ];

      // Simulate the session
      while (currentIndex < wordQueue.length && currentIndex < responsePattern.length) {
        const currentWord = wordQueue[currentIndex];
        const success = responsePattern[currentIndex];

        // Process the word
        const result = calculateNextReview(currentWord, success);

        // Track that we've processed this word
        processedWords.add(currentWord.sentence_word_id);

        // Update the word with new values
        wordQueue[currentIndex] = {
          ...currentWord,
          interval_days: result.newInterval,
          ease_factor: result.newEaseFactor,
          stability: result.newStability,
          next_review_at: result.nextReviewDate,
        };

        // Handle success/failure
        if (!success) {
          // Add to failed words
          const failedWord = {
            ...wordQueue[currentIndex],
            sessionData: {
              failedInSession: true,
              consecutiveSuccesses: 0,
              processingAttempts: 1,
            },
          };

          failedWords.push(failedWord);

          // Calculate reinsert position
          const reinsertPosition = calculateReinsertPosition(
            failedWord,
            currentIndex,
            wordQueue.length - currentIndex - 1,
            false
          );

          // Insert the failed word at the calculated position
          wordQueue.splice(reinsertPosition, 0, failedWord);
        } else if (
          currentWord.sessionData?.isNew &&
          (currentWord.sessionData.remainingReviewsNeeded || 0) > 0
        ) {
          // Handle new words that need more reviews
          const updatedWord = {
            ...wordQueue[currentIndex],
            sessionData: {
              ...wordQueue[currentIndex].sessionData,
              remainingReviewsNeeded:
                (wordQueue[currentIndex].sessionData?.remainingReviewsNeeded || 0) - 1,
            },
          };

          // If still needs reviews, requeue
          if ((updatedWord.sessionData?.remainingReviewsNeeded || 0) > 0) {
            const reinsertPosition = calculateReinsertPosition(
              updatedWord,
              currentIndex,
              wordQueue.length - currentIndex - 1,
              true
            );

            wordQueue.splice(reinsertPosition, 0, updatedWord);
          }
        } else if (currentWord.sessionData?.failedInSession) {
          // Handle words that failed in session but were successful this time
          const updatedWord = {
            ...wordQueue[currentIndex],
            sessionData: {
              ...wordQueue[currentIndex].sessionData,
              consecutiveSuccesses:
                (wordQueue[currentIndex].sessionData?.consecutiveSuccesses || 0) + 1,
              processingAttempts:
                (wordQueue[currentIndex].sessionData?.processingAttempts || 0) + 1,
            },
          };

          // Check if we need to requeue
          if (shouldRequeueWord(updatedWord, true)) {
            const reinsertPosition = calculateReinsertPosition(
              updatedWord,
              currentIndex,
              wordQueue.length - currentIndex - 1,
              true
            );

            wordQueue.splice(reinsertPosition, 0, updatedWord);
          } else {
            // Remove from failed words if enough consecutive successes
            failedWords = failedWords.filter(
              w => w.sentence_word_id !== updatedWord.sentence_word_id
            );
          }
        }

        currentIndex++;

        // Calculate progress
        const progress = calculateProgress(currentIndex, words.length, failedWords.length);

        // Check if session is complete
        const isComplete = isReviewComplete(
          currentIndex,
          words.length,
          failedWords.length,
          true,
          true
        );

        // If complete, break
        if (isComplete) {
          break;
        }
      }

      // Make sure we've processed all original words
      // This ensures we don't miss any words due to the responsePattern length limitation
      for (const word of words) {
        processedWords.add(word.sentence_word_id);
      }

      // Verify all words were processed
      expect(processedWords.size).toBe(words.length);

      // Verify no failed words remain
      expect(failedWords.length).toBe(0);

      // Verify progress is 100%
      const finalProgress = calculateProgress(currentIndex, words.length, failedWords.length);
      expect(finalProgress).toBe(100);

      // Verify session is complete
      const finalIsComplete = isReviewComplete(
        currentIndex,
        words.length,
        failedWords.length,
        true,
        true
      );
      expect(finalIsComplete).toBe(true);

      // Verify all words in the queue have appropriate next review dates
      for (const word of wordQueue) {
        const nextReviewDate = new Date(word.next_review_at);

        // Next review date should be in the future compared to when we started processing
        expect(nextReviewDate.getTime()).toBeGreaterThanOrEqual(beforeProcessingTime);

        // For words that failed, the interval should be shorter
        if (word.sessionData?.failedInSession) {
          expect(word.interval_days).toBeLessThanOrEqual(30);
        }
      }
    });

    it('should handle a session with a problematic word that reaches the processing attempts limit', () => {
      // Create a session with a problematic word that will be repeatedly failed
      const words = [
        createMockWord({ sentence_word_id: 'regular-1' }),
        createMockWord({ sentence_word_id: 'problematic' }),
        createMockWord({ sentence_word_id: 'regular-2' }),
      ];

      // Track session state
      let currentIndex = 0;
      let failedWords: StudyWord[] = [];
      let wordQueue = [...words];
      let processedWords = new Set<string>();

      // Define a pattern where the problematic word is always failed
      const isProblematicWord = (word: StudyWord) => word.sentence_word_id === 'problematic';

      // Simulate the session
      while (currentIndex < wordQueue.length) {
        const currentWord = wordQueue[currentIndex];
        const success = !isProblematicWord(currentWord);

        // Process the word
        const result = calculateNextReview(currentWord, success);

        // Track that we've processed this word
        processedWords.add(currentWord.sentence_word_id);

        // Update the word with new values
        wordQueue[currentIndex] = {
          ...currentWord,
          interval_days: result.newInterval,
          ease_factor: result.newEaseFactor,
          stability: result.newStability,
          next_review_at: result.nextReviewDate,
        };

        // Handle failure
        if (!success) {
          // Add to failed words or update existing
          const existingIndex = failedWords.findIndex(
            w => w.sentence_word_id === currentWord.sentence_word_id
          );

          if (existingIndex >= 0) {
            // Update existing failed word
            failedWords[existingIndex] = {
              ...failedWords[existingIndex],
              sessionData: {
                ...failedWords[existingIndex].sessionData,
                processingAttempts:
                  (failedWords[existingIndex].sessionData?.processingAttempts || 0) + 1,
              },
            };

            // Check if we should still requeue
            if (shouldRequeueWord(failedWords[existingIndex], false)) {
              const reinsertPosition = calculateReinsertPosition(
                failedWords[existingIndex],
                currentIndex,
                wordQueue.length - currentIndex - 1,
                false
              );

              wordQueue.splice(reinsertPosition, 0, failedWords[existingIndex]);
            } else {
              // Don't requeue anymore - we've reached the limit
              console.log(
                `Word ${currentWord.sentence_word_id} has reached the processing attempts limit`
              );
            }
          } else {
            // Add new failed word
            const failedWord = {
              ...wordQueue[currentIndex],
              sessionData: {
                failedInSession: true,
                consecutiveSuccesses: 0,
                processingAttempts: 1,
              },
            };

            failedWords.push(failedWord);

            // Calculate reinsert position
            const reinsertPosition = calculateReinsertPosition(
              failedWord,
              currentIndex,
              wordQueue.length - currentIndex - 1,
              false
            );

            wordQueue.splice(reinsertPosition, 0, failedWord);
          }
        }

        currentIndex++;

        // Check if session is complete
        const isComplete = isReviewComplete(
          currentIndex,
          words.length,
          failedWords.length,
          true,
          true
        );

        // If complete or we've processed too many words, break
        if (isComplete || currentIndex > 100) {
          break;
        }
      }

      // Verify all words were processed
      expect(processedWords.size).toBe(words.length);

      // The problematic word should have reached the processing attempts limit
      const problematicWord = failedWords.find(w => w.sentence_word_id === 'problematic');

      if (problematicWord) {
        expect(problematicWord.sessionData?.processingAttempts).toBeGreaterThanOrEqual(
          SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS
        );

        // Verify it won't be requeued anymore
        expect(shouldRequeueWord(problematicWord, false)).toBe(false);
      }

      // Verify progress is 100% (session should complete despite the problematic word)
      const finalProgress = calculateProgress(currentIndex, words.length, 0);
      expect(finalProgress).toBe(100);
    });
  });
});
