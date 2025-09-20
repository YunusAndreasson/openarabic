import { useQuery, type QueryObserverResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { CACHE_TIMES } from '@/constants/queryConfig';
import { articlesService } from '@/services/articles';
import { bookmarkService } from '@/services/bookmark';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';

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
  userId: string | undefined
): ArticleDataResult => {
  // Fetch article data with optimized caching
  const { data: article, isLoading: isLoadingArticle } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => {
      if (!articleId) throw new Error('Article ID is required');
      return articlesService.getArticleById(articleId);
    },
    enabled: !!articleId,
    ...CACHE_TIMES.ARTICLES,
    refetchOnMount: false, // Don't refetch on mount if we have data
    placeholderData: old => old,
  });

  // Check if article is in user's reading list - optimized caching
  const { data: isInReadingList = false, refetch: refetchReadingListStatus } = useQuery({
    queryKey: ['readingList', userId, articleId],
    queryFn: () => {
      if (!userId || !articleId) throw new Error('User ID and Article ID are required');
      return bookmarkService.isInReadingList(userId, articleId);
    },
    enabled: !!userId && !!articleId,
    ...CACHE_TIMES.MEDIUM, // 3 minutes - reading list changes moderately
    refetchOnMount: false,
  });

  // Fetch study words with optimized caching
  const {
    data: studyWords = [],
    refetch: refetchStudyWords,
    isLoading: isLoadingStudyWords,
  } = useQuery<StudyWord[]>({
    queryKey: userId
      ? FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS)
      : FSRS_QUERY_KEYS.FALLBACK.allWithCooldown(DEFAULT_SESSION_COOLDOWN_HOURS),
    queryFn: async () => {
      if (!userId) return [];
      return studyWordsFSRSService.getFSRSWords(userId);
    },
    enabled: !!userId,
    ...CACHE_TIMES.MEDIUM, // 3 minutes - study words change moderately
    networkMode: 'online',
    retry: 3,
    refetchOnMount: true, // Previously 'always', now true to respect staleTime
    refetchOnWindowFocus: false, // Mobile-only: no window focus concept
    placeholderData: old => old,
  });

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
  const sentenceWordsMap = useMemo(() => {
    const map = new Map<number, SentenceWord[]>();
    // Early return if no sentences
    if (!sortedSentences?.length) return map;

    // Process all sentences in one pass
    return sortedSentences.reduce((acc, sentence) => {
      if (sentence.sentence_words?.length) {
        acc.set(
          sentence.id,
          sentence.sentence_words
            .slice() // Create a new array to avoid mutating the original
            .sort((a, b) => a.position - b.position)
        );
      }
      return acc;
    }, new Map<number, SentenceWord[]>());
  }, [sortedSentences]);

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

export default useArticleData;
