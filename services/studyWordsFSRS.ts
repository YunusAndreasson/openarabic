import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { RootId, UserId } from '@/types/branded.types';
import type { TablesInsert } from '@/types/database.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { executeAuthenticatedQuery } from '@/utils/supabaseHelpers';

// Interface for FSRS-specific update fields - matches RPC function requirements
interface FSRSWordUpdate {
  fsrs_due: string;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_learning_steps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_last_review: string; // Always provided during updates
}

// Define options for fetching FSRS words
interface GetFSRSWordsOptions {
  onlyDue?: boolean;
  forStats?: boolean;
  limit?: number;
  sortByDifficultyAndStability?: boolean;
  reviewedOnly?: boolean;
  /**
   * Session cooldown: Exclude words reviewed within this many hours.
   * Useful to prevent words from appearing immediately after a study session.
   * Default: 0 (no cooldown), common values: 1-24 hours
   */
  sessionCooldownHours?: number;
  /**
   * Server-side filter for vocabulary category.
   * - "mastered": fsrs_state = 2 (Review) and fsrs_stability >= 5
   * - "learning": fsrs_state in (0,1,3) or (fsrs_state = 2 and fsrs_stability < 5)
   */
  category?: 'learning' | 'mastered';
}

export const studyWordsFSRSService = {
  // Fetch study words with FSRS parameters
  async getFSRSWords(userId: string, options: GetFSRSWordsOptions = {}): Promise<StudyWord[]> {
    // Build the query step by step with proper typing
    const query = supabase.from('study_words');

    // Define the selection based on options
    let selectQuery;
    if (options.forStats) {
      // For stats, we only need core fields, not all the relationships
      selectQuery = query.select(
        `
          fsrs_due,
          fsrs_stability,
          fsrs_difficulty,
          fsrs_scheduled_days,
          fsrs_reps,
          fsrs_learning_steps,
          fsrs_lapses,
          fsrs_state,
          fsrs_last_review,
          root_id,
          created_at`,
      );
    } else {
      // Get full data with relationships - root is the only relation we need
      const columns = `
          root_id,
          user_id,
          fsrs_due,
          fsrs_stability,
          fsrs_difficulty,
          fsrs_scheduled_days,
          fsrs_reps,
          fsrs_learning_steps,
          fsrs_lapses,
          fsrs_state,
          fsrs_last_review,
          created_at,
          root:roots (letters, meaning, audio_url, audio_url_en)
        `;
      selectQuery = query.select(columns);
    }

    // Add filters after the select
    let filteredQuery = selectQuery.eq('user_id', userId);

    if (options.reviewedOnly) {
      filteredQuery = filteredQuery.not('fsrs_last_review', 'is', null).gt('fsrs_reps', 0);
    }

    // Add due date filter if requested
    if (options.onlyDue) {
      const now = new Date().toISOString();
      // Include both:
      // 1. Words with due date <= now
      // 2. New words (state 0) which are always due for their first review
      filteredQuery = filteredQuery.or(`fsrs_due.lte.${now},fsrs_state.eq.0`);
    }

    // Session cooldown: Exclude words reviewed within the specified hours
    // Apply cooldown alongside due filter so recently reviewed words are excluded consistently
    if (options.sessionCooldownHours && options.sessionCooldownHours > 0) {
      const cooldownTime = new Date(Date.now() - options.sessionCooldownHours * 60 * 60 * 1000);
      filteredQuery = filteredQuery.or(
        `fsrs_state.eq.0,fsrs_last_review.is.null,fsrs_last_review.lt.${cooldownTime.toISOString()}`,
      );
    }

    // Apply category filters server-side to reduce payload
    if (options.category === 'mastered') {
      filteredQuery = filteredQuery.eq('fsrs_state', 2).gte('fsrs_stability', 5);
    } else if (options.category === 'learning') {
      // State 0 (New) words are due for first review, not learning
      // Only states 1, 3, or state 2 with low stability are learning
      filteredQuery = filteredQuery.or(
        'fsrs_state.in.(1,3),and(fsrs_state.eq.2,fsrs_stability.lt.5)',
      );
    }

    if (options.sortByDifficultyAndStability) {
      filteredQuery = filteredQuery
        .order('fsrs_difficulty', { ascending: false })
        .order('fsrs_stability', { ascending: true })
        .order('fsrs_last_review', { ascending: false });
    } else {
      // Order by due date
      filteredQuery = filteredQuery.order('fsrs_due', { ascending: true });
    }

    // Apply limit if specified
    if (options.limit) {
      filteredQuery = filteredQuery.limit(options.limit);
    }

    const data = await executeAuthenticatedQuery(userId, () => filteredQuery, {
      toastMessage: STRINGS.FAILED_TO_LOAD_STUDY_WORDS,
      analyticsEventName: 'Study_Words_FSRS_Load_Error',
      analyticsProperties: {
        ...(options.onlyDue !== undefined && { onlyDue: options.onlyDue }),
        ...(options.forStats !== undefined && { forStats: options.forStats }),
        ...(options.category !== undefined && { category: options.category }),
      },
      showToast: false, // Silent for vocabulary loading
    });

    // Type-safe mapping from database rows to StudyWord interface
    return (data || []).map(
      (row): StudyWord => ({
        root_id: row.root_id as RootId,
        user_id: ('user_id' in row ? row.user_id : userId) as UserId, // Use passed userId for stats queries
        fsrs_due: row.fsrs_due,
        fsrs_stability: row.fsrs_stability,
        fsrs_difficulty: row.fsrs_difficulty,
        fsrs_scheduled_days: row.fsrs_scheduled_days,
        fsrs_reps: row.fsrs_reps,
        fsrs_learning_steps: row.fsrs_learning_steps,
        fsrs_lapses: row.fsrs_lapses,
        fsrs_state: row.fsrs_state,
        fsrs_last_review: row.fsrs_last_review, // Always exists per database schema
        created_at: row.created_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        root: 'root' in row && row.root ? { ...(row.root as any), id: row.root_id } : undefined, // Add missing id field
      }),
    );
  },

  // Update FSRS parameters for a study word
  async updateWordAndReview(
    userId: string,
    rootId: number,
    update: FSRSWordUpdate,
  ): Promise<boolean> {
    // Direct UPDATE - simpler than RPC, no database migration needed
    // RLS policies ensure user can only update their own words
    const data = await executeAuthenticatedQuery(
      userId,
      () =>
        supabase
          .from('study_words')
          .update({
            fsrs_due: update.fsrs_due,
            fsrs_stability: update.fsrs_stability,
            fsrs_difficulty: update.fsrs_difficulty,
            fsrs_scheduled_days: update.fsrs_scheduled_days,
            fsrs_learning_steps: update.fsrs_learning_steps,
            fsrs_reps: update.fsrs_reps,
            fsrs_lapses: update.fsrs_lapses,
            fsrs_state: update.fsrs_state,
            fsrs_last_review: update.fsrs_last_review,
          })
          .eq('user_id', userId)
          .eq('root_id', rootId)
          .select(),
      {
        toastMessage: STRINGS.FAILED_TO_UPDATE_WORD_AND_REVIEW,
        analyticsEventName: 'Update_Word_And_Review_Error',
        analyticsProperties: { rootId },
        showToast: false,
      },
    );

    return Boolean(data && data.length > 0);
  },

  // Toggle FSRS study for roots
  async toggleFSRSStudyRoot(userId: string, rootId: number): Promise<boolean> {
    // Check if a study entry already exists for this root
    // Note: PGRST116 is "not found" error which is expected behavior here
    let existing;
    try {
      existing = await executeAuthenticatedQuery(
        userId,
        () =>
          supabase
            .from('study_words')
            .select('root_id')
            .eq('user_id', userId)
            .eq('root_id', rootId)
            .single(),
        {
          toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
          analyticsEventName: 'Toggle_Study_Word_Check_Error',
          analyticsProperties: { rootId },
          showToast: false,
        },
      );
    } catch (error) {
      // PGRST116 = "not found" - this is expected, word doesn't exist yet
      if (error && typeof error === 'object' && 'code' in error && error.code === 'PGRST116') {
        existing = null;
      } else {
        throw error;
      }
    }

    if (existing) {
      // Remove existing root study entry
      await executeAuthenticatedQuery(
        userId,
        () => supabase.from('study_words').delete().eq('user_id', userId).eq('root_id', rootId),
        {
          toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
          analyticsEventName: 'Toggle_Study_Word_Delete_Error',
          analyticsProperties: { rootId },
          showToast: false,
        },
      );
      return false;
    }

    // Create a new FSRS card for the root with proper initial values
    const now = new Date();

    // Use FSRS default values that comply with database constraints
    const INITIAL_FSRS_DIFFICULTY = 6.5; // Must be between 1 and 10, use standard FSRS default
    const INITIAL_STABILITY = 0.4; // Default FSRS initial stability

    // Create entry matching the actual database schema columns
    // Note: fsrs_last_review has default "now()" in database, but we set it explicitly for consistency
    const newEntry: TablesInsert<'study_words'> = {
      user_id: userId,
      root_id: rootId,
      created_at: now.toISOString(),
      fsrs_due: now.toISOString(), // Due immediately for new words
      fsrs_stability: INITIAL_STABILITY,
      fsrs_difficulty: INITIAL_FSRS_DIFFICULTY,
      fsrs_scheduled_days: 0,
      fsrs_learning_steps: 0,
      fsrs_reps: 0,
      fsrs_lapses: 0,
      fsrs_state: 0, // New state - will show as "due" for first review
      fsrs_last_review: now.toISOString(), // Explicitly set to ensure database constraint compliance
    };

    await executeAuthenticatedQuery(userId, () => supabase.from('study_words').insert(newEntry), {
      toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
      analyticsEventName: 'Toggle_Study_Word_Insert_Error',
      analyticsProperties: { rootId },
      showToast: false,
    });

    return true;
  },
};
