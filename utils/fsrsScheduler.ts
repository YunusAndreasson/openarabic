import { dateChrono, defineScheduler, State, type Grade } from 'ts-fsrs';
import {
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerStatsMiddleware,
} from 'ts-fsrs/middlewares';
import { computeDecayFactor, FSRS6Model, migrateFSRS6Parameters } from 'ts-fsrs/models/fsrs-6';
import { FSRS7_DEFAULT_WEIGHTS, FSRS7Model } from 'ts-fsrs/models/fsrs-7';

import { NEW_WORD_FSRS_MODEL, OPTIMIZED_FSRS_CONFIG, PLACEHOLDER_FSRS } from '@/constants/fsrs';
import type { FSRSModelName, FSRSWordUpdate } from '@/types/fsrs.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

/**
 * The app's two schedulers, and the one place a `study_words` row meets them.
 *
 * Why two: `study_words` holds only each word's current state; there is no review
 * log. FSRS-7's memory has a fast trace FSRS-6 never recorded, and it can only be
 * rebuilt from a complete review history, so a word already learned under FSRS-6
 * cannot move across without inventing it. Those words stay on FSRS-6. A word that
 * starts from nothing, new or reset, takes `NEW_WORD_FSRS_MODEL`, which is the one
 * switch and defaults to FSRS-6. The model travels with the state (`fsrs_model`,
 * written in the same update), so the same word is always graded and read by the same
 * model, in either position of the switch: a word already holding an FSRS-7 memory
 * keeps it, because FSRS-6 cannot read it.
 *
 * Built with `defineScheduler` and static imports, not `DefaultScheduler`: these
 * are created at module load, and its factory is async with dynamic imports.
 */
const MIDDLEWARE = [
  schedulerDesiredRetentionMiddleware,
  schedulerFuzzingMiddleware,
  schedulerStatsMiddleware,
  schedulerScheduledDaysMiddleware,
  schedulerLearningStepsMiddleware,
  schedulerMaximumIntervalMiddleware,
  schedulerMonotonicIntervalMiddleware,
] as const;

const fsrs6Definition = defineScheduler({ model: FSRS6Model, chrono: dateChrono }).use(
  ...MIDDLEWARE,
);
const fsrs7Definition = defineScheduler({ model: FSRS7Model, chrono: dateChrono }).use(
  ...MIDDLEWARE,
);

const FSRS6_WEIGHTS = migrateFSRS6Parameters();

const fsrs6Scheduler = fsrs6Definition.create({
  config: {
    ...OPTIMIZED_FSRS_CONFIG,
    weights: FSRS6_WEIGHTS,
    fractionalDays: false,
    numRelearningSteps: OPTIMIZED_FSRS_CONFIG.relearningSteps.length,
  },
});

const fsrs7Scheduler = fsrs7Definition.create({
  config: {
    ...OPTIMIZED_FSRS_CONFIG,
    weights: FSRS7_DEFAULT_WEIGHTS,
    fractionalDays: true,
  },
});

const FSRS6_DECAY_FACTOR = computeDecayFactor(FSRS6_WEIGHTS);

type WordState = Pick<
  StudyWord,
  | 'fsrs_due'
  | 'fsrs_stability'
  | 'fsrs_difficulty'
  | 'fsrs_scheduled_days'
  | 'fsrs_learning_steps'
  | 'fsrs_reps'
  | 'fsrs_lapses'
  | 'fsrs_state'
  | 'fsrs_last_review'
  | 'fsrs_model'
  | 'fsrs_stability_fast'
  | 'root_id'
>;

/**
 * Explicit null checks rather than truthy ones: `fsrs_reps` 0 and `fsrs_stability`
 * 0 are valid values that would fail a truthy test.
 */
function isUnlearned(word: WordState): boolean {
  return (
    word.fsrs_state == null ||
    word.fsrs_state === State.New ||
    (word.fsrs_reps == null && word.fsrs_stability == null && !word.fsrs_last_review)
  );
}

