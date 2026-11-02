import type { State } from 'ts-fsrs';

import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { IntervalLabels, WordConfidence } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * Every `study_words` column the scheduler owns, read off the generated schema
 * rather than listed by hand.
 *
 * The hand-written list was a ninth copy of the column names that had to be
 * kept in step with the table by memory alone: a renamed or added `fsrs_*`
 * column left it stale and still compiling, writing a row missing a field the
 * scheduler needs. Derived, the same change is a build error at every builder.
 */
export type FSRSColumn = Extract<keyof Tables<'study_words'>, `fsrs_${string}`>;

/**
 * The FSRS field set as WRITTEN back after a grade — the same columns as the
 * table, minus its nullability.
 *
 * Reads tolerate NULL (pre-migration rows); a write never produces one, because
 * every value comes from a ts-fsrs `Card`. Saying so in the type is what lets
 * `createResetFSRSUpdate` and the grade mutation be checked for completeness
 * instead of each hoping the other filled the same fields. `fsrs_stability_fast` and
 * `fsrs_fast_reviewed_at` stay nullable on a write: only a graded FSRS-7 memory has them.
 */
export type FSRSWordUpdate = {
  [K in FSRSColumn]: K extends 'fsrs_state'
    ? State
    : K extends 'fsrs_model'
      ? FSRSModelName
      : K extends 'fsrs_stability_fast' | 'fsrs_fast_reviewed_at'
        ? Tables<'study_words'>[K]
        : NonNullable<Tables<'study_words'>[K]>;
};

/**
 * The model a word's stored memory belongs to. A word learned under FSRS-6 stays
 * there, because there is no review log to rebuild its FSRS-7 state from; see
 * `utils/fsrsScheduler.ts`.
 */
export type FSRSModelName = 'FSRS-6' | 'FSRS-7';

/**
 * Options for fetching FSRS words from the database
 */
export interface GetFSRSWordsOptions {
  onlyDue?: boolean;
  forStats?: boolean;
  limit?: number;
  /**
   * Session cooldown: Exclude words reviewed within this many hours.
   * Useful to prevent words from appearing immediately after a study session.
   * Default: 0 (no cooldown), common values: 1-24 hours
   */
  sessionCooldownHours?: number;
}

export interface UseFSRSOptions {
  userId: string | undefined;
  onComplete?: () => void;
  /**
   * Session cooldown: Exclude words reviewed within this many hours.
   * Prevents words from appearing immediately after a study session.
   * Default: 1 hour
   */
  sessionCooldownHours?: number;
}

export type FSRSUpdateResult =
  | { status: 'committed'; horizonDays: number }
  | {
      status: 'rejected';
      reason: 'unavailable' | 'busy' | 'mismatched-root' | 'scheduler-error';
    };

export interface UseFSRSResult {
  currentWord: StudyWord | null;
  wordQueue: StudyWord[];
  /**
   * Immutable working-set batches admitted during this session. Enrichment
   * queries use these instead of the shrinking/reordered live queue so every
   * batch is fetched once and drilled cards retain their cached context.
   */
  enrichmentBatches: readonly (readonly StudyWord[])[];
  /**
   * Every word due in this session, fixed at session start — the working chunk
   * plus the backlog behind it. For consumers that need the session's whole
   * vocabulary once, rather than a heap that refills and reorders.
   */
  sessionWords: readonly StudyWord[];
  isLoading: boolean;
  /** The due query resolved successfully, but there was nothing to review. */
  isEmpty: boolean;
  isComplete: boolean;
  /**
   * 0–100 across the WHOLE backlog the session started with, not the current
   * working chunk — the session refills itself until everything is done.
   */
  progress: number;
  /**
   * Grade the current card and advance. A committed result carries the card's
   * new stability; a rejected result leaves the queue and persistence untouched
   * and names why the grade could not be accepted. The FSRS write itself is
   * fired in the background; see `flushPendingWrites`.
   */
  updateWord: (rootId: RootId, confidence: WordConfidence) => Promise<FSRSUpdateResult>;
  /**
   * Per-grade interval preview ("10m"/"4d") for a card, one label per grade.
   * Drives the grade bar's sub-labels. Reuses the live ts-fsrs scheduler.
   */
  previewIntervals: (word: StudyWord) => IntervalLabels | null;
  invalidateQueries: () => void;
  resetQueue: () => void;
  /**
   * Resolves once every backgrounded FSRS write has settled. `updateWord`
   * persists off the critical path so the card advances immediately, so
   * anything that reads the server's view (a refetch after invalidation) must
   * await this first or it can race a write still in flight.
   */
  flushPendingWrites: () => Promise<void>;
}
