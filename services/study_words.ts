import { supabase } from './supabase';

interface WordReviewUpdate {
  interval_days: number;
  ease_factor: number;
  next_review_at: string;
  review_count: number;
  lapses: number;
}

export const studyWordsService = {
  async getStudyWords(userId: string) {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      throw new Error('User ID mismatch');
    }

    const { data, error } = await supabase
      .from('study_words')
      .select(
        `
        *,
        sentence_word:sentence_words (
          *,
          root:roots (*),
          word_type:word_types (*),
          sentence:article_sentences (
            *
          )
        )
      `
      )
      .eq('user_id', userId);

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
      const newWord = {
        user_id: userId,
        sentence_word_id: sentenceWordId,
        next_review_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        ease_factor: 2.5,
        interval_days: 1,
        stability: 1,
        lapses: 0,
        review_count: 0,
        previous_interval: 0,
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
