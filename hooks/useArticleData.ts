import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { articlesService } from '@/services/articles';
import { readingListService } from '@/services/readingList';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';

// Types
import type { Article, ArticleSentence } from '@/types/articles.types';
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
 * @param isDataPrefetched - Whether the data is already prefetched
 */
export const useArticleData = (
  articleId: number | undefined,
  userId: string | undefined,
  isDataPrefetched: boolean = false
) => {
  const queryClient = useQueryClient();

  // Fetch article data with all sentences and words in one query
  const {
    data: article,
    isLoading: isLoadingArticle,
    error: articleError,
  } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesService.getArticleById(articleId!),
    enabled: !!articleId,
    staleTime: 0,
    gcTime: 0,
    placeholderData: () => {
      const cachedArticles = queryClient.getQueryData<Article[]>(['articles']);
      const cachedArticle = cachedArticles?.find((a: Article) => a.id === articleId);
      if (cachedArticle) {
        return {
          ...cachedArticle,
          article_sentences: [],
        };
      }
      return undefined;
    },
  });

  // Check if article is in user's reading list - can run in parallel with article fetch
  const {
    data: isInReadingList = false,
    refetch: refetchReadingListStatus,
    isLoading: isLoadingReadingList,
  } = useQuery({
    queryKey: ['readingList', userId, articleId],
    queryFn: () => readingListService.isInReadingList(userId!, articleId!),
    enabled: !!userId && !!articleId,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch study words - can run in parallel with article fetch
  const { data: studyWords = [] } = useQuery<FSRSStudyWord[]>({
    queryKey: ['studyWords', userId],
    queryFn: async () => {
      if (!userId) return [];
      return studyWordsFSRSService.getFSRSWords(userId);
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 0,
    networkMode: 'always',
    retry: false,
    placeholderData: () => {
      const cachedStudyWords = queryClient.getQueryData<FSRSStudyWord[]>(['studyWords', userId]);
      return cachedStudyWords || [];
    },
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
          [...sentence.sentence_words].sort((a, b) => a.position - b.position)
        );
      }
    });

    return {
      data: map,
      isLoading: false,
    };
  }, [sortedSentences]);

  // Get related articles - can run in parallel with main article fetch
  const { data: otherArticles = [], isLoading: isLoadingOtherArticles } = useQuery<Article[]>({
    queryKey: ['otherArticles', article?.category_id],
    queryFn: async () => {
      if (!article?.category_id) return [];
      try {
        const articles = await articlesService.getArticles(article.category_id);
        return articles.filter(a => a.id !== article.id);
      } catch (error) {
        console.warn('Failed to fetch related articles:', error);
        return [];
      }
    },
    enabled: !!article?.category_id,
    staleTime: 0,
    gcTime: 0,
    placeholderData: () => {
      const cachedArticles = queryClient.getQueryData<Article[]>(['articles']);
      if (cachedArticles && article?.category_id) {
        return cachedArticles
          .filter(a => a.category_id === article.category_id && a.id !== article.id)
          .slice(0, 5);
      }
      return [];
    },
  });

  // Get other category articles - can run in parallel with main article fetch
  const { data: otherCategoryArticles = [], isLoading: isLoadingOtherCategoryArticles } = useQuery<
    Article[]
  >({
    queryKey: ['otherCategoryArticles', article?.id],
    queryFn: async () => {
      if (!article?.id) return [];
      try {
        const articles = await articlesService.getArticles();
        return articles.filter(a => a.category_id !== article.category_id && a.id !== article.id);
      } catch (error) {
        console.warn('Failed to fetch other category articles:', error);
        return [];
      }
    },
    enabled: !!article?.id,
    staleTime: 0,
    gcTime: 0,
    placeholderData: () => {
      const cachedArticles = queryClient.getQueryData<Article[]>(['articles']);
      if (cachedArticles && article?.category_id) {
        return cachedArticles
          .filter(a => a.category_id !== article.category_id && a.id !== article.id)
          .slice(0, 5);
      }
      return [];
    },
  });

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
