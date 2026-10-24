import { Rating, State } from 'ts-fsrs';
import type { Grade, StepUnit } from 'ts-fsrs';

import { WORD_CONFIDENCES } from '@/types/review.types';
import type { WordConfidence } from '@/types/review.types';
import { MILLISECONDS_PER_HOUR } from '@/utils/dateTimeUtils';

const DEFAULT_LEARNING_STEPS: StepUnit[] = ['1m', '10m'];
const DEFAULT_RELEARNING_STEPS: StepUnit[] = ['5m', '10m'];

// Base keys for consistent cache management
export const FSRS_BASE_KEY = 'fsrs-words';

export const MIN_WORD_SPACING = 3;

/**
 * The FSRS values a never-reviewed study word carries — placeholders, not
 * measurements.
 *
 * The `study_words` FSRS columns are not left empty for a new word: it is
 * written with these (see `createResetFSRSUpdate`), and a word whose progress
 * is reset gets them back. Read naively they state a difficulty and a memory
 * for a word the learner has never been asked, so every surface that ranks or
 * draws FSRS state gates on `hasBeenPractised` first.
 */
export const PLACEHOLDER_FSRS = {
  /** On FSRS's 1–10 scale; also what a card is built with when the column is NULL. */
  difficulty: 6.5,
  /** Days. */
  stability: 0.4,
} as const;

export const CRITICAL_RETRIEVABILITY_THRESHOLD = 0.7;

// Word classification thresholds
export const UNSTABLE_DIFFICULTY_THRESHOLD = 7.5;

/**
 * Stability (in days) at which a word counts as "mastered", paired with
 * ts-fsrs state Review — see `isMasteredWord`, the predicate that owns the rule.
 *
 * Named because the bare `5` had independent homes: the client predicate, both
 * halves of a server-side category filter since removed, and a private
 * `MASTERY_THRESHOLD` inside useSessionMetrics that decides whether the
 * completion screen congratulates you for mastering a word.
 */
export const MASTERY_MIN_STABILITY = 5;

/**
 * FSRS difficulty is defined on a closed 1–10 scale, unlike stability, which is
 * an open-ended day count. Named here because the dictionary meter has to
 * normalise it to 0–1 and a magic `10` in that maths reads as arbitrary.
 */
export const FSRS_DIFFICULTY_MIN = 1;
export const FSRS_DIFFICULTY_MAX = 10;

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
 * three-way confidence scale once its answer is revealed (UI: Forgot/Barely/
 * Knew it):
 *   - known   ("Knew it") → Good   — clean recall
 *   - vague   ("Barely")  → Hard   — recalled but effortful (a PASS, not a miss)
 *   - unknown ("Forgot")  → Again  — failed recall
 * Easy is intentionally unused — learners can't reliably self-assess Easy vs Good.
 */
export const CONFIDENCE_TO_RATING: Record<WordConfidence, Grade> = {
  known: Rating.Good,
  vague: Rating.Hard,
  unknown: Rating.Again,
};

/**
 * The pass / miss partition, DERIVED from CONFIDENCE_TO_RATING rather than
 * listed by hand.
 *
 * "A miss is the grade FSRS scores as Again" is the actual rule, and these two
 * sets are exact complements of it. Spelled out as two literal lists they were
 * two independent copies of one decision: re-mapping `vague` to Again (or
 * adding a fourth grade) would have updated one and left the other claiming the
 * same card both passed and missed. Derived, that is not expressible.
 */
const MISSED_RATING = Rating.Again;

export const MISS_CONFIDENCE: ReadonlySet<WordConfidence> = new Set(
  WORD_CONFIDENCES.filter(confidence => CONFIDENCE_TO_RATING[confidence] === MISSED_RATING),
);

/** Confidences that count as a successful recall (streak / first-attempt pacing). */
export const RECALLED_CONFIDENCE: ReadonlySet<WordConfidence> = new Set(
  WORD_CONFIDENCES.filter(confidence => CONFIDENCE_TO_RATING[confidence] !== MISSED_RATING),
);

export const DEFAULT_SESSION_COOLDOWN_HOURS = 2;

/**
 * The two short-step states: FSRS schedules them minutes out on purpose
 * (learning_steps 1m/10m, relearning_steps 5m/10m) — they are the words the
 * learner has not got right yet.
 */
export const SHORT_STEP_STATES = [State.Learning, State.Relearning] as const;

/**
 * States exempt from the post-session cooldown: New (never asked) plus both
 * short-step states, whose whole purpose is to come back within minutes.
 *
 * One list for both sides of the rule — the server filter in
 * `studyWordsFSRSService.getFSRSWords` and the client mirror in
 * `filterDueWords` — because two hand-written `(0,1,3)` lists is how the two
 * sides drift apart.
 */
export const COOLDOWN_EXEMPT_STATES = [State.New, ...SHORT_STEP_STATES] as const;

/** Whether `state` is one of the minute-scale {@link SHORT_STEP_STATES}. */
export const isShortStepState = (state: State | null | undefined): boolean =>
  SHORT_STEP_STATES.some(shortStep => shortStep === state);

/** Whether `state` is exempt from the session cooldown ({@link COOLDOWN_EXEMPT_STATES}). */
export const isCooldownExemptState = (state: State | null | undefined): boolean =>
  COOLDOWN_EXEMPT_STATES.some(exempt => exempt === state);

/**
 * Whether the post-session cooldown is in force at `nowMs`: a session finished
 * less than `cooldownHours` ago. The one statement of the window that the due
 * query, its client-side mirror and the reminder planner each used to write out.
 */
export function isSessionCooldownActive(
  lastCompletedAt: number | undefined,
  cooldownHours: number,
  nowMs: number,
): boolean {
  return (
    typeof lastCompletedAt === 'number' &&
    nowMs - lastCompletedAt < cooldownHours * MILLISECONDS_PER_HOUR
  );
}

/**
 * How many due words the review session holds in its priority heap at once.
 *
 * A WORKING-SET size, not a session cap. The session drains the entire backlog
 * it started with, refilling this many words at a time as the heap empties
 * (see useFSRS) — "Session complete" is only ever shown when nothing is left.
 *
 * It exists because the in-session machinery reasons over what is in the heap.
 * Spacing keeps repeats at least MIN_WORD_SPACING cards apart and the drill
 * re-asks a missed word after DRILL_LAG_AFTER_MISS; with a 300-word heap those
 * lags are trivially satisfiable and a missed word can drift arbitrarily far
 * from the miss. A small working set keeps re-asks close enough to be
 * relearning rather than a second cold recall.
 *
 * This was previously a presentation cap, and the session ended at the end of
 * the first chunk — congratulating a learner with 27 words still due and then
 * offering them "Review 27 more", which is not what "complete" means.
 */
export const REVIEW_SESSION_CHUNK_SIZE = 20;

/**
 * Heap size at which the session pulls the next chunk out of the backlog.
 *
 * Refilling only once the heap is empty works, but it means the first card of
 * every new chunk is chosen and shown in the same tick it was added — and
 * useAudioPreloader watches the published queue to decide what to download, so
 * that card would be the one card in twenty asked to play audio it has never
 * seen. Refilling with a few cards still in hand gives the downloader that many
 * cards of lead time, which is the difference between a warm read and a silent
 * prompt waiting on the network.
 */
export const REVIEW_REFILL_LOW_WATER = 5;

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
