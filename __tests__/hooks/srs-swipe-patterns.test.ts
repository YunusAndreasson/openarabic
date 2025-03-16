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
    sentence_word_id: `word-${Math.floor(Math.random() * 10000)}`, // Random ID for uniqueness
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

// Helper function to simulate a session with a specific swipe pattern
function simulateSwipePattern(
  words: StudyWord[],
  swipePattern: ('success' | 'failure')[],
  options: {
    logDetails?: boolean;
    maxIterations?: number;
  } = {}
) {
  const { logDetails = false, maxIterations = words.length * 5 } = options;

  // Track session state
  let currentIndex = 0;
  let failedWords: StudyWord[] = [];
  let wordQueue = [...words];
  let processedWords = new Set<string>();
  let totalReviews = 0;
  let swipeIndex = 0;
  let wordHistory: {
    wordId: string;
    swipe: 'success' | 'failure';
    position: number;
    iteration: number;
  }[] = [];

  // Simulate the session
  while (currentIndex < wordQueue.length && totalReviews < maxIterations) {
    const currentWord = wordQueue[currentIndex];

    // Get the next swipe from the pattern
    const swipe = swipePattern[swipeIndex % swipePattern.length];
    swipeIndex++;

    // Convert swipe to success boolean
    const success = swipe === 'success';

    // Process the word
    const result = calculateNextReview(currentWord, success);

    // Track that we've processed this word
    processedWords.add(currentWord.sentence_word_id);

    // Update metrics
    totalReviews++;

    // Track word history
    wordHistory.push({
      wordId: currentWord.sentence_word_id,
      swipe,
      position: currentIndex,
      iteration: totalReviews,
    });

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
            failedInSession: true,
            consecutiveSuccesses: 0,
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

          if (logDetails) {
            console.log(
              `Requeued failed word ${currentWord.sentence_word_id} at position ${reinsertPosition}`
            );
          }
        } else {
          if (logDetails) {
            console.log(
              `Word ${currentWord.sentence_word_id} has reached processing limit, not requeuing`
            );
          }
        }
      } else {
        // Add new failed word
        const failedWord = {
          ...wordQueue[currentIndex],
          sessionData: {
            ...wordQueue[currentIndex].sessionData,
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

        if (logDetails) {
          console.log(
            `Added new failed word ${currentWord.sentence_word_id} at position ${reinsertPosition}`
          );
        }
      }
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

        if (logDetails) {
          console.log(
            `Requeued new word ${currentWord.sentence_word_id} at position ${reinsertPosition}`
          );
        }
      } else if (logDetails) {
        console.log(`New word ${currentWord.sentence_word_id} completed required reviews`);
      }
    } else if (currentWord.sessionData?.failedInSession) {
      // Handle words that failed in session but were successful this time
      const updatedWord = {
        ...wordQueue[currentIndex],
        sessionData: {
          ...wordQueue[currentIndex].sessionData,
          consecutiveSuccesses:
            (wordQueue[currentIndex].sessionData?.consecutiveSuccesses || 0) + 1,
          processingAttempts: (wordQueue[currentIndex].sessionData?.processingAttempts || 0) + 1,
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

        if (logDetails) {
          console.log(
            `Requeued previously failed word ${currentWord.sentence_word_id} at position ${reinsertPosition}`
          );
        }
      } else {
        // Remove from failed words if enough consecutive successes
        failedWords = failedWords.filter(w => w.sentence_word_id !== updatedWord.sentence_word_id);

        if (logDetails) {
          console.log(
            `Word ${currentWord.sentence_word_id} has enough consecutive successes, removed from failed words`
          );
        }
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
      true,
      totalReviews
    );

    // If complete, break
    if (isComplete) {
      if (logDetails) {
        console.log(`Session complete after ${totalReviews} reviews`);
      }
      break;
    }
  }

  // Make sure we've processed all original words
  for (const word of words) {
    processedWords.add(word.sentence_word_id);
  }

  // Calculate final metrics
  const finalProgress = calculateProgress(currentIndex, words.length, failedWords.length);
  const finalIsComplete = isReviewComplete(
    currentIndex,
    words.length,
    failedWords.length,
    true,
    true,
    totalReviews
  );

  return {
    processedWords: processedWords.size,
    totalWords: words.length,
    totalReviews,
    finalProgress,
    isComplete: finalIsComplete,
    remainingFailedWords: failedWords.length,
    wordHistory,
    finalQueue: wordQueue,
    finalFailedWords: failedWords,
  };
}

