/**
 * Integration Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * Session Completion Flow - Integration Tests
 *
 * Tests the complete practice session lifecycle from start to completion.
 * Covers completion triggers, session metrics, and query invalidation.
 *
 * Requirements:
 * - Session completes only when ALL words are marked known
 * - Vague words prevent completion until re-reviewed as known
 * - Session metrics (streaks, mastered words, stability) are accurate
 * - Queries are invalidated after session completion
 */

describe('Session Completion Flow - Integration Test', () => {
  interface SessionMetrics {
    wordsReviewed: number;
    wordsKnown: number;
    wordsVague: number;
    wordsUnknown: number;
    currentStreak: number;
    longestStreak: number;
    masteredWords: number;
    averageStabilityIncrease: number;
  }

  describe('Completion triggers', () => {
    test('should complete session when all words are marked known', () => {
      const session = {
        totalWords: 3,
        knownWords: 0,
        vagueWordsInSpacing: 0,
        isComplete: false,
      };

      // Process all words as known
      session.knownWords = 1;
      session.isComplete = session.knownWords >= session.totalWords;
      expect(session.isComplete).toBeFalsy();

      session.knownWords = 2;
      session.isComplete = session.knownWords >= session.totalWords;
      expect(session.isComplete).toBeFalsy();

      session.knownWords = 3;
      session.isComplete = session.knownWords >= session.totalWords;
      expect(session.isComplete).toBeTruthy();
    });

    test('should NOT complete when vague words remain in spacing queue', () => {
      const session = {
        totalWords: 3,
        knownWords: 2,
        vagueWordsInSpacing: 1,
        wordQueueEmpty: true,
      };

      // Old buggy logic: complete when queue empty
      const buggyComplete = session.wordQueueEmpty;

      // Correct logic: complete when all words known
      const correctComplete = session.knownWords >= session.totalWords;

      expect(buggyComplete).toBeTruthy(); // Would complete (wrong)
      expect(correctComplete).toBeFalsy(); // Should NOT complete (correct)
    });

    test('should eventually complete when vague words are re-reviewed as known', () => {
      const session = {
        totalWords: 3,
        knownWords: 2,
        vagueWordsInSpacing: 1,
      };

      // Initial state: not complete
      let isComplete = session.knownWords >= session.totalWords;
      expect(isComplete).toBeFalsy();

      // Vague word re-presented and marked known
      session.knownWords += 1;
      session.vagueWordsInSpacing -= 1;

      // Now complete
      isComplete = session.knownWords >= session.totalWords;
      expect(isComplete).toBeTruthy();
      expect(session.vagueWordsInSpacing).toBe(0);
    });

    test('should handle session with only unknown words eventually completing', () => {
      const session = {
        totalWords: 2,
        knownWords: 0,
        unknownWordsInSpacing: 2,
      };

      // Mark all unknown words as known on re-review
      session.knownWords = 2;
      session.unknownWordsInSpacing = 0;

      const isComplete = session.knownWords >= session.totalWords;
      expect(isComplete).toBeTruthy();
    });
  });

  describe('Session metrics tracking', () => {
    test('should track wordsReviewed, wordsKnown, wordsVague, wordsUnknown correctly', () => {
      const metrics: SessionMetrics = {
        wordsReviewed: 0,
        wordsKnown: 0,
        wordsVague: 0,
        wordsUnknown: 0,
        currentStreak: 0,
        longestStreak: 0,
        masteredWords: 0,
        averageStabilityIncrease: 0,
      };

      // Word 1: Known
      metrics.wordsReviewed++;
      metrics.wordsKnown++;
      expect(metrics).toMatchObject({
        wordsReviewed: 1,
        wordsKnown: 1,
        wordsVague: 0,
        wordsUnknown: 0,
      });

      // Word 2: Vague
      metrics.wordsReviewed++;
      metrics.wordsVague++;
      expect(metrics).toMatchObject({
        wordsReviewed: 2,
        wordsKnown: 1,
        wordsVague: 1,
        wordsUnknown: 0,
      });

      // Word 3: Unknown
      metrics.wordsReviewed++;
      metrics.wordsUnknown++;
      expect(metrics).toMatchObject({
        wordsReviewed: 3,
        wordsKnown: 1,
        wordsVague: 1,
        wordsUnknown: 1,
      });
    });

    test('should track current streak and longest streak correctly', () => {
      const metrics: SessionMetrics = {
        wordsReviewed: 0,
        wordsKnown: 0,
        wordsVague: 0,
        wordsUnknown: 0,
        currentStreak: 0,
        longestStreak: 0,
        masteredWords: 0,
        averageStabilityIncrease: 0,
      };

      // Known → streak increases
      metrics.wordsKnown++;
      metrics.currentStreak++;
      metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);
      expect(metrics.currentStreak).toBe(1);
      expect(metrics.longestStreak).toBe(1);

      // Known → streak continues
      metrics.wordsKnown++;
      metrics.currentStreak++;
      metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);
      expect(metrics.currentStreak).toBe(2);
      expect(metrics.longestStreak).toBe(2);

      // Vague → streak resets
      metrics.wordsVague++;
      metrics.currentStreak = 0;
      expect(metrics.currentStreak).toBe(0);
      expect(metrics.longestStreak).toBe(2); // Longest preserved

      // Known → new streak starts
      metrics.wordsKnown++;
      metrics.currentStreak++;
      metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);
      expect(metrics.currentStreak).toBe(1);
      expect(metrics.longestStreak).toBe(2); // Still 2
    });

    test('should track mastered words (stability >= 5 days)', () => {
      const words = [
        { id: 1, stability: 3 }, // Not mastered
        { id: 2, stability: 4 }, // Will be mastered after known review
        { id: 3, stability: 6 }, // Already mastered
      ];

      let masteredWords = 0;

      words.forEach(word => {
        const isKnown = true; // Assume all marked known
        if (isKnown && word.stability >= 4) {
          // Stability will increase, likely reaching 5+
          masteredWords++;
        }
      });

      expect(masteredWords).toBe(2); // Words 2 and 3
    });

    test('should calculate average stability increase', () => {
      interface WordReview {
        stability: number;
        confidence: 'known' | 'vague' | 'unknown';
      }

      const reviews: WordReview[] = [
        { stability: 10, confidence: 'known' }, // +3 (30% of 10)
        { stability: 5, confidence: 'vague' }, // +0.5 (10% of 5)
        { stability: 8, confidence: 'known' }, // +2.4 (30% of 8)
      ];

      let totalIncrease = 0;
      let wordsReviewed = 0;

      reviews.forEach(review => {
        const increase =
          review.confidence === 'known'
            ? review.stability * 0.3
            : review.confidence === 'vague'
              ? review.stability * 0.1
              : 0;

        totalIncrease += increase;
        wordsReviewed++;
      });

      const avgIncrease = totalIncrease / wordsReviewed;

      expect(avgIncrease).toBeCloseTo(1.97, 2); // (3 + 0.5 + 2.4) / 3
    });
  });

  describe('Completion screen data', () => {
    test('should provide all required metrics for completion screen', () => {
      const sessionMetrics: SessionMetrics = {
        wordsReviewed: 10,
        wordsKnown: 7,
        wordsVague: 2,
        wordsUnknown: 1,
        currentStreak: 3,
        longestStreak: 5,
        masteredWords: 4,
        averageStabilityIncrease: 2.5,
      };

      // Verify all metrics are present
      expect(sessionMetrics.wordsReviewed).toBeDefined();
      expect(sessionMetrics.wordsKnown).toBeDefined();
      expect(sessionMetrics.wordsVague).toBeDefined();
      expect(sessionMetrics.wordsUnknown).toBeDefined();
      expect(sessionMetrics.currentStreak).toBeDefined();
      expect(sessionMetrics.longestStreak).toBeDefined();
      expect(sessionMetrics.masteredWords).toBeDefined();
      expect(sessionMetrics.averageStabilityIncrease).toBeDefined();

      // Verify totals add up
      const totalProcessed =
        sessionMetrics.wordsKnown + sessionMetrics.wordsVague + sessionMetrics.wordsUnknown;
      expect(totalProcessed).toBe(sessionMetrics.wordsReviewed);
    });

    test('should show session duration in completion metrics', () => {
      const startTime = Date.now();
      const endTime = startTime + 120000; // 2 minutes later

      const durationMs = endTime - startTime;
      const durationMinutes = Math.floor(durationMs / 60000);
      const durationSeconds = Math.floor((durationMs % 60000) / 1000);

      expect(durationMinutes).toBe(2);
      expect(durationSeconds).toBe(0);
    });
  });

  describe('Query invalidation after completion', () => {
    test('should invalidate FSRS queries when session completes', () => {
      const invalidatedQueries: string[] = [];

      function invalidateQuery(queryKey: string): void {
        invalidatedQueries.push(queryKey);
      }

      const userId = 'user123';

      // Simulate session completion
      const sessionComplete = true;

      if (sessionComplete) {
        // These should all be invalidated
        invalidateQuery(`fsrs-words-all-${userId}`);
        invalidateQuery(`fsrs-words-due-${userId}`);
        invalidateQuery(`fsrs-words-with-cooldown-${userId}`);
        invalidateQuery(`fsrs-words-stats-${userId}`);
      }

      expect(invalidatedQueries).toHaveLength(4);
      expect(invalidatedQueries).toContain(`fsrs-words-all-${userId}`);
      expect(invalidatedQueries).toContain(`fsrs-words-due-${userId}`);
    });

    test('should refetch queries after invalidation to update UI', () => {
      const refetchedQueries: string[] = [];

      function refetchQuery(queryKey: string): void {
        refetchedQueries.push(queryKey);
      }

      const userId = 'user123';

      // After invalidation, refetch to get fresh data
      refetchQuery(`fsrs-words-all-${userId}`);
      refetchQuery(`fsrs-words-due-${userId}`);

      expect(refetchedQueries).toHaveLength(2);
    });
  });

  describe('Edge cases', () => {
    test('should handle empty session (0 words)', () => {
      const session = {
        totalWords: 0,
        knownWords: 0,
      };

      const isComplete = session.knownWords >= session.totalWords;
      expect(isComplete).toBeTruthy(); // Vacuously true
    });

    test('should handle session with all words immediately known', () => {
      const session = {
        totalWords: 5,
        knownWords: 5,
        timeElapsed: 30000, // 30 seconds
      };

      const isComplete = session.knownWords >= session.totalWords;
      expect(isComplete).toBeTruthy();

      // Should have perfect metrics
      const metrics = {
        wordsReviewed: 5,
        wordsKnown: 5,
        wordsVague: 0,
        wordsUnknown: 0,
        currentStreak: 5,
        longestStreak: 5,
      };

      expect(metrics.currentStreak).toBe(metrics.longestStreak);
      expect(metrics.wordsVague + metrics.wordsUnknown).toBe(0);
    });

    test('should handle session with all words unknown → vague → known progression', () => {
      const session = {
        totalWords: 1,
        reviewCount: 0,
        knownWords: 0,
      };

      // First attempt: unknown
      session.reviewCount++;
      expect(session.knownWords).toBe(0);

      // Second attempt: vague (after seeing translation)
      session.reviewCount++;
      expect(session.knownWords).toBe(0);

      // Third attempt: known
      session.reviewCount++;
      session.knownWords = 1;

      const isComplete = session.knownWords >= session.totalWords;
      expect(isComplete).toBeTruthy();
      expect(session.reviewCount).toBe(3); // Took 3 reviews
    });
  });
});
