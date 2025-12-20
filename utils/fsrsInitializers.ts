import type { TablesInsert } from '@/types/database.types';

// FSRS default values that comply with database constraints
const INITIAL_FSRS_DIFFICULTY = 6.5; // Must be between 1 and 10, use standard FSRS default
const INITIAL_FSRS_STABILITY = 0.4; // Default FSRS initial stability
const INITIAL_FSRS_SCHEDULED_DAYS = 0;
const INITIAL_FSRS_LEARNING_STEPS = 0;
const INITIAL_FSRS_REPS = 0;
const INITIAL_FSRS_LAPSES = 0;
const INITIAL_FSRS_STATE = 0; // New state - will show as "due" for first review

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
    fsrs_due: now.toISOString(), // Due immediately for new words
    fsrs_stability: INITIAL_FSRS_STABILITY,
    fsrs_difficulty: INITIAL_FSRS_DIFFICULTY,
    fsrs_scheduled_days: INITIAL_FSRS_SCHEDULED_DAYS,
    fsrs_learning_steps: INITIAL_FSRS_LEARNING_STEPS,
    fsrs_reps: INITIAL_FSRS_REPS,
    fsrs_lapses: INITIAL_FSRS_LAPSES,
    fsrs_state: INITIAL_FSRS_STATE,
    fsrs_last_review: now.toISOString(), // Explicitly set to ensure database constraint compliance
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

  return rootIds.map(rootId => ({
    user_id: userId,
    root_id: rootId,
    created_at: now.toISOString(),
    fsrs_due: now.toISOString(),
    fsrs_stability: INITIAL_FSRS_STABILITY,
    fsrs_difficulty: INITIAL_FSRS_DIFFICULTY,
    fsrs_scheduled_days: INITIAL_FSRS_SCHEDULED_DAYS,
    fsrs_learning_steps: INITIAL_FSRS_LEARNING_STEPS,
    fsrs_reps: INITIAL_FSRS_REPS,
    fsrs_lapses: INITIAL_FSRS_LAPSES,
    fsrs_state: INITIAL_FSRS_STATE,
    fsrs_last_review: now.toISOString(),
  }));
}
