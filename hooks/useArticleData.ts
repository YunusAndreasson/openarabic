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

  // Fetch article data
  const {
    data: article,
    isLoading: isLoadingArticle,
    error: articleError,
  } = useQuery({
    queryKey: ['article', articleId],
    queryFn: () => articlesService.getArticleById(articleId!),
    enabled: !!articleId,
    staleTime: isDataPrefetched ? 0 : 300000, // 5 minutes cache
    placeholderData: () => {
      // Use the article from the articles list as placeholder while full article loads
      const cachedArticles = queryClient.getQueryData<Article[]>(['articles']);
      const cachedArticle = cachedArticles?.find((a: Article) => a.id === articleId);
      if (cachedArticle) {
        return {
          ...cachedArticle,
          // Include empty article_sentences to prevent null errors
          article_sentences: [],
        };
      }
      return undefined;
    },
  });

  // Check if article is in user's reading list
  const {
    data: isInReadingList = false,
    refetch: refetchReadingListStatus,
    isLoading: isLoadingReadingList,
  } = useQuery({
    queryKey: ['readingList', userId, articleId],
    queryFn: () => readingListService.isInReadingList(userId!, articleId!),
    enabled: !!userId && !!articleId,
    staleTime: 60000, // 1 minute cache
  });

  // Fetch study words using FSRS service
  const { data: studyWords = [] } = useQuery<FSRSStudyWord[]>({
    queryKey: ['studyWords', userId],
    queryFn: async () => {
      if (!userId) return [];
      return studyWordsFSRSService.getFSRSWords(userId);
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute cache
  });

  // Extract sentence words from article
  const {
    data: sentences = [],
    isLoading: isLoadingSentences,
    error: sentencesError,
  } = useQuery<ArticleSentence[]>({
    queryKey: ['sentences', articleId],
    queryFn: async () => {
      if (!articleId) return [];

      // If article already has sentences, use those instead of fetching
      if (article?.article_sentences) {
        return article.article_sentences;
      }

      // Otherwise fetch sentences
      const articleData = await articlesService.getArticleById(articleId);
      return articleData.article_sentences || [];
    },
    enabled: !!articleId,
    staleTime: isDataPrefetched ? 0 : 300000, // 5 minutes cache
  });

  // Sort sentences by position
  const sortedSentences = useMemo(() => {
    return [...sentences].sort((a, b) => a.position - b.position);
  }, [sentences]);

  // Extract selected word IDs
  const selectedWordIds = useMemo(() => {
    return new Set(studyWords.map(w => w.sentence_word_id.toString()));
  }, [studyWords]);

  // Create a map of sentence ID to array of sentence words
  const sentenceWordsMap = useMemo(() => {
    // If there are no sentences, return an empty query result
    if (sortedSentences.length === 0) {
      return {
        data: new Map(),
        isLoading: false,
      };
    }

    // Extract the sentence IDs from sortedSentences
    const sentenceIds = sortedSentences.map(sentence => sentence.id);

    // Use existing sentence words data if available in the article sentences
    const existingSentenceWords = new Map<number, SentenceWord[]>();
    sortedSentences.forEach(sentence => {
      if (sentence.sentence_words) {
        existingSentenceWords.set(
          sentence.id,
          sentence.sentence_words.sort((a, b) => a.position - b.position)
        );
      }
    });

    // If all sentences have words, return that data without fetching
    if (sentenceIds.length === existingSentenceWords.size) {
      return {
        data: existingSentenceWords,
        isLoading: false,
      };
    }

    // Otherwise fetch sentence words
    return useQuery<Map<number, SentenceWord[]>>({
      queryKey: ['sentenceWords', sentenceIds],
      queryFn: async () => {
        // Get all words for all sentences
        const allWords: SentenceWord[] = [];

        // For each sentence, get its words either from existing data or fetch
        for (const sentenceId of sentenceIds) {
          if (existingSentenceWords.has(sentenceId)) {
            allWords.push(...(existingSentenceWords.get(sentenceId) || []));
          } else {
            // This is a simplified approach - in reality, you'd want to batch fetch these
            // but we're working with the existing API structure
            const sentence = await articlesService.getArticleById(articleId!);
            const words =
              sentence.article_sentences?.find(s => s.id === sentenceId)?.sentence_words || [];
            allWords.push(...words);
          }
        }

        // Group by sentence ID
        const map = new Map<number, SentenceWord[]>();
        allWords.forEach(word => {
          if (!map.has(word.sentence_id)) {
            map.set(word.sentence_id, []);
          }
          map.get(word.sentence_id)!.push(word);
        });

        // Sort words by position within each sentence
        map.forEach(words => {
          words.sort((a, b) => a.position - b.position);
        });

        return map;
      },
      enabled: sentenceIds.length > 0,
      staleTime: isDataPrefetched ? 0 : 300000, // 5 minutes cache for regular use
      initialData: existingSentenceWords.size > 0 ? existingSentenceWords : undefined,
    });
  }, [sortedSentences, articleId, isDataPrefetched]);

  // Get related articles
  const {
    data: otherArticles = [],
    isLoading: isLoadingOtherArticles,
    error: otherArticlesError,
  } = useQuery<Article[]>({
    queryKey: ['otherArticles', article?.category_id],
    queryFn: async () => {
      if (!article?.category_id) return [];
      // Get articles in the same category, excluding the current one
      const articles = await articlesService.getArticles(article.category_id);
      return articles.filter(a => a.id !== article.id);
    },
    enabled: !!article?.category_id,
    staleTime: isDataPrefetched ? 0 : 300000, // 5 minutes
    placeholderData: () => {
      // Try to create placeholder data from the articles cache
      const cachedArticles = queryClient.getQueryData<Article[]>(['articles']);
      if (cachedArticles && article?.category_id) {
        // Filter cached articles by category, excluding current article
        return cachedArticles
          .filter(a => a.category_id === article.category_id && a.id !== article.id)
          .slice(0, 5); // Limit to 5 articles for performance
      }
      return [];
    },
  });

  // Get similar category articles
  const {
    data: otherCategoryArticles = [],
    isLoading: isLoadingOtherCategoryArticles,
    error: otherCategoryArticlesError,
  } = useQuery<Article[]>({
    queryKey: ['otherCategoryArticles', article?.id],
    queryFn: async () => {
      if (!article?.id) return [];
      // Get articles from all categories, excluding current category
      const articles = await articlesService.getArticles();
      return articles.filter(a => a.category_id !== article.category_id && a.id !== article.id);
    },
    enabled: !!article?.id,
    staleTime: isDataPrefetched ? 0 : 300000, // 5 minutes
    placeholderData: () => {
      // Use cached articles from other categories
      const cachedArticles = queryClient.getQueryData<Article[]>(['articles']);
      if (cachedArticles && article?.category_id) {
        // Filter for articles from different categories
        return cachedArticles
          .filter(a => a.category_id !== article.category_id && a.id !== article.id)
          .slice(0, 5); // Limit to 5 articles for performance
      }
      return [];
    },
  });

  return {
    article,
    isLoadingArticle: isLoadingArticle || isLoadingSentences,
    articleError: articleError || sentencesError,
    isInReadingList,
    refetchReadingListStatus,
    isLoadingReadingList,
    selectedWordIds,
    sortedSentences,
    sentenceWordsMap: sentenceWordsMap.data,
    isLoadingSentenceWords: sentenceWordsMap.isLoading,
    otherArticles,
    isLoadingOtherArticles,
    otherArticlesError,
    otherCategoryArticles,
    isLoadingOtherCategoryArticles,
    otherCategoryArticlesError,
  };
};

export default useArticleData;
