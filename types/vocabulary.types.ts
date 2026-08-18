import type { State } from 'ts-fsrs';

import type { RootId, UserId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';

/**
 * Which grammatical role a painted run of Arabic belongs to.
 *
 * Named so the analyser that PRODUCES these runs can be typed with the same
 * closed set the renderer consumes. It was a bare `string` on the producing
 * side, so both consumers had to assert it back into the union — an assertion
 * that would have happily carried a typo straight into a colour lookup.
 */
export type ArabicSegmentType = 'prefix' | 'infix' | 'suffix' | 'diacritic' | 'root';

/**
 * Pre-computed color segment for Arabic word rendering
 */
export interface ColoredSegment {
  text: string;
  color: string;
  type: ArabicSegmentType;
}

/**
 * Enhanced sentence word type with root and word type information
 * Used in article views, word details, and vocabulary components
 */
export interface SentenceWord extends Omit<Tables<'sentence_words'>, 'root_id'> {
  /** Root ID (branded for type safety) */
  root_id: RootId;
  root: Tables<'roots'> | null;
  word_type: Tables<'word_types'> | null;
  sentence?: Tables<'article_sentences'> | null;
  /** Pre-computed colored segments for performance (computed once at load time) */
  coloredSegments?: ColoredSegment[];
}

/**
 * Extended StudyWord type that combines database fields with runtime session data
 * Used across vocabulary-related components, screens, and the spaced repetition system
 *
 * Extends Tables<'study_words'> to prevent type drift when database schema changes.
 * Only overrides IDs with branded types for type safety.
 */
export interface StudyWord extends Omit<
  Tables<'study_words'>,
  'root_id' | 'user_id' | 'fsrs_state'
> {
  /** Root ID (branded for type safety) */
  root_id: RootId;
  /** User ID (branded for type safety) */
  user_id: UserId;
  /**
   * Scheduler state, narrowed from the schema's bare `number` to ts-fsrs' own
   * `State` (0 New, 1 Learning, 2 Review, 3 Relearning).
   *
   * The column is a plain integer, so nothing stopped a comparison against a
   * value that is not a state — and this field is compared against bare
   * literals in eight production files (`=== 0` for new, `.in.(1,3)` for the
   * short steps, `=== 2` for graduated). Narrowed, `=== 4` and a transposed
   * `=== 5` are compile errors, while every existing `=== 0..3` still reads
   * exactly as before. Taken from ts-fsrs rather than re-declared so the app's
   * idea of a state cannot drift from the library that assigns it.
   *
   * Still nullable: rows written before the FSRS migration can hold NULL.
   */
  fsrs_state: State | null;
  /** Optional root relation loaded from database */
  root?: Tables<'roots'> | null;
}

/**
 * Explicit direction for a study-list mutation. Carried from the button the
 * user actually saw down to the service so a stale cache can never invert a
 * save into a delete (or vice versa).
 */
export type StudyWordIntent = 'add' | 'remove';