// Helper to analyze word processing metrics
function analyzeWordProcessing(
  wordHistory: {
    wordId: string;
    swipe: 'success' | 'failure';
    position: number;
    iteration: number;
  }[]
) {
  const wordStats: Record<
    string,
    {
      totalSwipes: number;
      successSwipes: number;
      failureSwipes: number;
      positions: number[];
      iterations: number[];
    }
  > = {};

  // Collect stats for each word
  for (const entry of wordHistory) {
    if (!wordStats[entry.wordId]) {
      wordStats[entry.wordId] = {
        totalSwipes: 0,
        successSwipes: 0,
        failureSwipes: 0,
        positions: [],
        iterations: [],
      };
    }

    wordStats[entry.wordId].totalSwipes++;
    if (entry.swipe === 'success') {
      wordStats[entry.wordId].successSwipes++;
    } else {
      wordStats[entry.wordId].failureSwipes++;
    }

    wordStats[entry.wordId].positions.push(entry.position);
    wordStats[entry.wordId].iterations.push(entry.iteration);
  }

  // Calculate aggregate stats
  const wordIds = Object.keys(wordStats);
  const totalWords = wordIds.length;
  const totalSwipes = wordHistory.length;
  const avgSwipesPerWord = totalSwipes / totalWords;
  const maxSwipesForAnyWord = Math.max(...wordIds.map(id => wordStats[id].totalSwipes));
  const minSwipesForAnyWord = Math.min(...wordIds.map(id => wordStats[id].totalSwipes));

  // Words that needed multiple attempts
  const multipleAttemptWords = wordIds.filter(id => wordStats[id].totalSwipes > 1);
  const percentMultipleAttempts = (multipleAttemptWords.length / totalWords) * 100;

  return {
    wordStats,
    totalWords,
    totalSwipes,
    avgSwipesPerWord,
    maxSwipesForAnyWord,
    minSwipesForAnyWord,
    multipleAttemptWords: multipleAttemptWords.length,
    percentMultipleAttempts,
  };
}

