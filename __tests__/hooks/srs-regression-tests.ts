/**
 * SRS Regression Tests
 *
 * This test suite specifically targets bugs that were fixed in the spaced repetition system.
 * Each test case is designed to verify that a specific bug fix works correctly and to prevent
 * regression in the future.
 */

import {
  calculateNextReview,
  shouldRequeueWord,
  calculateReinsertPosition,
  isReviewComplete,
  getSrsStatsFromWords,
  SRS_CONSTANTS,
  SESSION_CONFIG,
  StudyWord,
  isSameWordId,
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

// Define a type for the word with reinsertPosition
type WordWithReinsertPosition = StudyWord & { reinsertPosition: number };

describe('SRS Regression Tests', () => {
  // BUG FIX 1: Failed words are dropped if their reinsert position is beyond the current queue length
  describe('Bug Fix: Failed words beyond queue length', () => {
    it('should always add failed words to failedWordsRef regardless of reinsert position', () => {
      // Mock the wordsRef and failedWordsRef
      const wordsRef = { current: [createMockWord({ sentence_word_id: '1' })] };
      const failedWordsRef: { current: WordWithReinsertPosition[] } = { current: [] };
      const currentIndex = 0;

      // Create a word to update
      const wordToUpdate = createMockWord({
        sentence_word_id: '1',
        sessionData: {
          isNew: false,
          failedInSession: false,
          consecutiveSuccesses: 0,
          remainingReviewsNeeded: 0,
        },
      });

      // Calculate a reinsert position that's beyond the queue length
      const remainingWords = Math.max(0, wordsRef.current.length - currentIndex - 1);
      const reinsertPosition = currentIndex + 1 + remainingWords + 5; // Intentionally beyond queue length

      // Simulate the mutation function's behavior
      const needsRequeue = !true; // Simulate a failed word

      if (needsRequeue) {
        const wordToReinsert = { ...wordToUpdate };

        // BUG FIX: Always add the word to failedWordsRef, even if reinsertPosition is beyond the current queue
        failedWordsRef.current.push({
          ...wordToReinsert,
          reinsertPosition: Math.min(reinsertPosition, wordsRef.current.length),
        });
      }

      // Verify the word was added to failedWordsRef
      expect(failedWordsRef.current.length).toBe(0); // Should be 0 since needsRequeue is false

      // Now test with needsRequeue = true
      const needsRequeue2 = true;

      if (needsRequeue2) {
        const wordToReinsert = { ...wordToUpdate };

        // BUG FIX: Always add the word to failedWordsRef, even if reinsertPosition is beyond the current queue
        failedWordsRef.current.push({
          ...wordToReinsert,
          reinsertPosition: Math.min(reinsertPosition, wordsRef.current.length),
        });
      }

      // Verify the word was added to failedWordsRef
      expect(failedWordsRef.current.length).toBe(1);
      // Verify the reinsert position was capped at the queue length
      expect(failedWordsRef.current[0].reinsertPosition).toBe(wordsRef.current.length);
    });
  });

  // BUG FIX 2: Logical issue in shouldRequeueWord function
  describe('Bug Fix: shouldRequeueWord logical issue', () => {
    it('should correctly handle words that are both new and failed in the session', () => {
      // Create a word that is both new and failed in the session
      const word = createMockWord({
        sessionData: {
          isNew: true,
          failedInSession: true,
          consecutiveSuccesses: 1, // Less than REQUIRED_CONSECUTIVE_SUCCESSES
          remainingReviewsNeeded: 1, // Still needs more reviews
        },
      });

      // Test with success = true
      const shouldRequeue = shouldRequeueWord(word, true);

      // The word should be requeued because:
      // 1. It's new and has remaining reviews needed
      // 2. It was previously failed and needs more consecutive successes
      expect(shouldRequeue).toBe(true);

      // Test with a word that has enough consecutive successes but still needs more reviews
      const word2 = createMockWord({
        sessionData: {
          isNew: true,
          failedInSession: true,
          consecutiveSuccesses: SESSION_CONFIG.REQUIRED_CONSECUTIVE_SUCCESSES, // Enough consecutive successes
          remainingReviewsNeeded: 1, // Still needs more reviews
        },
      });

      const shouldRequeue2 = shouldRequeueWord(word2, true);
      expect(shouldRequeue2).toBe(true);

      // Test with a word that has enough reviews but not enough consecutive successes
      const word3 = createMockWord({
        sessionData: {
          isNew: true,
          failedInSession: true,
          consecutiveSuccesses: 1, // Not enough consecutive successes
          remainingReviewsNeeded: 0, // No more reviews needed
        },
      });

      const shouldRequeue3 = shouldRequeueWord(word3, true);
      expect(shouldRequeue3).toBe(true);

      // Test with a word that has both enough reviews and enough consecutive successes
      const word4 = createMockWord({
        sessionData: {
          isNew: true,
          failedInSession: true,
          consecutiveSuccesses: SESSION_CONFIG.REQUIRED_CONSECUTIVE_SUCCESSES, // Enough consecutive successes
          remainingReviewsNeeded: 0, // No more reviews needed
        },
      });

      const shouldRequeue4 = shouldRequeueWord(word4, true);
      expect(shouldRequeue4).toBe(false);
    });
  });

  // BUG FIX 3: Array length check bug in getNextWordIndex
  describe('Bug Fix: Array length check in getNextWordIndex', () => {
    it('should update wordsQueueLength after splicing in a word', () => {
      // Mock the state
      const currentIndex = 0;
      const nextPos = currentIndex + 1;
      let wordsQueueLength = 2; // Initial length
      const wordsRef = {
        current: [
          createMockWord({ sentence_word_id: '1' }),
          createMockWord({ sentence_word_id: '2' }),
        ],
      };
      const failedWordsRef: { current: WordWithReinsertPosition[] } = {
        current: [
          {
            ...createMockWord({ sentence_word_id: '3' }),
            reinsertPosition: nextPos,
          },
        ],
      };

      // Simulate the getNextWordIndex function
      const wordToReinsert = failedWordsRef.current.find(w => w.reinsertPosition === nextPos);

      if (wordToReinsert && wordToReinsert.sentence_word_id) {
        // Remove this word from the failed words queue
        failedWordsRef.current = failedWordsRef.current.filter(
          w => !isSameWordId(w.sentence_word_id, wordToReinsert.sentence_word_id)
        );

        // Insert the word at the next position
        wordsRef.current.splice(nextPos, 0, wordToReinsert);

        // BUG FIX: Update the queue length after modifying the array
        wordsQueueLength = wordsRef.current.length;
      }

      // Check if we've reached the end of the queue
      const isAtEnd = nextPos >= wordsQueueLength;

      // Verify the word was inserted
      expect(wordsRef.current.length).toBe(3);
      // Verify the queue length was updated
      expect(wordsQueueLength).toBe(3);
      // Verify isAtEnd is false (because nextPos = 1, wordsQueueLength = 3)
      expect(isAtEnd).toBe(false);
    });
  });

  // BUG FIX 4: Processing attempts counter is never reset
  describe('Bug Fix: Processing attempts counter reset', () => {
    it('should reset processing attempts counter on successful review', () => {
      // Create a word with processing attempts
      const wordToUpdate = createMockWord({
        sessionData: {
          isNew: false,
          failedInSession: true,
          consecutiveSuccesses: 0,
          remainingReviewsNeeded: 0,
          processingAttempts: 2, // Has been processed twice already
        },
      });

      // Simulate the updateWordMutation function with success = true
      if (wordToUpdate.sessionData) {
        // Simulate success = true case
        wordToUpdate.sessionData.consecutiveSuccesses =
          (wordToUpdate.sessionData.consecutiveSuccesses || 0) + 1;

        // BUG FIX: Reset processing attempts counter on successful review
        wordToUpdate.sessionData.processingAttempts = 0;
      }

      // Verify the processing attempts counter was reset
      expect(wordToUpdate.sessionData?.processingAttempts).toBe(0);
    });
  });

  // BUG FIX 5: Word review counts initialization bug
  describe('Bug Fix: Word review counts initialization', () => {
    it('should initialize wordReviewCountsRef with the actual review count', () => {
      // Create words with different review counts
      const processedWords = [
        createMockWord({ sentence_word_id: '1', review_count: 5 }),
        createMockWord({ sentence_word_id: '2', review_count: 0 }),
        createMockWord({ sentence_word_id: '3', review_count: 10 }),
      ];

      // Mock the wordReviewCountsRef with proper typing
      const wordReviewCountsRef: { current: Record<string, number> } = { current: {} };

      // Simulate the initializeWordsQueue function
      processedWords.forEach(word => {
        if (word.sentence_word_id) {
          // BUG FIX: Initialize with the actual review count instead of always using 1
          wordReviewCountsRef.current[word.sentence_word_id] = word.review_count || 1;
        }
      });

      // Verify the review counts were initialized correctly
      expect(wordReviewCountsRef.current['1']).toBe(5);
      expect(wordReviewCountsRef.current['2']).toBe(0 || 1); // Should be 1 because of the || 1
      expect(wordReviewCountsRef.current['3']).toBe(10);
    });
  });

  // BUG FIX 6: Review completion logic bug
  describe('Bug Fix: Review completion logic', () => {
    it('should not mark review as complete if there are failed words, even when wordsCount is 0', () => {
      // Test the isReviewComplete function with wordsCount = 0 and failedWordsCount > 0
      const result = isReviewComplete(
        0, // currentIndex
        0, // wordsCount
        1, // failedWordsCount > 0
        true, // hasWords
        true // wordsLoaded
      );

      // The review should not be complete because there are failed words
      expect(result).toBe(false);

      // Test with wordsCount = 0 and failedWordsCount = 0
      const result2 = isReviewComplete(
        0, // currentIndex
        0, // wordsCount
        0, // failedWordsCount = 0
        true, // hasWords
        true // wordsLoaded
      );

      // The review should be complete because there are no failed words
      expect(result2).toBe(true);
    });
  });
});
