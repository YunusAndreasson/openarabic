/**
 * The three self-grades, ordered worst → best.
 *
 * The tuple is the source of truth and `WordConfidence` is derived from it, so
 * the union can never gain a member that nothing enumerates. Everything that
 * has to walk every grade — the interval preview, the pass/miss partition in
 * constants/fsrs, the grade bar's buttons — iterates THIS, rather than casting
 * `Object.keys` back to the union and quietly missing a new one.
 *
 * The order is also the order the grade bar paints (left → right, red → amber →
 * green) and the order of the swipe outcomes (left = Forgot, right = Knew it).
 * One list, so a fourth grade cannot appear in the union and be absent from the
 * row that renders it.
 */
export const WORD_CONFIDENCES = ['unknown', 'vague', 'known'] as const;

/**
 * Self-assessed recall confidence when grading a *revealed* vocabulary card.
 * Three-way — the user sees the answer first, then rates honestly (UI labels):
 *   - 'known'   → "Knew it"  — clean recall            (ts-fsrs Good)
 *   - 'vague'   → "Guessed"  — recalled but effortful  (ts-fsrs Hard, a PASS)
 *   - 'unknown' → "Forgot"   — failed recall           (ts-fsrs Again)
 * Mapped to ts-fsrs Rating via CONFIDENCE_TO_RATING in constants/fsrs.ts.
 * Centralized here to avoid repeating the union across hooks and services.
 */
export type WordConfidence = (typeof WORD_CONFIDENCES)[number];

/**
 * Per-grade interval preview ("10m" / "4d") — one label for every grade.
 *
 * Total, not `Partial`: the producer (useFSRS.previewIntervals) walks
 * WORD_CONFIDENCES and fills every key from the same ts-fsrs scheduler that
 * grading uses, so a missing entry is not a state the app can reach. Typed
 * total, a consumer that forgets a grade fails to compile instead of silently
 * rendering a button with no interval under it.
 */
export type IntervalLabels = Record<WordConfidence, string>;

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
