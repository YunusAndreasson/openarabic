import type { Rating } from 'ts-fsrs';
import { createEmptyCard } from 'ts-fsrs';

import type { StudyWord } from '../types/vocabulary.types';

import { supabase, checkAuthentication } from './supabase';

// Interface for FSRS-specific update fields
interface FSRSWordUpdate {
  fsrs_due: string;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_elapsed_days: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_last_review: string;
}

// Define options for fetching FSRS words
interface GetFSRSWordsOptions {
  onlyDue?: boolean;
  forStats?: boolean;
  limit?: number;
}

// Query key constants for consistent key usage
export const FSRS_QUERY_KEYS = {
  all: (userId: string) => ['fsrs-words', userId] as const,
  due: (userId: string) => ['fsrs-words', userId, 'due'] as const,
  stats: (userId: string) => ['fsrs-words', userId, 'stats'] as const,
  filtered: (userId: string, category: string) =>
    ['fsrs-words', userId, 'filtered', category] as const,
} as const;

interface ReviewLog {
  reviewed_at: string;
  grade: number;
  root_id: number;
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
        fsrs_lapses, 
        fsrs_state, 
        fsrs_last_review, 
        root_id,
        created_at`
      );
    } else {
      // Get full data with relationships - root is the only relation we need
      selectQuery = query.select(
        `
        *,
        root:roots (*)
      `
      );
    }

    // Add filters after the select
    let filteredQuery = selectQuery.eq('user_id', userId);

    // Add due date filter if requested
    if (options.onlyDue) {
      const now = new Date().toISOString();
      filteredQuery = filteredQuery.lte('fsrs_due', now);
    }

    // Order by due date
    filteredQuery = filteredQuery.order('fsrs_due', { ascending: true });

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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    // First verify the root entry exists and belongs to the user
    const { data: existingWord, error: checkError } = await supabase
      .from('study_words')
      .select('*')
      .eq('root_id', rootId)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      throw checkError;
    }

    if (!existingWord) {
      throw new Error('Root entry not found or does not belong to user');
    }

    const { error } = await supabase
      .from('study_words')
      .update(update)
      .eq('root_id', rootId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  },

  // Record a review with FSRS parameters
  async recordFSRSReview(userId: string, rootId: number, rating: Rating): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    // Add the review record
    const { error } = await supabase.from('reviews').insert({
      user_id: userId,
      root_id: rootId,
      grade: rating,
      reviewed_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return true;
  },

  // Toggle FSRS study for roots
  async toggleFSRSStudyRoot(userId: string, rootId: number): Promise<boolean> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`);
    }

    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    // Check if a study entry already exists for this root
    const { data: existing, error: checkError } = await supabase
      .from('study_words')
      .select('*')
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
      next_review_at: now.toISOString(),
      created_at: now.toISOString(),
      ease_factor: 2.5,
      interval_days: 1,
      stability: 0,
      lapses: 0,
      review_count: 0,
      previous_interval: 0,
      difficulty: 0.3,
      success_streak: 0,
      failure_streak: 0,
      fsrs_due: now.toISOString(),
      fsrs_stability: emptyCard.stability,
      fsrs_difficulty: emptyCard.difficulty,
      fsrs_elapsed_days: emptyCard.elapsed_days,
      fsrs_scheduled_days: emptyCard.scheduled_days,
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

  // Get review logs for weekly progress
  async getReviewLogs(userId: string, daysBack: number = 7): Promise<ReviewLog[]> {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (daysBack - 1));

    const { data, error } = await supabase
      .from('reviews')
      .select('reviewed_at, grade, root_id')
      .eq('user_id', userId)
      .not('root_id', 'is', null)
      .gte('reviewed_at', startDate.toISOString())
      .lte('reviewed_at', now.toISOString())
      .order('reviewed_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data as ReviewLog[];
  },
};
