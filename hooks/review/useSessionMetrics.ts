import { useCallback, useRef, useState } from 'react';

import { RECALLED_CONFIDENCE } from '@/constants/fsrs';
import type { SessionMetrics, WordConfidence } from '@/types/review.types';

// FSRS mastery threshold - words are considered "mastered" when stability >= 5 days
const MASTERY_THRESHOLD = 5.0;

function createSessionMetrics(startTime: number): SessionMetrics {
  return {
    wordsReviewed: 0,
    wordsKnown: 0,
    wordsUnknown: 0,
    averageStabilityIncrease: 0,
    longestStreak: 0,
    currentStreak: 0,
    masteredWords: 0,
    firstAttemptKnown: 0,
    firstAttemptUnknown: 0,
    startTime,
  };
}

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
  const metricsRef = useRef<SessionMetrics>(createSessionMetrics(sessionStart));

  // Track unique words reviewed in this session
  const reviewedWordsSet = useRef<Set<number>>(new Set());

  /**
   * Update metrics based on user confidence response
   * @param confidence - User's confidence level for the word
   * @param wordData - Optional word data containing rootId and stability values
   */
  const updateMetrics = useCallback(
    (
      confidence: WordConfidence,
      wordData?: { rootId: number; oldStability?: number; newStability?: number },
    ) => {
      const metrics = metricsRef.current;
      // "Knew it" and "Guessed" both count as a recall (Guessed is a Hard PASS);
      // only "Forgot" is a miss. Keeps recall / streak / mastery consistent with
      // what FSRS scores and with the drill (which re-asks only on Forgot).
      const recalled = RECALLED_CONFIDENCE.has(confidence);

      // Track unique words reviewed (count each word only once per session)
      if (wordData?.rootId) {
        if (!reviewedWordsSet.current.has(wordData.rootId)) {
          reviewedWordsSet.current.add(wordData.rootId);
          metrics.wordsReviewed++;
          // First-attempt-per-word recall signal for adaptive pacing. Recorded
          // only on a word's first grade this session, so in-session re-asks
          // (spacing / drilling) don't inflate the rate.
          if (recalled) {
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
      if (recalled) {
        metrics.wordsKnown++;
        metrics.currentStreak++;
        metrics.longestStreak = Math.max(metrics.longestStreak, metrics.currentStreak);
      } else {
        metrics.wordsUnknown++;
        metrics.currentStreak = 0; // Reset streak on Forgot
      }

      const oldStability = wordData?.oldStability;
      const newStability = wordData?.newStability;

      // Check if word became mastered during THIS session.
      // Count if: (1) recalled (Knew it / Guessed — a Hard pass can cross 5.0),
      // (2) old < 5.0, (3) new >= 5.0
      if (recalled && oldStability !== undefined && newStability !== undefined) {
        const wasNotMastered = oldStability < MASTERY_THRESHOLD;
        const isNowMastered = newStability >= MASTERY_THRESHOLD;

        if (wasNotMastered && isNowMastered) {
          metrics.masteredWords++;
        }
      }

      // Calculate actual stability increase (for all confidence levels)
      if (oldStability !== undefined && newStability !== undefined) {
        const stabilityIncrease = newStability - oldStability;
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
    Object.assign(metricsRef.current, createSessionMetrics(Date.now()));
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
