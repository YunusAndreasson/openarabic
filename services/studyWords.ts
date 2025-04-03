import { supabase } from './supabase';
import { createEmptyCard } from 'ts-fsrs';

interface WordReviewUpdate {
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  lapses: number;
  stability: number;
  previous_interval: number;
  difficulty?: number;
  success_streak?: number;
  failure_streak?: number;
}

// Define an options interface for getStudyWords
interface GetStudyWordsOptions {
  onlyDue?: boolean;
  forStats?: boolean;
}

export const studyWordsService = {
  async getStudyWords(userId: string, options: GetStudyWordsOptions = {}) {
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
    const query = supabase.from('study_words');

    // Define the selection based on options
    let selectQuery;
    if (options.forStats) {
      // For stats, we only need core fields, not all the relationships
      selectQuery = query.select(
        'interval_days, next_review_at, review_count, created_at, sentence_word_id, difficulty, success_streak, failure_streak, fsrs_due, fsrs_stability, fsrs_difficulty, fsrs_elapsed_days, fsrs_scheduled_days, fsrs_reps, fsrs_lapses, fsrs_state, fsrs_last_review'
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
      // Prefer FSRS due date field, but fall back to legacy field for compatibility
      filteredQuery = filteredQuery.lte('fsrs_due', now);
    }

    const { data, error } = await filteredQuery;

    if (error) {
      throw error;
    }

    return data;
  },

  async updateWordReview(sentenceWordId: number, update: WordReviewUpdate) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    // First verify the word exists and belongs to the user
    const { data: existingWord, error: checkError } = await supabase
      .from('study_words')
      .select('*')
      .eq('sentence_word_id', sentenceWordId)
      .eq('user_id', session.user.id)
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
      .eq('user_id', session.user.id);

    if (error) {
      throw error;
    }
  },

  async toggleStudyWord(userId: string, sentenceWordId: number) {
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
      const { error: deleteError } = await supabase
        .from('study_words')
        .delete()
        .eq('user_id', userId)
        .eq('sentence_word_id', sentenceWordId);

      if (deleteError) {
        throw deleteError;
      }

      return false;
    } else {
      // Get current time
      const now = new Date();
      const currentTime = now.toISOString();

      // Use createEmptyCard from ts-fsrs to initialize a new FSRS card
      const fsrsCard = createEmptyCard(now);

      const newWord = {
        user_id: userId,
        sentence_word_id: sentenceWordId,
        // Legacy fields (kept for compatibility)
        next_review_at: currentTime,
        created_at: currentTime,
        ease_factor: 2.5,
        interval_days: 1,
        stability: 1,
        lapses: 0,
        review_count: 0,
        previous_interval: 0,
        difficulty: 0.3,
        success_streak: 0,
        failure_streak: 0,
        // FSRS fields - properly initialized by createEmptyCard
        fsrs_due: fsrsCard.due.toISOString(),
        fsrs_stability: fsrsCard.stability,
        fsrs_difficulty: fsrsCard.difficulty,
        fsrs_elapsed_days: fsrsCard.elapsed_days,
        fsrs_scheduled_days: fsrsCard.scheduled_days,
        fsrs_reps: fsrsCard.reps,
        fsrs_lapses: fsrsCard.lapses,
        fsrs_state: fsrsCard.state,
        fsrs_last_review: null, // No reviews yet
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
