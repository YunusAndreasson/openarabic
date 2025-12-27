import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { sentenceQueries } from '@/constants/queries';
import { useColors } from '@/hooks/theme/useColors';
import type { SentenceWithWords } from '@/services/sentences';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';

interface UseSentencesByWordOptions {
  /** The root ID to find sentences for */
  rootId: RootId | undefined;
  /** Maximum number of sentences to return (default: 5) */
  limit?: number;
  /** Whether the query is enabled (default: true when rootId is provided) */
  enabled?: boolean;
}

interface UseSentencesByWordResult {
  /** Sentences with pre-computed colored segments */
  sentences: SentenceWithWords[];
  /** Whether the query is currently loading */
  isLoading: boolean;
  /** Whether the query is currently fetching (including background refetch) */
  isFetching: boolean;
  /** Any error that occurred during fetching */
  error: Error | null;
  /** Whether no sentences were found for this word */
  isEmpty: boolean;
}

/**
 * Hook to fetch sentences containing a specific word
 *
 * Returns sentences with pre-computed colored segments for each word,
 * ready for display in the UI.
 *
 * @example
 * ```tsx
 * const { sentences, isLoading, isEmpty } = useSentencesByWord({
 *   rootId: word.root_id,
 *   limit: 5,
 * });
 * ```
 */
export function useSentencesByWord({
  rootId,
  limit = 5,
  enabled = true,
}: UseSentencesByWordOptions): UseSentencesByWordResult {
  const colors = useColors();

  const query = useQuery({
    ...sentenceQueries.byRootId(rootId as RootId, limit),
    enabled: enabled && !!rootId,
  });

  // Pre-compute colored segments for all words in all sentences
  const sentencesWithColors = useMemo(() => {
    if (!query.data || !colors) return [];

    return query.data.map(sentence => ({
      ...sentence,
      sentence_words: sentence.sentence_words.map(
        (word): SentenceWord => ({
          ...word,
          coloredSegments: computeColoredSegments(word.word_form, word.english || '', {
            tint: colors.tint,
            primary: colors.primary,
            secondary: colors.secondary,
            secondaryText: colors.secondaryText,
            warning: colors.warning,
            error: colors.error,
            success: colors.success,
            info: colors.info,
            accent: colors.accent,
            violet: colors.violet,
            indigo: colors.indigo,
            coral: colors.coral,
            text: colors.text,
            arabicText: colors.arabicText,
            grammar: colors.grammar,
          }),
        }),
      ),
    }));
  }, [query.data, colors]);

  return {
    sentences: sentencesWithColors,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    isEmpty: !query.isLoading && sentencesWithColors.length === 0,
  };
}