/** The fast trace of a word that really has an FSRS-7 memory, or null. */
function fsrs7Fast(word: WordState): number | null {
  if (word.fsrs_model !== 'FSRS-7' || isUnlearned(word)) return null;
  const fast = word.fsrs_stability_fast;
  return fast != null && Number.isFinite(fast) && fast > 0 ? fast : null;
}

function learnedCardFields(word: WordState) {
  const state = word.fsrs_state ?? State.New;
  return {
    cardId: word.root_id,
    // parseSupabaseTimestamp, not the raw `new Date(...)`: the constructor reads a
    // zone-less stamp as device-local while the rest of the app reads it as UTC,
    // and rejects Postgres' "+00" offset outright. Elapsed days has to mean one
    // thing app-wide. Same rule calculateRetrievability documents.
    dueAt: parseSupabaseTimestamp(word.fsrs_due) ?? new Date(),
    lastReviewAt: parseSupabaseTimestamp(word.fsrs_last_review),
    stability: word.fsrs_stability ?? 0,
    difficulty: word.fsrs_difficulty ?? PLACEHOLDER_FSRS.difficulty,
    state,
    scheduleStatus:
      state === State.Review
        ? ('review' as const)
        : state === State.New
          ? ('new' as const)
          : ('learning' as const),
    scheduledDays: word.fsrs_scheduled_days ?? 0,
    learningStep: word.fsrs_learning_steps ?? 0,
    reps: word.fsrs_reps ?? 0,
    lapses: word.fsrs_lapses ?? 0,
  };
}

interface GradedCard {
  dueAt: Date;
  lastReviewAt: Date | null;
  stability: number;
  stabilityFast?: number;
  difficulty: number;
  state: State;
  scheduledDays: number;
  learningStep: number;
  reps: number;
  lapses: number;
}

/**
 * A graded card as the `study_words` columns it is written back to.
 *
 * `fsrs_last_review` is the card's own review time rather than a second read of
 * the clock, so the stored review time and the schedule computed from it are the
 * same moment.
 */
function toWordUpdate(card: GradedCard, model: FSRSModelName): FSRSWordUpdate {
  // A review always stamps it; the type keeps it nullable because a NEW card has none.
  const lastReview = (card.lastReviewAt ?? new Date()).toISOString();
  return {
    fsrs_due: card.dueAt.toISOString(),
    fsrs_stability: card.stability,
    fsrs_stability_fast: card.stabilityFast ?? null,
    // Which review the fast trace belongs to. An older app version moves
    // `fsrs_last_review` and cannot move this, which is how the database tells its
    // grade from ours: the fast trace itself can legitimately stay equal on a review.
    fsrs_fast_reviewed_at: card.stabilityFast == null ? null : lastReview,
    fsrs_difficulty: card.difficulty,
    fsrs_scheduled_days: card.scheduledDays,
    fsrs_reps: card.reps,
    fsrs_learning_steps: card.learningStep,
    fsrs_lapses: card.lapses,
    fsrs_state: card.state,
    fsrs_model: model,
    fsrs_last_review: lastReview,
  };
}

/**
 * Which scheduler grades this word and the card to give it.
 *
 * A learned word marked FSRS-7 without a usable fast trace is inconsistent data
 * (an older app version reviewed it), and goes to FSRS-6, which its stored values
 * are valid for, rather than getting a fast trace made up for it.
 */
function route(word: WordState) {
  const dueAt = parseSupabaseTimestamp(word.fsrs_due) ?? new Date();
  if (isUnlearned(word)) {
    if (NEW_WORD_FSRS_MODEL === 'FSRS-7') {
      const card = fsrs7Scheduler.newCard({ now: dueAt, cardId: word.root_id });
      return { model: 'FSRS-7' as const, card };
    }
    const card = fsrs6Scheduler.newCard({ now: dueAt, cardId: word.root_id });
    return { model: 'FSRS-6' as const, card };
  }
  const fast = fsrs7Fast(word);
  if (fast !== null) {
    const card = fsrs7Definition.schema.card.parse({
      ...learnedCardFields(word),
      stabilityFast: fast,
    });
    return { model: 'FSRS-7' as const, card };
  }
  const card = fsrs6Definition.schema.card.parse(learnedCardFields(word));
  return { model: 'FSRS-6' as const, card };
}

