import { useQuery, type QueryObserverResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { CACHE_TIMES, READING_LIST_QUERY_KEYS } from '@/constants/queryKeys';
import { articleQueryOptions, fsrsQueryOptions } from '@/constants/queryOptions';
import { useColors } from '@/hooks/theme/useColors';
import { bookmarkService } from '@/services/bookmark';
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
  refetchStudyWords: () => Promise<QueryObserverResult<StudyWord[], Error>>;
  isLoadingStudyWords: boolean;
}

/**
 * Custom hook to fetch and process article data
 * @param articleId - The ID of the article to fetch
 * @param userId - The current user ID
 */
export const useArticleData = (
  articleId: number | undefined,
  userId: string | undefined,
): ArticleDataResult => {
  // Get theme colors for pre-computing word color analysis
  const colors = useColors();

  // Fetch article data with optimized caching
  const { data: article, isLoading: isLoadingArticle } = useQuery({
    ...articleQueryOptions.detail(articleId || 0),
    refetchOnMount: false, // Don't refetch on mount if we have data
  });

  // Check if article is in user's reading list - optimized caching
  const { data: isInReadingList = false, refetch: refetchReadingListStatus } = useQuery({
    queryKey:
      userId && articleId
        ? READING_LIST_QUERY_KEYS.detail(userId, articleId)
        : ['readingList', 'none'],
    queryFn: () => {
      if (!userId || !articleId) throw new Error('User ID and Article ID are required');
      return bookmarkService.isInReadingList(userId, articleId as ArticleId);
    },
    enabled: !!userId && !!articleId,
    ...CACHE_TIMES.MEDIUM, // 3 minutes - reading list changes moderately
    refetchOnMount: false,
  });

  // Fetch study words with optimized caching
  const studyWordsQuery = useQuery({
    ...fsrsQueryOptions.allWithCooldown(userId || '', DEFAULT_SESSION_COOLDOWN_HOURS),
    enabled: !!userId,
    refetchOnMount: false, // Only refetch via cache invalidation or pull-to-refresh
    refetchOnReconnect: false, // Only refetch via pull-to-refresh
    placeholderData: old => old,
  });

  const studyWords = studyWordsQuery.data || [];
  const refetchStudyWords = studyWordsQuery.refetch;
  const isLoadingStudyWords = studyWordsQuery.isLoading;

  // Process sentences from article data - no additional fetch needed
  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) {
      return [];
    }
    return [...article.article_sentences].sort((a, b) => a.position - b.position);
  }, [article?.article_sentences]);

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
