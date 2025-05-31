import { createEmptyCard } from 'ts-fsrs';

import type { TablesInsert, TablesUpdate } from '@/types/database.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { mapToStudyWords } from '@/utils/typeMappers';

import { supabase } from './supabase';

// Use database types instead of custom interface
type WordReviewUpdate = TablesUpdate<'study_words'>;
type StudyWordInsert = TablesInsert<'study_words'>;

// Define an options interface for getStudyWords
interface GetStudyWordsOptions {
  onlyDue?: boolean;
  forStats?: boolean;
}

// Consolidate select fields into constants for better maintainability
const CORE_FIELDS = `interval_days, next_review_at, review_count, created_at, root_id, difficulty,
success_streak, failure_streak, fsrs_due, fsrs_stability, fsrs_difficulty, fsrs_elapsed_days,
fsrs_scheduled_days, fsrs_reps, fsrs_learning_steps, fsrs_lapses, fsrs_state, fsrs_last_review, user_id, ease_factor,
stability, lapses, previous_interval`;

const FULL_FIELDS = `${CORE_FIELDS}, root:roots (*)`;

export const studyWordsService = {
  async getStudyWords(
    userId: string | null,
    options: GetStudyWordsOptions = {}
  ): Promise<StudyWord[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (!userId || session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    // Build the query step by step with proper typing
    const query = supabase.from<'study_words'>('study_words');

    // Define the selection based on options
    const selectQuery = query.select(options.forStats ? CORE_FIELDS : FULL_FIELDS);

    // Add filters after the select
    let filteredQuery = selectQuery.eq('user_id', userId);

    // Add due date filter if requested
    if (options.onlyDue) {
      const now = new Date().toISOString();
      // Prefer FSRS due date field, but fall back to legacy field for compatibility
      filteredQuery = filteredQuery.lte('fsrs_due', now);
    }

    const { data, error } = await filteredQuery;

    if (error) {
      throw error;
    }

    // Convert DB results to StudyWord type using our mapper
    return mapToStudyWords(data || []);
  },

  async updateWordReview(rootId: number | null, update: WordReviewUpdate): Promise<void> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (!rootId) {
      throw new Error('Root ID is required');
    }

    // First verify the word exists and belongs to the user
    const { data: existingWord, error: checkError } = await supabase
      .from<'study_words'>('study_words')
      .select('*')
      .eq('root_id', rootId)
      .eq('user_id', session.user.id)
      .single();

    if (checkError) {
      throw checkError;
    }

    if (!existingWord) {
      throw new Error('Word not found or does not belong to user');
    }

    // Only include valid fields from the update object that are not null/undefined
    const validUpdate = Object.entries(update).reduce<WordReviewUpdate>((acc, [key, value]) => {
      if (value !== null && value !== undefined) {
        (acc as Record<keyof WordReviewUpdate, WordReviewUpdate[keyof WordReviewUpdate]>)[
          key as keyof WordReviewUpdate
        ] = value;
      }
      return acc;
    }, {});

    const { error: updateError } = await supabase
      .from<'study_words'>('study_words')
      .update(validUpdate)
      .eq('root_id', rootId)
      .eq('user_id', session.user.id);

    if (updateError) {
      throw updateError;
    }
  },

  async toggleStudyWord(userId: string | null, rootId: number | null): Promise<boolean> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (!userId || session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    if (!rootId) {
      throw new Error('Root ID is required');
    }

    // Check if word is already being studied
    const { data: existingWord, error: checkError } = await supabase
      .from<'study_words'>('study_words')
      .select('*')
      .eq('user_id', userId)
      .eq('root_id', rootId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      // Only throw unexpected errors. PGRST116 just means the item was not found.
      throw checkError;
    }

    // If word exists, delete it
    if (existingWord) {
      const { error: deleteError } = await supabase
        .from<'study_words'>('study_words')
        .delete()
        .eq('user_id', userId)
        .eq('root_id', rootId);

      if (deleteError) {
        throw deleteError;
      }

      return false;
    }

    // Get current time
    const now = new Date();
    const currentTime = now.toISOString();

    // Use createEmptyCard from ts-fsrs to initialize a new FSRS card
    const fsrsCard = createEmptyCard(now);

    const newWord: StudyWordInsert = {
      user_id: userId,
      root_id: rootId,
      // Legacy fields (kept for compatibility)
      next_review_at: currentTime,
      created_at: currentTime,
      ease_factor: 2.5,
      interval_days: 1,
      stability: 1,
      lapses: 0,
      review_count: 0,
      previous_interval: 0,
      difficulty: 6.5,
      success_streak: 0,
      failure_streak: 0,
      // FSRS fields - properly initialized by createEmptyCard
      fsrs_due: fsrsCard.due.toISOString(),
      fsrs_stability: fsrsCard.stability,
      fsrs_difficulty: fsrsCard.difficulty,
      fsrs_elapsed_days: fsrsCard.elapsed_days,
      fsrs_scheduled_days: fsrsCard.scheduled_days,
      fsrs_reps: fsrsCard.reps,
      fsrs_learning_steps: fsrsCard.learning_steps,
      fsrs_lapses: fsrsCard.lapses,
      fsrs_state: fsrsCard.state,
      fsrs_last_review: null, // No reviews yet
    };

    const { error: insertError } = await supabase
      .from<'study_words'>('study_words')
      .insert(newWord);

    if (insertError) {
      throw insertError;
    }

    return true;
  },
};
