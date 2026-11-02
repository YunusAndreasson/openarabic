import { State } from 'ts-fsrs';

import { NEW_WORD_FSRS_MODEL, PLACEHOLDER_FSRS } from '@/constants/fsrs';
import type { TablesInsert } from '@/types/database.types';
import type { FSRSWordUpdate } from '@/types/fsrs.types';

// FSRS default values that comply with database constraints
const INITIAL_FSRS_SCHEDULED_DAYS = 0;
const INITIAL_FSRS_LEARNING_STEPS = 0;
const INITIAL_FSRS_REPS = 0;
const INITIAL_FSRS_LAPSES = 0;

/**
 * Canonical "new card" FSRS field set, typed as FSRSWordUpdate (non-null).
 *
 * Single source of truth for the values that mark a study word as brand new —
 * shared by the initial-entry builders (insert) and by the reset-progress flow
 * (update), so a "reset" word is indistinguishable from a freshly added one.
 *
 * @param now - timestamp to stamp `fsrs_due` / `fsrs_last_review` with
 */
export function createResetFSRSUpdate(now: Date = new Date()): FSRSWordUpdate {
  const iso = now.toISOString();

  return {
    fsrs_due: iso, // Due immediately, like a new word
    fsrs_stability: PLACEHOLDER_FSRS.stability,
    fsrs_stability_fast: null,
    fsrs_fast_reviewed_at: null,
    // Starting from nothing is the one way a word can change model.
    fsrs_model: NEW_WORD_FSRS_MODEL,
    fsrs_difficulty: PLACEHOLDER_FSRS.difficulty,
    fsrs_scheduled_days: INITIAL_FSRS_SCHEDULED_DAYS,
    fsrs_learning_steps: INITIAL_FSRS_LEARNING_STEPS,
    fsrs_reps: INITIAL_FSRS_REPS,
    fsrs_lapses: INITIAL_FSRS_LAPSES,
    // New — shows as "due" for its first review.
    fsrs_state: State.New,
    fsrs_last_review: iso, // Explicitly set to ensure database constraint compliance
  };
}

/**
 * Creates an initial FSRS entry for a single root with proper default values.
 * Used when adding a word to the study list for the first time.
 *
 * @param userId - User ID who owns the study word
 * @param rootId - Root ID to create study entry for
 * @returns TablesInsert object ready for database insertion
 */
export function createInitialFSRSEntry(
  userId: string,
  rootId: number,
): TablesInsert<'study_words'> {
  const now = new Date();

  return {
    user_id: userId,
    root_id: rootId,
    created_at: now.toISOString(),
    ...createResetFSRSUpdate(now),
  };
}

/**
 * Creates initial FSRS entries for multiple roots at once.
 * All entries share the same creation timestamp for consistency.
 *
 * @param userId - User ID who owns the study words
 * @param rootIds - Array of root IDs to create study entries for
 * @returns Array of TablesInsert objects ready for bulk insertion
 */
export function createBulkFSRSEntries(
  userId: string,
  rootIds: number[],
): TablesInsert<'study_words'>[] {
  const now = new Date();
  const resetFields = createResetFSRSUpdate(now);

  return rootIds.map(rootId => ({
    user_id: userId,
    root_id: rootId,
    created_at: now.toISOString(),
    ...resetFields,
  }));
}
