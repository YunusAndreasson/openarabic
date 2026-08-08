import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { FSRSWordUpdate, GetFSRSWordsOptions } from '@/types/fsrs.types';
import type { StudyWord, StudyWordIntent } from '@/types/vocabulary.types';
import { createBulkFSRSEntries, createInitialFSRSEntry } from '@/utils/fsrsInitializers';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeAuthenticatedQuery, executeQuery } from '@/utils/supabaseHelpers';
import { mapToStudyWord } from '@/utils/typeMappers';

const errorConfig = {
  load: createServiceErrorConfig('study_words_fsrs', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_STUDY_WORDS,
    showToast: false,
  }),
  update: createServiceErrorConfig('word_and_review', 'update', {
    toastMessage: STRINGS.FAILED_TO_UPDATE_WORD_AND_REVIEW,
    showToast: false,
  }),
  toggleCheck: createServiceErrorConfig('study_word', 'check', {
    toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
    analyticsEventName: 'Toggle_Study_Word_Check_Error',
    showToast: false,
  }),
  toggleDelete: createServiceErrorConfig('study_word', 'delete', {
    toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
    analyticsEventName: 'Toggle_Study_Word_Delete_Error',
    showToast: false,
  }),
  toggleInsert: createServiceErrorConfig('study_word', 'add', {
    toastMessage: STRINGS.FAILED_TO_TOGGLE_STUDY_WORD,
    analyticsEventName: 'Toggle_Study_Word_Insert_Error',
    showToast: false,
  }),
  allRoots: createServiceErrorConfig('roots', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_ALL_ROOTS,
    showToast: false,
  }),
  addMultipleCheck: createServiceErrorConfig('common_words', 'check', {
    toastMessage: STRINGS.FAILED_TO_ADD_COMMON_WORDS,
    analyticsEventName: 'Add_Multiple_Roots_Check_Error',
    showToast: false,
  }),
  addMultipleInsert: createServiceErrorConfig('common_words', 'add', {
    toastMessage: STRINGS.FAILED_TO_ADD_COMMON_WORDS,
    analyticsEventName: 'Add_Multiple_Roots_Insert_Error',
    showToast: false,
  }),
  deleteAll: createServiceErrorConfig('study_words', 'delete', {
    toastMessage: STRINGS.FAILED_TO_DELETE_STUDY_WORDS,
    analyticsEventName: 'Delete_All_Study_Words_Error',
    showToast: false,
  }),
};

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
          root:roots (id, letters, meaning, audio_url, audio_url_en)
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

    // Session cooldown: after finishing a session, don't immediately re-serve
    // the words that session covered.
    //
    // It applies ONLY to Review-state words (2). Learning (1) and Relearning (3)
    // are exempt, and that exemption is the whole point: those are the words the
    // learner has NOT got right yet, and FSRS deliberately schedules them minutes
    // out (learning_steps 1m/10m, relearning_steps 5m/10m). Cooling them by
    // `fsrs_last_review` hid exactly the words that most needed practising —
    // measured on a real account 2026-08-08: 5 words due 21 seconds after the
    // session ended, all 5 suppressed, and the learner shown "nothing to
    // practice" while nothing had actually been learned.
    //
    // Nothing is lost by exempting them, because a word that WAS answered
    // correctly leaves the short steps for a multi-day interval and is already
    // excluded by the `onlyDue` filter above. The cooldown keeps its job (a
    // finished session stays finished) and stops doing the other one.
    if (options.sessionCooldownHours && options.sessionCooldownHours > 0) {
      const cooldownTime = new Date(Date.now() - options.sessionCooldownHours * 60 * 60 * 1000);
      filteredQuery = filteredQuery.or(
        `fsrs_state.in.(0,1,3),fsrs_last_review.is.null,fsrs_last_review.lt.${cooldownTime.toISOString()}`,
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
      ...errorConfig.load,
      analyticsProperties: {
        ...(options.onlyDue !== undefined && { onlyDue: options.onlyDue }),
        ...(options.forStats !== undefined && { forStats: options.forStats }),
        ...(options.category !== undefined && { category: options.category }),
      },
    });

    // Type-safe mapping from database rows to StudyWord interface
    return (data || []).map(row => mapToStudyWord(row, userId));
  },

  // Update FSRS parameters for a study word
  async updateWordAndReview(
    userId: string,
    rootId: RootId,
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
        ...errorConfig.update,
        analyticsProperties: { rootId },
      },
    );

    return Boolean(data && data.length > 0);
  },

  // Toggle FSRS study for roots
  /**
   * Toggle a root in the study list. When `intent` is given, the operation is
   * idempotent in that direction: 'add' never deletes and 'remove' never
   * inserts, even when the caller's view of the study list was stale — the
   * user's tap can then never silently invert into the opposite action.
   * Without `intent`, direction falls back to server-side existence (legacy
   * toggle). Returns whether the root is in the study list afterwards.
   */
  async toggleFSRSStudyRoot(
    userId: string,
    rootId: RootId,
    intent?: StudyWordIntent,
  ): Promise<boolean> {
    // Check if a study entry already exists for this root
    // Using maybeSingle() returns null instead of throwing PGRST116 error
    const existing = await executeAuthenticatedQuery(
      userId,
      () =>
        supabase
          .from('study_words')
          .select('root_id')
          .eq('user_id', userId)
          .eq('root_id', rootId)
          .maybeSingle(),
      {
        ...errorConfig.toggleCheck,
        analyticsProperties: { rootId },
      },
    );

    if (intent === 'add' && existing) {
      return true; // Already saved — the add is a no-op, not a delete
    }

    if (existing || intent === 'remove') {
      if (existing) {
        await executeAuthenticatedQuery(
          userId,
          () => supabase.from('study_words').delete().eq('user_id', userId).eq('root_id', rootId),
          {
            ...errorConfig.toggleDelete,
            analyticsProperties: { rootId },
          },
        );
      }
      return false;
    }

    // Create a new FSRS card for the root with proper initial values
    const newEntry = createInitialFSRSEntry(userId, rootId);

    await executeAuthenticatedQuery(userId, () => supabase.from('study_words').insert(newEntry), {
      ...errorConfig.toggleInsert,
      analyticsProperties: { rootId },
    });

    return true;
  },

  /**
   * Get common beginner-friendly roots from the database.
   * Returns roots that are foundational for Arabic learning.
   */
  async getCommonRoots(limit: number = 10): Promise<Tables<'roots'>[]> {
    // Query roots ordered by ID (foundational words have lower IDs)
    // This provides reliable, high-quality starter vocabulary
    const data = await executeQuery(
      () =>
        supabase
          .from('roots')
          .select('id, letters, meaning, audio_url, audio_url_en')
          .order('id', { ascending: true })
          .limit(limit),
      errorConfig.allRoots,
    );

    return data ?? [];
  },

  /**
   * Add multiple roots to the user's study list at once.
   * Skips roots that are already in the study list.
   */
  async addMultipleRoots(userId: string, rootIds: RootId[]): Promise<number> {
    if (rootIds.length === 0) return 0;

    // Get existing study words to avoid duplicates
    const existingData = await executeAuthenticatedQuery(
      userId,
      () =>
        supabase.from('study_words').select('root_id').eq('user_id', userId).in('root_id', rootIds),
      errorConfig.addMultipleCheck,
    );

    const existingRootIds = new Set((existingData ?? []).map(row => row.root_id));
    const newRootIds = rootIds.filter(id => !existingRootIds.has(id));

    if (newRootIds.length === 0) return 0;

    const entries = createBulkFSRSEntries(userId, newRootIds);

    await executeAuthenticatedQuery(userId, () => supabase.from('study_words').insert(entries), {
      ...errorConfig.addMultipleInsert,
    });

    return newRootIds.length;
  },
};
