/**
 * Self-assessed recall confidence when grading a *revealed* vocabulary card.
 * Three-way — the user sees the answer first, then rates honestly (UI labels):
 *   - 'known'   → "Knew it"  — clean recall            (ts-fsrs Good)
 *   - 'vague'   → "Guessed"  — recalled but effortful  (ts-fsrs Hard, a PASS)
 *   - 'unknown' → "Forgot"   — failed recall           (ts-fsrs Again)
 * Mapped to ts-fsrs Rating via CONFIDENCE_TO_RATING in constants/fsrs.ts.
 * Centralized here to avoid repeating the union across hooks and services.
 */
export type WordConfidence = 'known' | 'vague' | 'unknown';

/**
 * Consolidated refs for time tracking during review sessions
 */
export interface ReviewTimeRefs {
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
  /** Number of words recalled (graded "Knew it" or "Guessed") */
  wordsKnown: number;
  /** Number of words forgotten (graded "Forgot") */
  wordsUnknown: number;
  /** Average increase in stability during the session */
  averageStabilityIncrease: number;
  /** Longest correct streak during the session */
  longestStreak: number;
  /** Current streak at the end of the session */
  currentStreak: number;
  /** Number of words mastered during the session */
  masteredWords: number;
  /**
   * Words recalled (Knew it OR Guessed) on their FIRST attempt this session.
   * Feeds the adaptive-pacing recall signal — first-attempt-only so in-session
   * re-asks (spacing / drilling) don't inflate the rate. "Guessed" is a Hard
   * PASS, so it counts as recalled here, matching what FSRS scores it as.
   */
  firstAttemptKnown: number;
  /** Words forgotten (Forgot) on their FIRST attempt this session. */
  firstAttemptUnknown: number;
  /** Unix timestamp when the session started */
  startTime: number;
}
