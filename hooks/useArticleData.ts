import { useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { articlesService } from '@/services/articles';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

// Types
import type { Article } from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';

// Define a type for FSRS study word to avoid any
interface FSRSStudyWord {
  sentence_word_id: number;
  user_id: string;
  fsrs_due: string;
  fsrs_stability: number;
  fsrs_difficulty: number;
  fsrs_elapsed_days: number;
  fsrs_scheduled_days: number;
  fsrs_reps: number;
  fsrs_lapses: number;
  fsrs_state: number;
  fsrs_last_review: string | null;
  sentence_word: {
    id: number;
    word_form: string;
    english: string;
    [key: string]: any;
  };
  [key: string]: any; // Allow other properties
}

/**
 * Custom hook to fetch and process article data
 * @param articleId - The ID of the article to fetch
 * @param userId - The current user ID
 */
export const useArticleData = (articleId: number | undefined, userId: string | undefined) => {
  const queryClient = useQueryClient();

  // Fetch article data with optimized caching
  const {
    data: article,
    isLoading: isLoadingArticle,
    error: articleError,
  } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesService.getArticleById(articleId!),
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
    queryFn: () => readingListService.isInReadingList(userId!, articleId!),
    enabled: !!userId && !!articleId,
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    refetchOnMount: false,
  });

  // Fetch study words with optimized caching
  const { data: studyWords = [] } = useQuery<FSRSStudyWord[]>({
    queryKey: ['studyWords', userId],
    queryFn: async () => {
      if (!userId) return [];
      return studyWordsFSRSService.getFSRSWords(userId);
    },
    enabled: !!userId,
    staleTime: 300000, // Cache for 5 minutes
    gcTime: 600000, // Keep in garbage collection for 10 minutes
    networkMode: 'always',
    retry: 2,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  // Process sentences from article data - no additional fetch needed
  const sortedSentences = useMemo(() => {
    if (!article?.article_sentences) return [];
    return [...article.article_sentences].sort((a, b) => a.position - b.position);
  }, [article?.article_sentences]);

  // Extract selected word IDs
  const selectedWordIds = useMemo(() => {
    const ids = new Set(
      (studyWords || []).map(w => {
        const id = w.sentence_word_id;
        return typeof id === 'string' ? parseInt(id, 10) : id;
      })
    );
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
            }))
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
  useEffect(() => {
    if (article?.id && otherArticles.length > 0) {
      // Find current article index
      const currentIndex = otherArticles.findIndex(a => a.id === article.id);
      if (currentIndex !== -1) {
        // Prefetch next article
        if (currentIndex < otherArticles.length - 1) {
          const nextArticle = otherArticles[currentIndex + 1];
          queryClient.prefetchQuery({
            queryKey: ['article', nextArticle.id],
            queryFn: () => articlesService.getArticleById(nextArticle.id),
            staleTime: 300000,
            gcTime: 600000,
          });
        }
        // Prefetch previous article
        if (currentIndex > 0) {
          const prevArticle = otherArticles[currentIndex - 1];
          queryClient.prefetchQuery({
            queryKey: ['article', prevArticle.id],
            queryFn: () => articlesService.getArticleById(prevArticle.id),
            staleTime: 300000,
            gcTime: 600000,
          });
        }
      }
    }
  }, [article?.id, otherArticles, queryClient]);

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
