import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Article } from '../types/articles.types';
import type { StudyWord } from '../types/vocabulary.types';
import { getArticlesByDueWords } from '../utils/articleUtils';
import { studyWordsFSRSService } from '../services/studyWordsFSRS';
import { articlesService } from '../services/articles';

interface UseArticlesByDueWordsResult {
  articles: Article[];
  isLoading: boolean;
  dueWordsCount: number;
  hasEnoughArticles: boolean; // Flag to determine if we have enough articles (≥3)
  dueWordRootIds: Set<number>; // Set of root IDs for words that are due for review
}

/**
 * Hook to fetch and sort articles based on the number of due words they contain
 * @param userId - The current user ID
 * @param limit - Maximum number of articles to return
 * @returns Object containing sorted articles and metadata
 */
export function useArticlesByDueWords(
  userId: string | undefined,
  limit = 10
): UseArticlesByDueWordsResult {
  // Fetch due words for the current user
  const { data: dueWords = [], isLoading: isLoadingDueWords } = useQuery({
    queryKey: ['due-words', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true });
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
  });

  // Extract set of root IDs from due words for highlighting
  const dueWordRootIds = useMemo(() => {
    return new Set(dueWords.map(word => word.root_id));
  }, [dueWords]);

  // Fetch all articles with their sentences and words in a single query
  const { data: articlesData = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ['articles-with-sentences-and-words'],
    queryFn: async () => {
      if (!dueWords.length) return [];
      return articlesService.getArticlesWithSentencesAndWords();
    },
    enabled: !!userId && dueWords.length > 0,
    staleTime: 600000, // 10 minutes
  });

  // Process and sort articles by due words count
  const sortedArticles = useMemo(() => {
    if (isLoadingDueWords || isLoadingArticles || !dueWords.length) return [];
    return getArticlesByDueWords(articlesData, dueWords, limit);
  }, [articlesData, dueWords, isLoadingDueWords, isLoadingArticles, limit]);

  // Flag to determine if we have enough articles with due words (≥3)
  const hasEnoughArticles = useMemo(() => {
    return sortedArticles.length >= 3;
  }, [sortedArticles.length]);

  return {
    articles: sortedArticles,
    isLoading: isLoadingDueWords || isLoadingArticles,
    dueWordsCount: dueWords.length,
    hasEnoughArticles,
    dueWordRootIds,
  };
}
