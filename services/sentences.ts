import { STRINGS } from '@/constants/strings';
import { supabase } from '@/services/supabase';
import type { SentenceWordRow } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { createServiceErrorConfig } from '@/utils/serviceErrorConfig';
import { executeQuery } from '@/utils/supabaseHelpers';
import { mapToSentenceWord } from '@/utils/typeMappers';

const errorConfig = {
  loadByRootId: createServiceErrorConfig('sentences', 'load', {
    toastMessage: STRINGS.FAILED_TO_LOAD_SENTENCES,
  }),
};

/**
 * Sentence with full word data for display
 * Includes all words in the sentence for proper color-coding
 */
export interface SentenceWithWords extends Tables<'article_sentences'> {
  sentence_words: SentenceWord[];
}

/**
 * Raw row type from database query
 */
interface SentenceWithWordsRow extends Tables<'article_sentences'> {
  sentence_words: SentenceWordRow[];
}

/**
 * Maps a raw sentence row to SentenceWithWords
 */
function mapToSentenceWithWords(row: SentenceWithWordsRow): SentenceWithWords {
  return {
    ...row,
    sentence_words: Array.isArray(row.sentence_words)
      ? row.sentence_words.map(mapToSentenceWord)
      : [],
  };
}

export const sentencesService = {
  /**
   * Get sentences containing a specific word (by root_id)
   *
   * Returns up to `limit` sentences that contain the given root,
   * with all words in each sentence for proper display.
   *
   * @param rootId - The root ID to search for
   * @param limit - Maximum number of sentences to return (default: 5)
   * @returns Array of sentences with all their words
   */
  async getSentencesByRootId(rootId: RootId, limit = 5): Promise<SentenceWithWords[]> {
    // First, find sentence IDs that contain this root
    // We need to do this in two steps because Supabase doesn't support
    // filtering nested relations and returning the parent with all children
    const sentenceIdsResult = await executeQuery(
      () =>
        supabase
          .from('sentence_words')
          .select('sentence_id')
          .eq('root_id', rootId as number)
          .limit(limit),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootId, limit },
      },
    );

    if (!sentenceIdsResult || sentenceIdsResult.length === 0) {
      return [];
    }

    // Get unique sentence IDs
    const sentenceIds = [...new Set(sentenceIdsResult.map(r => r.sentence_id))];

    // Now fetch the full sentences with all their words
    const sentencesResult = await executeQuery(
      () =>
        supabase
          .from('article_sentences')
          .select(
            `
            id,
            position,
            arabic,
            english,
            article_id,
            audio_url,
            audio_url_bilingual,
            audio_url_english,
            arabic_repeat,
            english_repeat,
            sentence_words(
              id,
              position,
              word_form,
              english,
              difficulty_level,
              grammar_note,
              root_id,
              sentence_id,
              word_type_id,
              audio_url,
              root:roots(id, letters, meaning, audio_url, audio_url_en),
              word_type:word_types(id, name)
            )
          `,
          )
          .in('id', sentenceIds)
          .order('position', { ascending: true })
          .overrideTypes<SentenceWithWordsRow[], { merge: false }>(),
      {
        ...errorConfig.loadByRootId,
        analyticsProperties: { rootId, sentenceCount: sentenceIds.length },
      },
    );

    if (!sentencesResult) {
      return [];
    }

    // Map to typed result and sort sentence_words by position
    return sentencesResult.map(sentence => {
      const mapped = mapToSentenceWithWords(sentence);
      // Sort words by position within each sentence
      mapped.sentence_words.sort((a, b) => a.position - b.position);
      return mapped;
    });
  },
};
