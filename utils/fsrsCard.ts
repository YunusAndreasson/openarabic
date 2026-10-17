import { createEmptyCard, State, type Card } from 'ts-fsrs';

import { DEFAULT_FSRS_DIFFICULTY } from '@/constants/fsrs';
import type { StudyWord } from '@/types/vocabulary.types';
import { parseSupabaseTimestamp } from '@/utils/dateTimeUtils';

/**
 * A `study_words` row as a ts-fsrs `Card`.
 *
 * Lifted out of `useFSRS` so the review engine and the read-only surfaces that
 * *preview* a schedule (the word detail screen's "recall it again" figure) build
 * the card the same way. A preview that disagreed with what grading actually
 * does would be worse than showing nothing.
 */
export function convertToFSRSCard(word: StudyWord): Card {
  // Explicit null checks rather than truthy ones: fsrs_reps 0 and
  // fsrs_stability 0 are valid values that would fail a truthy test.
  if (
    word.fsrs_state === State.New ||
    (word.fsrs_reps == null && word.fsrs_stability == null && !word.fsrs_last_review)
  ) {
    const emptyCard = createEmptyCard(new Date());
    return {
      ...emptyCard,
      due: parseSupabaseTimestamp(word.fsrs_due) ?? new Date(),
    };
  }

  return {
    due: parseSupabaseTimestamp(word.fsrs_due) ?? new Date(),
    stability: word.fsrs_stability ?? 0,
    difficulty: word.fsrs_difficulty ?? DEFAULT_FSRS_DIFFICULTY,
    // elapsed_days is recomputed by fsrs.next()/fsrs.repeat() from last_review +
    // now; what we pass here is overwritten either way.
    // deprecated-api-allowed: ts-fsrs 5's Card still requires it; drop at ts-fsrs 6.
    elapsed_days: 0,
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
  };
}
