import type { Tables } from '../types/database.types';
import type { SentenceWord } from '../types/vocabulary.types';
import { supabase } from './supabase';
import { handleError } from '../utils/errorHandling';
import { mapToSentenceWord } from '../utils/typeMappers';

export interface SentenceWithWords {
  sentence: Tables<'article_sentences'>;
  words: SentenceWord[];
}

interface GetExamplesOptions {
  wordId?: number;
  rootId?: number;
  rootIds?: number[];
  limit?: number;
}

export const wordExamplesService = {
  async getExamples({ wordId, rootId, rootIds, limit = 50 }: GetExamplesOptions): Promise<{ word: SentenceWord | null; examples: SentenceWithWords[] }> {
    try {
      let query = supabase
        .from('sentence_words')
        .select(
          `*,
           root:roots(*),
           word_type:word_types(*),
           sentence:article_sentences(
             *,
             sentence_words(
               *,
               root:roots(*),
               word_type:word_types(*)
             )
           )`
        )
        .order('sentence_id', { ascending: true })
        .limit(limit);

      if (wordId) {
        query = query.eq('id', wordId);
      } else if (rootId) {
        query = query.eq('root_id', rootId);
      } else if (rootIds && rootIds.length > 0) {
        query = query.in('root_id', rootIds);
      } else {
        return { word: null, examples: [] };
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      if (!data) return { word: null, examples: [] };

      const sentencesMap = new Map<number, SentenceWithWords>();
      let wordData: SentenceWord | null = null;

      data.forEach(row => {
        const typedWord = mapToSentenceWord(row);
        if (!wordData) wordData = typedWord;

        const sentence = row.sentence as unknown as Tables<'article_sentences'> & {
          sentence_words: unknown[];
        };
        const words: SentenceWord[] = Array.isArray(sentence.sentence_words)
          ? sentence.sentence_words.map(mapToSentenceWord)
          : [];

        if (!sentencesMap.has(sentence.id)) {
          sentencesMap.set(sentence.id, { sentence, words });
        }
      });

      return { word: wordData, examples: Array.from(sentencesMap.values()) };
    } catch (err) {
      await handleError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  },
};

