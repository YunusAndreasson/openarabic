import { useCallback, useRef, useState } from 'react';

import type { SessionMetrics } from '@/types/review.types';

// FSRS mastery threshold - words are considered "mastered" when stability >= 5 days
const MASTERY_THRESHOLD = 5.0;

/**
 * Hook to manage practice session metrics tracking
 * Handles all session statistics including streaks, accuracy, and stability improvements
 *
 * @example
 * const { metrics, updateMetrics, resetMetrics } = useSessionMetrics();
 * updateMetrics('known', { rootId: 123, oldStability: 4.5, newStability: 6.2 });
 * console.log(metrics.wordsKnown, metrics.currentStreak);
 */
export const useSessionMetrics = () => {
  // Capture session start once via lazy state init so the ref initializer is pure.
  const [sessionStart] = useState(() => Date.now());
  const metricsRef = useRef<SessionMetrics>({
    wordsReviewed: 0,
    wordsKnown: 0,
    wordsUnknown: 0,
    averageStabilityIncrease: 0,
    longestStreak: 0,
    currentStreak: 0,
    masteredWords: 0,
    firstAttemptKnown: 0,
    firstAttemptUnknown: 0,
    startTime: sessionStart,
  });

  // Track unique words reviewed in this session
  const reviewedWordsSet = useRef<Set<number>>(new Set());

  /**
   * Update metrics based on user confidence response
   * @param confidence - User's confidence level for the word
   * @param wordData - Optional word data containing rootId and stability values
   */
  const updateMetrics = useCallback(
    (
      confidence: 'known' | 'unknown',
      wordData?: { rootId: number; oldStability?: number; newStability?: number },
    ) => {
      const metrics = metricsRef.current;

      // Track unique words reviewed (count each word only once per session)
      if (wordData?.rootId) {
        if (!reviewedWordsSet.current.has(wordData.rootId)) {
          reviewedWordsSet.current.add(wordData.rootId);
          metrics.wordsReviewed++;
          // First-attempt-per-word recall signal for adaptive pacing. Recorded
          // only on a word's first grade this session, so in-session re-asks
          // (spacing / drilling) don't inflate the rate.
          if (confidence === 'known') {
            metrics.firstAttemptKnown++;
          } else {
            metrics.firstAttemptUnknown++;
          }
        }
      } else {
        // Fallback for backwards compatibility if no rootId provided
        metrics.wordsReviewed++;
      }

      // Track response types and streaks
      if (confidence === 'known') {
        metrics.wordsKnown++;
        metrics.currentStreak++;
        metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);
      } else {
        metrics.wordsUnknown++;
        metrics.currentStreak = 0; // Reset streak on unknown
      }

      // Check if word became mastered during THIS session
      // Only count if: (1) marked as "known", (2) old < 5.0, (3) new >= 5.0
      if (
        confidence === 'known' &&
        wordData?.oldStability !== undefined &&
        wordData?.newStability !== undefined
      ) {
        const wasNotMastered = wordData.oldStability < MASTERY_THRESHOLD;
        const isNowMastered = wordData.newStability >= MASTERY_THRESHOLD;

        if (wasNotMastered && isNowMastered) {
          metrics.masteredWords++;
        }
      }

      // Calculate actual stability increase (for all confidence levels)
      if (wordData?.oldStability !== undefined && wordData?.newStability !== undefined) {
        const stabilityIncrease = wordData.newStability - wordData.oldStability;
        const totalIncrease =
          metrics.averageStabilityIncrease * (metrics.wordsReviewed - 1) + stabilityIncrease;
        metrics.averageStabilityIncrease = totalIncrease / metrics.wordsReviewed;
      }
    },
    [],
  );

  /**
   * Reset all metrics to initial state
   * Useful when starting a new session
   */
  const resetMetrics = useCallback(() => {
    const metrics = metricsRef.current;
    metrics.wordsReviewed = 0;
    metrics.wordsKnown = 0;
    metrics.wordsUnknown = 0;
    metrics.averageStabilityIncrease = 0;
    metrics.longestStreak = 0;
    metrics.currentStreak = 0;
    metrics.masteredWords = 0;
    metrics.firstAttemptKnown = 0;
    metrics.firstAttemptUnknown = 0;
    metrics.startTime = Date.now();

    // Clear unique words tracking
    reviewedWordsSet.current.clear();
  }, []);

  // metricsRef is mutated imperatively in updateMetrics/resetMetrics so consumers
  // read the latest values when their own state changes trigger re-render.
  // eslint-disable-next-line react-hooks/refs
  return {
    // eslint-disable-next-line react-hooks/refs
    metrics: metricsRef.current,
    updateMetrics,
    resetMetrics,
  };
};
