/**
 * Confidence level selected when answering a vocabulary prompt.
 * Centralized here to avoid repeating the union across hooks and services.
 */
export type WordConfidence = 'known' | 'unknown' | 'vague';

/**
 * Consolidated refs for time tracking during review sessions
 */
export interface ReviewTimeRefs {
  lastVagueTime: number | null;
  lastProgressUpdate: number;
  lastProcessedWordId: string | null;
}

/**
 * Consolidated refs for state tracking during review sessions
 */
export interface ReviewStateRefs {
  maxProgress: number;
  completionTriggered: boolean;
  isUpdatingWord: boolean;
  progressUpdatedForCompletion: boolean;
}

/**
 * Statistics about a review session such as counts of words reviewed and other metrics
 * Used by the review hook and completion screen to show session progress
 */
export interface SessionMetrics {
  /** Total number of words reviewed */
  wordsReviewed: number;
  /** Number of words marked as known */
  wordsKnown: number;
  /** Number of words marked as vaguely known */
  wordsVague: number;
  /** Number of words marked as unknown */
  wordsUnknown: number;
  /** Average increase in stability during the session */
  averageStabilityIncrease: number;
  /** Longest correct streak during the session */
  longestStreak: number;
  /** Current streak at the end of the session */
  currentStreak: number;
  /** Number of words mastered during the session */
  masteredWords: number;
  /** Unix timestamp when the session started */
  startTime: number;
}
