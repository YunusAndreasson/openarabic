import type { Rating } from 'ts-fsrs';
import { createEmptyCard } from 'ts-fsrs';

import type { StudyWord } from '@/types/vocabulary.types';

import { supabase, checkAuthentication } from './supabase';

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
  fsrs_last_review: string;
}

// Define options for fetching FSRS words
interface GetFSRSWordsOptions {
  onlyDue?: boolean;
  forStats?: boolean;
  limit?: number;
  sortByDifficultyAndStability?: boolean;
  reviewedOnly?: boolean;
  /**
   * Server-side filter for vocabulary category.
   * - "mastered": fsrs_state = 2 (Review) and fsrs_stability >= 5
   * - "learning": fsrs_state in (0,1,3) or (fsrs_state = 2 and fsrs_stability < 5)
   */
  category?: 'learning' | 'mastered';
}

// Query key constants for consistent key usage
export const FSRS_QUERY_KEYS = {
  all: (userId: string) => ['fsrs-words', userId] as const,
  due: (userId: string) => ['fsrs-words', userId, 'due'] as const,
  stats: (userId: string) => ['fsrs-words', userId, 'stats'] as const,
  filtered: (userId: string, category: string) =>
    ['fsrs-words', userId, 'filtered', category] as const,
} as const;

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
        difficulty,
        success_streak,
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
      filteredQuery = filteredQuery.lte('fsrs_due', now);
    }

    // Apply category filters server-side to reduce payload
    if (options.category === 'mastered') {
      filteredQuery = filteredQuery.eq('fsrs_state', 2).gte('fsrs_stability', 5);
    } else if (options.category === 'learning') {
      filteredQuery = filteredQuery.or(
        'fsrs_state.in.(0,1,3),and(fsrs_state.eq.2,fsrs_stability.lt.5)'
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

    const wordUpdateData = {
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
    const { error } = await supabase.from('reviews').insert({
      user_id: userId,
      root_id: rootId,
      grade: rating,
      learning_steps: learningSteps,
      reviewed_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return true;
  },

  // Batch update FSRS parameters and record a review in a single request
  async updateWordAndReview(
    userId: string,
    rootId: number,
    update: FSRSWordUpdate,
    rating: Rating,
    learningSteps: number
  ): Promise<boolean> {
    await checkAuthentication(userId);

    // Since the RPC function doesn't exist, use individual operations
    // This is less efficient but will work
    try {
      // First update the word
      await this.updateFSRSWord(userId, rootId, update);

      // Then record the review
      await this.recordFSRSReview(userId, rootId, rating, learningSteps);

      return true;
    } catch (error) {
      console.log('Error in updateWordAndReview fallback:', error);
      throw error;
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

    // Create a new FSRS card for the root
    const now = new Date();
    const emptyCard = createEmptyCard(now);

    // Create entry matching the actual database schema columns
    const newEntry = {
      user_id: userId,
      root_id: rootId,
      created_at: now.toISOString(),
      difficulty: emptyCard.difficulty / 10.0, // Normalize difficulty to 0-1 scale for backward compatibility
      success_streak: 0,
      fsrs_due: now.toISOString(),
      fsrs_stability: emptyCard.stability,
      fsrs_difficulty: emptyCard.difficulty,
      fsrs_elapsed_days: emptyCard.elapsed_days,
      fsrs_scheduled_days: emptyCard.scheduled_days,
      fsrs_learning_steps: emptyCard.learning_steps,
      fsrs_reps: emptyCard.reps,
      fsrs_lapses: emptyCard.lapses,
      fsrs_state: emptyCard.state,
      fsrs_last_review: null,
    };

    const { error: insertError } = await supabase.from('study_words').insert(newEntry);

    if (insertError) {
      throw insertError;
    }

    return true;
  },
};
