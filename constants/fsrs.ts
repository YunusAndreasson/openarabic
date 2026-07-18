import { Rating } from 'ts-fsrs';
import type { Grade, StepUnit } from 'ts-fsrs';

import type { WordConfidence } from '@/types/review.types';

export const DEFAULT_LEARNING_STEPS: StepUnit[] = ['1m', '10m'];
export const DEFAULT_RELEARNING_STEPS: StepUnit[] = ['5m', '10m'];

// Base keys for consistent cache management
export const FSRS_BASE_KEY = 'fsrs-words';

export const MIN_WORD_SPACING = 3;

// Default values and scaling
export const DEFAULT_FSRS_DIFFICULTY = 6.5;

export const CRITICAL_RETRIEVABILITY_THRESHOLD = 0.7;

// Word classification thresholds
export const UNSTABLE_STABILITY_THRESHOLD = 7;
export const UNSTABLE_DIFFICULTY_THRESHOLD = 7.5;

// "Words to revisit" / leech thresholds (ported from edenmind rankStrugglingCards).
// fsrs_lapses is the honest signal — ts-fsrs only counts a lapse when an
// already-graduated Review card is rated "Again" (i.e. answered Unknown here).
export const LEECH_MIN_LAPSES = 2; // fsrs_lapses >= this to qualify as a leech
export const LEECH_LIST_LIMIT = 20; // top-N struggling words to surface

// Adaptive new-word pacing (ported from edenmind computeAdaptiveNewLimit).
// The daily new-word limit becomes a ceiling that eases down when recent recall
// dips below request_retention, recovering as it improves. Gaps are kept in
// lockstep with the retention bands the rest of the SRS uses.
export const NEW_WORD_PACING = {
  /** Recent graded attempts needed before recall is a fair judgement. */
  MIN_TRIALS: 20,
  /** Recall this far under target → halve the daily ceiling. */
  REDUCE_GAP: 0.05,
  /** …and this far under → pause new words for the day. */
  PAUSE_GAP: 0.15,
} as const;

// In-session drilling to criterion (successive relearning, ported from edenmind
// decideDrill). FSRS owns the cross-session schedule; these only order the
// in-session relearning queue. A missed word is re-asked at an expanding lag
// until recalled correctly DRILL_CRITERION times, capped at DRILL_MAX_REASKS.
export const DRILL_CRITERION = 2; // correct recalls (each after a lag) to graduate a miss
export const DRILL_LAG_AFTER_MISS = MIN_WORD_SPACING; // intervening cards before the first re-ask (>= MIN_WORD_SPACING)
export const DRILL_LAG_AFTER_CORRECT = 8; // wider lag after a non-graduating correct recall
export const DRILL_MAX_REASKS = 6; // hard cap per word per session (prevents a stuck card trapping the session)

/**
 * Self-grade (WordConfidence) → ts-fsrs Rating. The card is graded on a
 * three-way confidence scale once its answer is revealed (UI: Forgot/Guessed/
 * Knew it):
 *   - known   ("Knew it") → Good   — clean recall
 *   - vague   ("Guessed") → Hard   — recalled but effortful (a PASS, not a miss)
 *   - unknown ("Forgot")  → Again  — failed recall
 * Easy is intentionally unused — learners can't reliably self-assess Easy vs Good.
 */
export const CONFIDENCE_TO_RATING: Record<WordConfidence, Grade> = {
  known: Rating.Good,
  vague: Rating.Hard,
  unknown: Rating.Again,
};

/**
 * Confidences that count as a within-session "miss" (re-drilled to criterion).
 * Only an outright Forgot re-drills — Guessed (Hard) is a pass and is penalized
 * only at the cross-session interval scale, where penalties belong.
 */
export const MISS_CONFIDENCE: ReadonlySet<WordConfidence> = new Set<WordConfidence>(['unknown']);

/** Confidences that count as a successful recall (streak / first-attempt pacing). */
export const RECALLED_CONFIDENCE: ReadonlySet<WordConfidence> = new Set<WordConfidence>([
  'known',
  'vague',
]);

export const DEFAULT_SESSION_COOLDOWN_HOURS = 2;

/**
 * Review sessions are served in digestible chunks: each session takes the
 * top-priority REVIEW_SESSION_CHUNK_SIZE due words (by calculateWordPriority).
 * Presentation-level cap only — badges and due counts still show the full
 * backlog; the completion screen offers the next chunk when more remain.
 */
export const REVIEW_SESSION_CHUNK_SIZE = 20;

/**
 * Hard intake gate: saving NEW words to practice is blocked while the due
 * backlog is at/above this count (one understandable rule: clear reviews,
 * then add). Complementary to the adaptive daily limit, which paces intake
 * by recall quality; this caps it by outstanding workload.
 */
export const DUE_BACKLOG_ADD_THRESHOLD = 20;

// Spacing and scheduling constants
export const SPACING_ITERATION_LIMIT = 20;
// Chart thresholds
export const URGENT_RETRIEVABILITY_THRESHOLD = 0.5;
export const TREND_CHANGE_THRESHOLD = 0.1;
export const MASTERY_TREND_THRESHOLD = 3;

/**
 * Memory capacity thresholds for vocabulary retention
 * These values determine when to show warnings, color coding, and recommendation logic
 * Used across: article recommendations, charts, gauges, and retention displays
 */
export const MEMORY_CAPACITY_THRESHOLDS = {
  /** Below this threshold shows red warning (poor retention) */
  POOR: 40,
  /** Below this threshold shows orange warning (moderate retention) */
  MODERATE: 70,
  /** Above this threshold shows green (good retention) */
  GOOD: 75,
} as const;

// Optimized FSRS configuration.
// request_retention 0.90 is the FSRS default target — roughly 40% fewer reviews
// than 0.95 for a small recall trade-off. Cards scheduled under an older target
// self-correct: each picks up 0.90-based intervals at its next review (no rebase).
export const OPTIMIZED_FSRS_CONFIG = {
  learning_steps: DEFAULT_LEARNING_STEPS,
  relearning_steps: DEFAULT_RELEARNING_STEPS,
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  // enable_short_term=true keeps short-term memory steps (learning/relearning)
  // active in ts-fsrs v5. Disabling would skip directly to long-term scheduling.
  // Current setting works correctly with our session-based learning flow.
  enable_short_term: true,
  // Use library defaults for weights and derived options to avoid version drift
} as const;
