import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect, useCallback } from 'react';

import { articlesService } from '@/services/articles';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { SentenceWord, StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

interface ArticleDataResult {
  article: Article | undefined;
  isLoadingArticle: boolean;
  articleError: Error | null;
  isInReadingList: boolean;
  refetchReadingListStatus: () => void;
  isLoadingReadingList: boolean;
  selectedWordIds: Set<number>;
  sortedSentences: Required<Article>['article_sentences'];
  sentenceWordsMap: Map<number, SentenceWord[]>;
  otherArticles: Article[];
  isLoadingOtherArticles: boolean;
  otherCategoryArticles: Article[];
  isLoadingOtherCategoryArticles: boolean;
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
  const queryClient = useQueryClient();

  // Fetch article data with optimized caching
  const {
    data: article,
    isLoading: isLoadingArticle,
    error: articleError,
  } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => {
      if (!articleId) throw new Error('Article ID is required');
      return articlesService.getArticleById(articleId);
    },
    enabled: !!articleId,
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    refetchOnMount: false, // Don't refetch on mount if we have data
    placeholderData: old => old, // Keep old data while fetching
  });

  // Check if article is in user's reading list - optimized caching
  const {
    data: isInReadingList = false,
    refetch: refetchReadingListStatus,
    isLoading: isLoadingReadingList,
  } = useQuery({
    queryKey: ['readingList', userId, articleId],
    queryFn: () => {
      if (!userId || !articleId) throw new Error('User ID and Article ID are required');
      return readingListService.isInReadingList(userId, articleId);
    },
    enabled: !!userId && !!articleId,
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    refetchOnMount: false,
  });

  // Fetch study words with optimized caching
  const { data: studyWords = [] } = useQuery<StudyWord[]>({
    queryKey: ['studyWords', userId],
    queryFn: async () => {
      if (!userId) return [];
      return studyWordsFSRSService.getFSRSWords(userId);
    },
    enabled: !!userId,
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    networkMode: 'always',
    retry: 3,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  // Process sentences from article data - no additional fetch needed
  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) {
      return [];
    }
    const sorted = [...article.article_sentences].sort((a, b) => a.position - b.position);
    return sorted;
  }, [article?.article_sentences]);

  // Extract selected root IDs since study is now root-based
  const selectedWordIds = useMemo(() => {
    const ids = new Set<number>();
    (studyWords || []).forEach(w => {
      if (w.root_id != null) {
        ids.add(w.root_id);
      }
    });
    return ids;
  }, [studyWords]);

  // Create sentence words map from article data - no additional fetch needed
  const sentenceWordsMap = useMemo(() => {
    if (!sortedSentences.length) {
      return {
        data: new Map(),
        isLoading: false,
      };
    }

    const map = new Map<number, SentenceWord[]>();
    sortedSentences.forEach(sentence => {
      if (sentence.sentence_words) {
        map.set(
          sentence.id,
          [...sentence.sentence_words]
            .sort((a, b) => a.position - b.position)
            .map(word => ({
              ...word,
              root: {
                id: word.root_id,
                letters: '',
                meaning: null,
              },
              word_type: {
                id: word.word_type_id,
                name: '',
              },
            })) as unknown as SentenceWord[]
        );
      }
    });

    return {
      data: map,
      isLoading: false,
    };
  }, [sortedSentences]);

  // Get related articles with optimized caching
  const { data: otherArticles = [], isLoading: isLoadingOtherArticles } = useQuery<Article[]>({
    queryKey: ['otherArticles', article?.category_id],
    queryFn: async () => {
      if (!article?.category_id) return [];
      try {
        const relatedArticles = await articlesService.getRelatedArticles(article.id);
        return relatedArticles;
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        return [];
      }
    },
    enabled: !!article?.category_id,
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    refetchOnMount: false,
    placeholderData: old => old,
  });

  // Get other category articles with optimized caching
  const { data: otherCategoryArticles = [], isLoading: isLoadingOtherCategoryArticles } = useQuery<
    Article[]
  >({
    queryKey: ['otherCategoryArticles', article?.id],
    queryFn: async () => {
      if (!article?.id) return [];
      try {
        const otherArticles = await articlesService.getOtherCategoryArticles(article.category_id);
        return otherArticles;
      } catch (error) {
        handleError(error instanceof Error ? error : String(error));
        return [];
      }
    },
    enabled: !!article?.id,
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    refetchOnMount: false,
    placeholderData: old => old,
  });

  // Prefetch next and previous articles when current article loads
  const prefetchArticle = useCallback(
    (articleId: number) => {
      queryClient.prefetchQuery({
        queryKey: ['article', articleId],
        queryFn: () => articlesService.getArticleById(articleId),
        staleTime: 300000,
        gcTime: 600000,
        retry: 3,
      });
    },
    [queryClient]
  );

  useEffect(() => {
    if (!article?.id || otherArticles.length === 0) return;

    const currentIndex = otherArticles.findIndex(a => a.id === article.id);
    if (currentIndex === -1) return;

    const nextArticle = otherArticles[currentIndex + 1];
    const prevArticle = otherArticles[currentIndex - 1];

    if (nextArticle) prefetchArticle(nextArticle.id);
    if (prevArticle) prefetchArticle(prevArticle.id);
  }, [article?.id, otherArticles, prefetchArticle]);

  return {
    article,
    isLoadingArticle,
    articleError,
    isInReadingList,
    refetchReadingListStatus,
    isLoadingReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap: sentenceWordsMap.data,
    otherArticles,
    isLoadingOtherArticles,
    otherCategoryArticles,
    isLoadingOtherCategoryArticles,
  };
};

export default useArticleData;
