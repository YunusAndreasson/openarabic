import { createEmptyCard, State, type Card } from 'ts-fsrs';

import { PLACEHOLDER_FSRS } from '@/constants/fsrs';
import type { FSRSWordUpdate } from '@/types/fsrs.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

/**
 * A `study_words` row as a ts-fsrs `Card`.
 *
 * Lifted out of `useFSRS` so the review engine and the read-only surfaces that
 * *preview* a schedule (the word detail screen's "recall it again" figure) build
 * the card the same way. A preview that disagreed with what grading actually
 * does would be worse than showing nothing.
 *
 * Built on `createEmptyCard`, overriding the fields the row stores, so the
 * fields it does not — ts-fsrs 5's deprecated `elapsed_days`, which
 * `fsrs.next()`/`fsrs.repeat()` recompute from `last_review` anyway — keep the
 * library's own defaults, and a ts-fsrs major that drops one needs no change
 * here.
 */
export function convertToFSRSCard(word: StudyWord): Card {
  const due = parseSupabaseTimestamp(word.fsrs_due) ?? new Date();

  // Explicit null checks rather than truthy ones: fsrs_reps 0 and
  // fsrs_stability 0 are valid values that would fail a truthy test.
  if (
    word.fsrs_state === State.New ||
    (word.fsrs_reps == null && word.fsrs_stability == null && !word.fsrs_last_review)
  ) {
    return createEmptyCard(due);
  }

  return createEmptyCard(due, emptyCard => ({
    ...emptyCard,
    stability: word.fsrs_stability ?? 0,
    difficulty: word.fsrs_difficulty ?? PLACEHOLDER_FSRS.difficulty,
    scheduled_days: word.fsrs_scheduled_days ?? 0,
    learning_steps: word.fsrs_learning_steps ?? 0,
    reps: word.fsrs_reps ?? 0,
    lapses: word.fsrs_lapses ?? 0,
    state: word.fsrs_state ?? State.New,
    // parseSupabaseTimestamp, not the raw `new Date(...)` this used to call: the
    // constructor reads a zone-less stamp as device-local while the rest of the
    // app reads it as UTC, and rejects Postgres' "+00" offset outright. Both
    // agree on an offset-bearing stamp, so this only ever turns a wrong or
    // invalid date into the right one — and elapsed days has to mean one thing
    // app-wide. Same rule calculateRetrievability documents.
    last_review: parseSupabaseTimestamp(word.fsrs_last_review) ?? undefined,
  }));
}

/**
 * A graded `Card` as the `study_words` columns it is written back to.
 *
 * `fsrs_last_review` is the card's own `last_review` — the instant `fsrs.next()`
 * graded it — rather than a second read of the clock, so the stored review time
 * and the schedule computed from it are the same moment.
 */
export function toFSRSWordUpdate(card: Card): FSRSWordUpdate {
  return {
    fsrs_due: card.due.toISOString(),
    fsrs_stability: card.stability,
    fsrs_difficulty: card.difficulty,
    fsrs_scheduled_days: card.scheduled_days,
    fsrs_reps: card.reps,
    fsrs_learning_steps: card.learning_steps,
    fsrs_lapses: card.lapses,
    fsrs_state: card.state,
    // `next()` always stamps `last_review`; the type keeps it optional because
    // a NEW card has none.
    fsrs_last_review: (card.last_review ?? new Date()).toISOString(),
  };
}
