import type { Rating } from 'ts-fsrs';

import type { TablesInsert, TablesUpdate } from '@/types/database.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

import { checkAuthentication, supabase } from './supabase';

// Interface for FSRS-specific update fields
interface FSRSWordUpdate {
  fsrs_due: string;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_elapsed_days: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_learning_steps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_last_review: string; // Keep as non-null for RPC function compatibility
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
    // Validate authentication and user ID
    await checkAuthentication(userId);

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
          fsrs_elapsed_days,
          fsrs_scheduled_days,
          fsrs_reps,
          fsrs_learning_steps,
          fsrs_lapses,
          fsrs_state,
          fsrs_last_review,
          root_id,
          created_at`
      );
    } else {
      // Get full data with relationships - root is the only relation we need
      const columns = `
          root_id,
          user_id,
          fsrs_due,
          fsrs_stability,
          fsrs_difficulty,
          fsrs_elapsed_days,
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
        `fsrs_state.eq.0,fsrs_last_review.is.null,fsrs_last_review.lt.${cooldownTime.toISOString()}`
      );
    }

    // Apply category filters server-side to reduce payload
    if (options.category === 'mastered') {
      filteredQuery = filteredQuery.eq('fsrs_state', 2).gte('fsrs_stability', 5);
    } else if (options.category === 'learning') {
      // State 0 (New) words are due for first review, not learning
      // Only states 1, 3, or state 2 with low stability are learning
      filteredQuery = filteredQuery.or(
        'fsrs_state.in.(1,3),and(fsrs_state.eq.2,fsrs_stability.lt.5)'
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

    const { data, error } = await filteredQuery;

    if (error) {
      throw error;
    }

    return data as StudyWord[];
  },

  // Update word with FSRS parameters
  async updateFSRSWord(userId: string, rootId: number, update: FSRSWordUpdate): Promise<boolean> {
    await checkAuthentication(userId);

    // First verify the root entry exists and belongs to the user
    const { data: existingWord, error: checkError } = await supabase
      .from('study_words')
      .select('root_id')
      .eq('root_id', rootId)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      throw checkError;
    }

    if (!existingWord) {
      throw new Error('Root entry not found or does not belong to user');
    }

    const wordUpdateData: TablesUpdate<'study_words'> = {
      fsrs_due: update.fsrs_due,
      fsrs_stability: update.fsrs_stability,
      fsrs_difficulty: update.fsrs_difficulty,
      fsrs_elapsed_days: update.fsrs_elapsed_days,
      fsrs_scheduled_days: update.fsrs_scheduled_days,
      fsrs_learning_steps: update.fsrs_learning_steps,
      fsrs_reps: update.fsrs_reps,
      fsrs_lapses: update.fsrs_lapses,
      fsrs_state: update.fsrs_state,
      fsrs_last_review: update.fsrs_last_review,
    };

    const { error } = await supabase
      .from('study_words')
      .update(wordUpdateData)
      .eq('root_id', rootId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  },

  // Record a review with FSRS parameters
  async recordFSRSReview(
    userId: string,
    rootId: number,
    rating: Rating,
    learningSteps: number
  ): Promise<boolean> {
    await checkAuthentication(userId);

    // Add the review record
    const reviewPayload: TablesInsert<'reviews'> = {
      user_id: userId,
      root_id: rootId,
      grade: rating,
      learning_steps: learningSteps,
      reviewed_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('reviews').insert(reviewPayload);

    if (error) {
      throw error;
    }

    return true;
  },

  // Batch update FSRS parameters and record a review in a single atomic operation
  async updateWordAndReview(
    userId: string,
    rootId: number,
    update: FSRSWordUpdate,
    rating: Rating,
    learningSteps: number
  ): Promise<boolean> {
    await checkAuthentication(userId);

    try {
      // Use RPC function for atomic update and review recording
      const { data, error } = await supabase.rpc('update_word_and_review', {
        p_user_id: userId,
        p_root_id: rootId,
        p_fsrs_due: update.fsrs_due,
        p_fsrs_stability: update.fsrs_stability,
        p_fsrs_difficulty: update.fsrs_difficulty,
        p_fsrs_elapsed_days: update.fsrs_elapsed_days,
        p_fsrs_scheduled_days: update.fsrs_scheduled_days,
        p_fsrs_learning_steps: update.fsrs_learning_steps,
        p_fsrs_reps: update.fsrs_reps,
        p_fsrs_lapses: update.fsrs_lapses,
        p_fsrs_state: update.fsrs_state,
        p_fsrs_last_review: update.fsrs_last_review,
        p_rating: rating,
        p_learning_steps: learningSteps,
      });

      if (error) {
        throw error;
      }

      return Boolean(data);
    } catch (error) {
      await handleError(error as Error, { showToast: false });

      // Fallback to individual operations if RPC fails (e.g., during migration)
      try {
        await this.updateFSRSWord(userId, rootId, update);
        await this.recordFSRSReview(userId, rootId, rating, learningSteps);
        return true;
      } catch (fallbackError) {
        await handleError(fallbackError as Error, { showToast: false });
        throw fallbackError;
      }
    }
  },

  // Toggle FSRS study for roots
  async toggleFSRSStudyRoot(userId: string, rootId: number): Promise<boolean> {
    await checkAuthentication(userId);

    // Check if a study entry already exists for this root
    const { data: existing, error: checkError } = await supabase
      .from('study_words')
      .select('root_id')
      .eq('user_id', userId)
      .eq('root_id', rootId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existing) {
      // Remove existing root study entry
      const { error: deleteError } = await supabase
        .from('study_words')
        .delete()
        .eq('user_id', userId)
        .eq('root_id', rootId);

      if (deleteError) {
        throw deleteError;
      }
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
      fsrs_elapsed_days: 0,
      fsrs_scheduled_days: 0,
      fsrs_learning_steps: 0,
      fsrs_reps: 0,
      fsrs_lapses: 0,
      fsrs_state: 0, // New state - will show as "due" for first review
      fsrs_last_review: now.toISOString(), // Explicitly set to ensure database constraint compliance
    };

    const { error: insertError } = await supabase.from('study_words').insert(newEntry);

    if (insertError) {
      throw insertError;
    }

    return true;
  },
};
