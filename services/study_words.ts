import { Database } from '../types/database.types';
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const studyWordsService = {
  async getStudyWords(userId: string) {
    console.log('Fetching study words for user:', userId);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('No authenticated session found');
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      console.error('Session user ID does not match provided user ID');
      throw new Error('User ID mismatch');
    }

    const { data, error } = await supabase.from('study_words').select('*').eq('user_id', userId);

    if (error) {
      console.error('Error fetching study words:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    console.log('Successfully fetched study words:', data?.length);
    return data;
  },

  async toggleStudyWord(userId: string, sentenceWordId: number) {
    console.log('Toggling study word:', { userId, sentenceWordId });

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      console.error('No authenticated session found');
      throw new Error('User must be authenticated to manage study words');
    }

    if (session.user.id !== userId) {
      console.error('Session user ID does not match provided user ID');
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
      console.error('Error checking existing word:', {
        message: checkError.message,
        details: checkError.details,
        hint: checkError.hint,
        code: checkError.code,
      });
      throw checkError;
    }

    if (existingWord) {
      console.log('Deleting existing word:', existingWord.sentence_word_id);
      const { error: deleteError } = await supabase
        .from('study_words')
        .delete()
        .eq('user_id', userId)
        .eq('sentence_word_id', sentenceWordId);

      if (deleteError) {
        console.error('Error deleting word:', {
          message: deleteError.message,
          details: deleteError.details,
          hint: deleteError.hint,
          code: deleteError.code,
        });
        throw deleteError;
      }

      console.log('Successfully deleted word');
      return false;
    } else {
      console.log('Adding new word');
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

      console.log('Inserting new word:', newWord);
      const { data: insertedWord, error: insertError } = await supabase
        .from('study_words')
        .insert(newWord)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting word:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        throw insertError;
      }

      console.log('Successfully inserted word:', insertedWord?.sentence_word_id);
      return true;
    }
  },
};
