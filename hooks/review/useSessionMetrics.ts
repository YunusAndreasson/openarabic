import { useCallback, useRef } from 'react';

import type { SessionMetrics } from '@/types/review.types';

/**
 * Hook to manage practice session metrics tracking
 * Handles all session statistics including streaks, accuracy, and stability improvements
 *
 * @example
 * const { metrics, updateMetrics, resetMetrics } = useSessionMetrics();
 * updateMetrics('known', 5.2);
 * console.log(metrics.wordsKnown, metrics.currentStreak);
 */
export const useSessionMetrics = () => {
  const metricsRef = useRef<SessionMetrics>({
    wordsReviewed: 0,
    wordsKnown: 0,
    wordsVague: 0,
    wordsUnknown: 0,
    averageStabilityIncrease: 0,
    longestStreak: 0,
    currentStreak: 0,
    masteredWords: 0,
    startTime: Date.now(),
  });

  /**
   * Update metrics based on user confidence response
   * @param confidence - User's confidence level for the word
   * @param currentStability - Optional current FSRS stability value
   */
  const updateMetrics = useCallback(
    (confidence: 'known' | 'vague' | 'unknown', currentStability?: number) => {
      const metrics = metricsRef.current;
      metrics.wordsReviewed++;

      // Track response types and streaks
      if (confidence === 'known') {
        metrics.wordsKnown++;
        metrics.currentStreak++;
        metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);

        // Check if word is now mastered (stability >= 5 days after this review)
        if (currentStability && currentStability >= 4) {
          // Likely to reach 5+ after this review
          metrics.masteredWords++;
        }
      } else if (confidence === 'vague') {
        metrics.wordsVague++;
        metrics.currentStreak = 0; // Reset streak on vague
      } else {
        metrics.wordsUnknown++;
        metrics.currentStreak = 0; // Reset streak on unknown
      }

      // Calculate average stability increase (simplified estimation)
      if (currentStability) {
        const estimatedIncrease =
          confidence === 'known'
            ? currentStability * 0.3
            : confidence === 'vague'
              ? currentStability * 0.1
              : 0;
        const totalIncrease =
          metrics.averageStabilityIncrease * (metrics.wordsReviewed - 1) + estimatedIncrease;
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
    metrics.wordsVague = 0;
    metrics.wordsUnknown = 0;
    metrics.averageStabilityIncrease = 0;
    metrics.longestStreak = 0;
    metrics.currentStreak = 0;
    metrics.masteredWords = 0;
    metrics.startTime = Date.now();
  }, []);

  return {
    metrics: metricsRef.current,
    updateMetrics,
    resetMetrics,
  };
};
