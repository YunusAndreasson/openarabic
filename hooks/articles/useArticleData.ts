import { useQuery, type QueryObserverResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { articleQueries, fsrsQueries, gated, readingProgressQueries } from '@/constants/queries';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { computeColoredSegments } from '@/utils/arabicWordAnalysis';

interface ArticleDataResult {
  article: Article | undefined;
  isLoadingArticle: boolean;
  isInReadingList: boolean;
  refetchReadingListStatus: () => void;
  selectedWordIds: Set<number>;
  sortedSentences: Required<Article>['article_sentences'];
  sentenceWordsMap: Map<number, SentenceWord[]>;
  refetchStudyWords: () => Promise<QueryObserverResult<StudyWord[]>>;
  isLoadingStudyWords: boolean;
}

/**
 * Custom hook to fetch and process article data
 * @param articleId - The ID of the article to fetch
 * @param userId - The current user ID
 */
export const useArticleData = (
  articleId: ArticleId | undefined,
  userId: string | undefined,
): ArticleDataResult => {
  // Get theme colors for pre-computing word color analysis
  const colors = useColors();

  // Fetch article data with optimized caching
  const { data: article, isLoading: isLoadingArticle } = useQuery({
    ...articleQueries.detail(articleId ?? (0 as ArticleId)),
    refetchOnMount: false, // Don't refetch on mount if we have data
  });

  // Check if article is in user's reading list
  const { data: isInReadingList = false, refetch: refetchReadingListStatus } = useQuery(
    readingProgressQueries.isInReadingList(userId || '', articleId ?? (0 as ArticleId)),
  );

  // Fetch study words with optimized caching
  // CRITICAL: Use same query as useArabicWord and useArticleWordInteractions for DRY consistency
  const studyWordsQuery = useQuery({
    ...gated(fsrsQueries.all, userId),
    refetchOnMount: false, // Only refetch via cache invalidation or pull-to-refresh
    refetchOnReconnect: false, // Only refetch via pull-to-refresh
    placeholderData: old => old,
  });

  const studyWords = studyWordsQuery.data || [];
  const refetchStudyWords = studyWordsQuery.refetch;
  const isLoadingStudyWords = studyWordsQuery.isLoading;

  // Process sentences from article data - no additional fetch needed
  const sortedSentences = useMemo(
    () =>
      article?.article_sentences
        ? [...article.article_sentences].sort((a, b) => a.position - b.position)
        : [],
    [article],
  );

  // Extract selected root IDs since study is now root-based
  const selectedWordIds = useMemo(() => {
    // Skip recalculation if no study words
    if (!studyWords.length) return new Set<number>();

    const ids = new Set<number>();
    studyWords.forEach(w => {
      if (w.root_id != null) {
        ids.add(w.root_id);
      }
    });
    return ids;
  }, [studyWords]);

  // Create sentence words map from article data - no additional fetch needed
  // Pre-compute color analysis at load time for optimal render performance
  const sentenceWordsMap = useMemo(() => {
    const map = new Map<number, SentenceWord[]>();
    // Early return if no sentences or colors not ready
    if (!sortedSentences?.length || !colors) return map;

    // Process all sentences in one pass
    return sortedSentences.reduce((acc, sentence) => {
      if (sentence.sentence_words?.length) {
        const wordsWithColors = sentence.sentence_words
          .slice() // Create a new array to avoid mutating the original
          .sort((a, b) => a.position - b.position)
          .map(word => ({
            ...word,
            coloredSegments: computeColoredSegments(word.word_form, word.english || '', colors),
          }));
        acc.set(sentence.id, wordsWithColors);
      }
      return acc;
    }, new Map<number, SentenceWord[]>());
  }, [sortedSentences, colors]);

  return {
    article,
    isLoadingArticle,
    isInReadingList,
    refetchReadingListStatus,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap,
    refetchStudyWords,
    isLoadingStudyWords,
  };
};