/** Grade a word: the full column set to write, model included. Throws on invalid state. */
export function gradeWord(word: WordState, grade: Grade, now: Date): FSRSWordUpdate {
  const routed = route(word);
  if (routed.model === 'FSRS-7') {
    const { card } = fsrs7Scheduler.review({ card: routed.card, grade, now });
    return toWordUpdate(card, 'FSRS-7');
  }
  const { card } = fsrs6Scheduler.review({ card: routed.card, grade, now });
  return toWordUpdate(card, 'FSRS-6');
}

/**
 * The due date each grade would produce. Fuzz is seeded from the card and its rep
 * count, so this is exactly what `gradeWord` commits at the same instant.
 */
export function previewWordDueDates(word: WordState, now: Date): Record<Grade, Date> {
  const routed = route(word);
  const dues: Partial<Record<Grade, Date>> = {};
  if (routed.model === 'FSRS-7') {
    for (const { grade, card } of fsrs7Scheduler.preview({ card: routed.card, now })) {
      dues[grade] = card.dueAt;
    }
  } else {
    for (const { grade, card } of fsrs6Scheduler.preview({ card: routed.card, now })) {
      dues[grade] = card.dueAt;
    }
  }
  return dues as Record<Grade, Date>;
}

/**
 * Days until predicted recall falls to the retention target — what "holds for N
 * days" means.
 *
 * Under FSRS-6 that is stability by definition. Under FSRS-7 it is not: `stability`
 * is only the slow trace, and recall at t = stability is not the target. Reading
 * the column directly would state a different thing per model, so nothing outside
 * this file should treat `fsrs_stability` as days.
 *
 * Capped at the scheduling maximum under FSRS-7, whose raw interval has a very long
 * tail. An unlearned word returns its stored placeholder; callers gate on
 * `hasBeenPractised` where that matters.
 */
export function wordHoldDays(word: WordState): number {
  const fast = fsrs7Fast(word);
  if (fast === null) return word.fsrs_stability ?? 0;
  const interval = fsrs7Scheduler.model.nextInterval(
    {
      stability: word.fsrs_stability ?? 0,
      stabilityFast: fast,
      difficulty: word.fsrs_difficulty ?? PLACEHOLDER_FSRS.difficulty,
    },
    OPTIMIZED_FSRS_CONFIG.desiredRetention,
  );
  return Math.min(interval, OPTIMIZED_FSRS_CONFIG.maximumInterval);
}

/** Predicted recall `elapsedDays` after the last review, under this word's own model. */
export function wordRetrievability(word: WordState, elapsedDays: number): number {
  const fast = fsrs7Fast(word);
  const stability = word.fsrs_stability ?? 0;
  const difficulty = word.fsrs_difficulty ?? PLACEHOLDER_FSRS.difficulty;
  if (fast === null) {
    return fsrs6Scheduler.model.forgettingCurve({ stability, difficulty }, elapsedDays);
  }
  return fsrs7Scheduler.model.forgettingCurve(
    { stability, stabilityFast: fast, difficulty },
    elapsedDays,
  );
}

/**
 * Days after the last review until recall decays to `threshold`, under this word's
 * own model. Null when the question is meaningless: no memory, or a threshold
 * outside (0, 1).
 *
 * FSRS-6 is computed rather than taken from `model.nextInterval`, which rounds to
 * whole days and would move a notification by up to half a day.
 */
export function wordDaysUntilRetrievability(word: WordState, threshold: number): number | null {
  const stability = word.fsrs_stability ?? 0;
  if (stability <= 0 || threshold <= 0 || threshold >= 1) return null;

  const fast = fsrs7Fast(word);
  if (fast === null) {
    const { decay, factor } = FSRS6_DECAY_FACTOR;
    return (stability * (Math.pow(threshold, 1 / decay) - 1)) / factor;
  }
  return fsrs7Scheduler.model.nextInterval(
    {
      stability,
      stabilityFast: fast,
      difficulty: word.fsrs_difficulty ?? PLACEHOLDER_FSRS.difficulty,
    },
    threshold,
  );
}