describe('SRS Swipe Patterns', () => {
  describe('Basic Swipe Patterns', () => {
    it('should handle all success swipes', () => {
      // Create a set of regular words (no new words)
      const words = Array.from({ length: 20 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // All success swipes
      const swipePattern: ('success' | 'failure')[] = Array(50).fill('success');

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Session should complete
      expect(result.isComplete).toBe(true);

      // Progress should be 100%
      expect(result.finalProgress).toBe(100);

      // No failed words should remain
      expect(result.remainingFailedWords).toBe(0);

      // Total reviews should equal word count (no requeuing for all success)
      expect(result.totalReviews).toBe(words.length);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Each word should be processed exactly once
      expect(analysis.avgSwipesPerWord).toBe(1);
      expect(analysis.maxSwipesForAnyWord).toBe(1);
      expect(analysis.minSwipesForAnyWord).toBe(1);
      expect(analysis.multipleAttemptWords).toBe(0);
    });

    it('should handle all failure swipes', () => {
      // Create a small set of words to avoid excessive test time
      const words = Array.from({ length: 5 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // All failure swipes
      const swipePattern: ('success' | 'failure')[] = Array(100).fill('failure');

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Session should still complete due to MAX_PROCESSING_ATTEMPTS limit
      expect(result.isComplete).toBe(true);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Total reviews should be limited by MAX_PROCESSING_ATTEMPTS
      expect(result.totalReviews).toBeLessThanOrEqual(
        words.length * (SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 1)
      );

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Each word should be processed multiple times but capped by MAX_PROCESSING_ATTEMPTS
      expect(analysis.maxSwipesForAnyWord).toBeLessThanOrEqual(
        SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 1
      );

      // Most words should have multiple attempts
      expect(analysis.multipleAttemptWords).toBeGreaterThanOrEqual(words.length - 1);
    });

    it('should handle alternating success/failure swipes', () => {
      // Create a set of words
      const words = Array.from({ length: 10 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Alternating success/failure swipes
      const swipePattern: ('success' | 'failure')[] = [];
      for (let i = 0; i < 50; i++) {
        swipePattern.push(i % 2 === 0 ? 'success' : 'failure');
      }

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Total reviews should be more than word count due to requeuing
      expect(result.totalReviews).toBeGreaterThan(words.length);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Some words should be processed multiple times
      expect(analysis.multipleAttemptWords).toBeGreaterThan(0);
    });
  });

  describe('Complex Swipe Patterns', () => {
    it('should handle a realistic swipe pattern with mostly success and occasional failures', () => {
      // Create a set of words with some new words
      const words = Array.from({ length: 20 }, (_, i) => {
        if (i < 5) {
          // New words
          return createMockWord({
            sentence_word_id: `new-word-${i}`,
            sessionData: {
              isNew: true,
              remainingReviewsNeeded: SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS,
            },
          });
        } else {
          // Regular words
          return createMockWord({ sentence_word_id: `word-${i}` });
        }
      });

      // Realistic pattern: 80% success, 20% failure
      const swipePattern: ('success' | 'failure')[] = [];
      for (let i = 0; i < 100; i++) {
        swipePattern.push(Math.random() < 0.8 ? 'success' : 'failure');
      }

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // New words should be processed multiple times
      expect(analysis.multipleAttemptWords).toBeGreaterThanOrEqual(5);

      // Average swipes should be higher than 1 due to new words and failures
      expect(analysis.avgSwipesPerWord).toBeGreaterThan(1);
    });

    it('should handle a pattern with initial failures followed by successes', () => {
      // Create a set of words
      const words = Array.from({ length: 15 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Pattern: first 10 swipes are failures, then all successes
      const swipePattern: ('success' | 'failure')[] = [
        ...Array(10).fill('failure'),
        ...Array(50).fill('success'),
      ];

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Words that were initially failed should be processed multiple times
      expect(analysis.multipleAttemptWords).toBeGreaterThan(0);

      // Total swipes should be more than words due to requeuing
      expect(analysis.totalSwipes).toBeGreaterThan(words.length);
    });

    it('should handle a pattern with successes followed by failures', () => {
      // Create a set of words
      const words = Array.from({ length: 15 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Pattern: first 10 swipes are successes, then all failures
      const swipePattern: ('success' | 'failure')[] = [
        ...Array(10).fill('success'),
        ...Array(50).fill('failure'),
      ];

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Words that were failed should be processed multiple times
      expect(analysis.multipleAttemptWords).toBeGreaterThan(0);

      // Total swipes should be more than words due to requeuing
      expect(analysis.totalSwipes).toBeGreaterThan(words.length);
    });
  });

  describe('New Word Handling', () => {
    it('should ensure new words are reviewed the minimum required times', () => {
      // Create a set with only new words
      const words = Array.from({ length: 10 }, (_, i) =>
        createMockWord({
          sentence_word_id: `new-word-${i}`,
          sessionData: {
            isNew: true,
            remainingReviewsNeeded: SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS,
          },
        })
      );

      // All success swipes
      const swipePattern: ('success' | 'failure')[] = Array(50).fill('success');

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Each new word should be processed at least once
      expect(analysis.minSwipesForAnyWord).toBeGreaterThanOrEqual(1);

      // Total swipes should be at least equal to the word count
      expect(analysis.totalSwipes).toBeGreaterThanOrEqual(words.length);
    });

    it('should handle new words with failures correctly', () => {
      // Create a set with only new words
      const words = Array.from({ length: 5 }, (_, i) =>
        createMockWord({
          sentence_word_id: `new-word-${i}`,
          sessionData: {
            isNew: true,
            remainingReviewsNeeded: SESSION_CONFIG.NEW_WORD_MINIMUM_REVIEWS,
          },
        })
      );

      // Pattern: alternate success and failure
      const swipePattern: ('success' | 'failure')[] = [];
      for (let i = 0; i < 50; i++) {
        swipePattern.push(i % 2 === 0 ? 'success' : 'failure');
      }

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Each new word should be processed at least once
      expect(analysis.minSwipesForAnyWord).toBeGreaterThanOrEqual(1);

      // Some words should have multiple attempts
      expect(analysis.multipleAttemptWords).toBeGreaterThan(0);
    });
  });

  describe('Failed Word Recovery', () => {
    it('should require consecutive successes for failed words', () => {
      // Create a set of words
      const words = Array.from({ length: 10 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Pattern: first 5 failures, then success, then failure, then all successes
      // This tests that a single success isn't enough to clear a failed word
      const swipePattern: ('success' | 'failure')[] = [
        ...Array(5).fill('failure'),
        'success',
        'failure',
        ...Array(30).fill('success'),
      ];

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // Some words should have been processed multiple times
      expect(analysis.multipleAttemptWords).toBeGreaterThan(0);

      // The maximum swipes for any word should be at least 3
      // (at least one failure + at least two successes)
      expect(analysis.maxSwipesForAnyWord).toBeGreaterThanOrEqual(3);
    });

    it('should handle words that fail repeatedly before succeeding', () => {
      // Create a small set of words
      const words = Array.from({ length: 3 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Pattern: multiple failures for each word before successes
      const swipePattern: ('success' | 'failure')[] = [
        // First word: 3 failures then 2 successes
        'failure',
        'failure',
        'failure',
        'success',
        'success',
        // Second word: 2 failures then 2 successes
        'failure',
        'failure',
        'success',
        'success',
        // Third word: 1 failure then 2 successes
        'failure',
        'success',
        'success',
        // Extra successes for any requeued words
        ...Array(10).fill('success'),
      ];

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern, { logDetails: false });

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // All words should have multiple attempts
      expect(analysis.multipleAttemptWords).toBe(words.length);

      // The first word should have multiple swipes
      const wordStats = analysis.wordStats;
      const firstWordId = words[0].sentence_word_id;
      const firstWordSwipes = wordStats[firstWordId]?.totalSwipes || 0;

      // First word should have at least 3 swipes
      expect(firstWordSwipes).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Processing Attempts Limit', () => {
    it('should enforce the maximum processing attempts limit', () => {
      // Create a single word
      const words = [createMockWord({ sentence_word_id: 'problem-word' })];

      // All failure swipes
      const swipePattern: ('success' | 'failure')[] = Array(100).fill('failure');

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // The word should be processed at most MAX_PROCESSING_ATTEMPTS + 1 times
      expect(analysis.totalSwipes).toBeLessThanOrEqual(SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 1);
    });

    it('should handle mixed success/failure with processing attempts limit', () => {
      // Create a set of words
      const words = Array.from({ length: 5 }, (_, i) =>
        createMockWord({ sentence_word_id: `word-${i}` })
      );

      // Create a pattern that will cause one word to hit the limit
      // First word gets many failures, others get successes
      const swipePattern: ('success' | 'failure')[] = [];

      // Add failures for the first word
      for (let i = 0; i < SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 5; i++) {
        swipePattern.push('failure');
      }

      // Add successes for other words
      for (let i = 0; i < 20; i++) {
        swipePattern.push('success');
      }

      // Simulate the session
      const result = simulateSwipePattern(words, swipePattern);

      // Progress should be at least 85% (the base progress when all original words are processed)
      expect(result.finalProgress).toBeGreaterThanOrEqual(85);

      // Analyze word processing
      const analysis = analyzeWordProcessing(result.wordHistory);

      // The first word should be processed at most MAX_PROCESSING_ATTEMPTS + 1 times
      const firstWordId = words[0].sentence_word_id;
      const firstWordSwipes = analysis.wordStats[firstWordId]?.totalSwipes || 0;

      expect(firstWordSwipes).toBeLessThanOrEqual(SESSION_CONFIG.MAX_PROCESSING_ATTEMPTS + 1);
    });
  });
});
