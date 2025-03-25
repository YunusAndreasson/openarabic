import { supabase } from './supabase';
import { createEmptyCard, Rating } from 'ts-fsrs';
import { StudyWord } from '@/types/vocabulary.types';

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

export const studyWordsFSRSService = {
  // Fetch study words with FSRS parameters
  async getFSRSWords(userId: string, options: GetFSRSWordsOptions = {}): Promise<StudyWord[]> {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    // Build the query step by step with proper typing
    let query = supabase.from('study_words');

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
        sentence_word_id, 
        created_at`
      );
    } else {
      // Full data with relationships
      selectQuery = query.select(`
        *,
        sentence_word:sentence_words (
          *,
          root:roots (*),
          word_type:word_types (*),
          sentence:article_sentences (
            *
          )
        )
      `);
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
  async updateFSRSWord(userId: string, sentenceWordId: number, update: FSRSWordUpdate) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    // First verify the word exists and belongs to the user
    const { data: existingWord, error: checkError } = await supabase
      .from('study_words')
      .select('*')
      .eq('sentence_word_id', sentenceWordId)
      .eq('user_id', userId)
      .single();

    if (checkError) {
      throw checkError;
    }

    if (!existingWord) {
      throw new Error('Word not found or does not belong to user');
    }

    const { error } = await supabase
      .from('study_words')
      .update(update)
      .eq('sentence_word_id', sentenceWordId)
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    return true;
  },

  // Record a review with FSRS parameters
  async recordFSRSReview(userId: string, sentenceWordId: number, rating: Rating) {
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
      sentence_word_id: sentenceWordId,
      grade: rating,
      reviewed_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    return true;
  },

  // Toggle study word with FSRS initialization
  async toggleFSRSStudyWord(userId: string, sentenceWordId: number) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    // First check if the word is already being studied
    const { data: existingWord, error: checkError } = await supabase
      .from('study_words')
      .select('*')
      .eq('user_id', userId)
      .eq('sentence_word_id', sentenceWordId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingWord) {
      try {
        // First, delete all reviews related to this study word to avoid foreign key constraint errors
        const { error: reviewsDeleteError } = await supabase
          .from('reviews')
          .delete()
          .eq('user_id', userId)
          .eq('sentence_word_id', sentenceWordId);

        if (reviewsDeleteError) {
          console.error('Error deleting reviews:', reviewsDeleteError);
          throw reviewsDeleteError;
        }

        // After deleting reviews, delete the study word
        const { error: deleteError } = await supabase
          .from('study_words')
          .delete()
          .eq('user_id', userId)
          .eq('sentence_word_id', sentenceWordId);

        if (deleteError) {
          console.error('Error deleting study word:', deleteError);
          throw deleteError;
        }

        return false;
      } catch (error) {
        console.error('Error in toggleFSRSStudyWord:', error);
        throw error;
      }
    } else {
      // Get current time
      const now = new Date();

      // Create an empty FSRS card
      const emptyCard = createEmptyCard(now);

      // Initialize new study word with FSRS parameters
      const newWord = {
        user_id: userId,
        sentence_word_id: sentenceWordId,
        // Legacy fields (kept for compatibility)
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
        // FSRS fields
        fsrs_due: now.toISOString(),
        fsrs_stability: emptyCard.stability,
        fsrs_difficulty: emptyCard.difficulty,
        fsrs_elapsed_days: emptyCard.elapsed_days,
        fsrs_scheduled_days: emptyCard.scheduled_days,
        fsrs_reps: emptyCard.reps,
        fsrs_lapses: emptyCard.lapses,
        fsrs_state: emptyCard.state,
        fsrs_last_review: null, // No review yet
      };

      const { error: insertError } = await supabase
        .from('study_words')
        .insert(newWord)
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return true;
    }
  },
};
