import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { articlesService } from '@/services/articles';
import { strugglingWordsService } from '@/services/strugglingWords';
import type { Article } from '@/types/articles.types';
import { getArticlesByDifficultWords } from '@/utils/articleUtils';

interface UseArticlesByDifficultWordsResult {
  articles: Article[];
  isLoading: boolean;
  difficultWordsCount: number;
  hasEnoughArticles: boolean; // Flag to determine if we have enough articles (≥3)
  difficultWordRootIds: Set<number>; // Set of root IDs for words that are difficult
}

/**
 * Hook to fetch and sort articles based on the number of difficult words they contain
 * Optimized to use smart queries and reduce data fetching overhead
 * @param userId - The current user ID
 * @param limit - Maximum number of articles to return
 * @returns Object containing sorted articles and metadata
 */
export function useArticlesByDifficultWords(
  userId: string | undefined,
  limit = 10
): UseArticlesByDifficultWordsResult {
  // Fetch difficult words for the current user with optimized query
  const { data: difficultWords = [], isLoading: isLoadingDifficultWords } = useQuery({
    queryKey: userId ? FSRS_QUERY_KEYS.struggling(userId, 50) : ['struggling-words'],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return strugglingWordsService.getStrugglingWords(userId, 50);
    },
    enabled: !!userId,
    staleTime: 180000, // 3 minutes - struggling words change less frequently than due words
    gcTime: 600000, // 10 minutes
    retry: 2,
  });

  // Extract set of root IDs from difficult words for highlighting and matching
  const difficultWordRootIds = useMemo(() => {
    return new Set(difficultWords.map(word => word.root_id));
  }, [difficultWords]);

  // Use optimized articles query with word stats (shared cache with due words hook)
  const { data: articlesData = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ['articles', 'with-word-stats'],
    queryFn: () => {
      if (!difficultWords.length) return Promise.resolve([]);
      return articlesService.getArticlesWithWordStats();
    },
    enabled: !!userId && difficultWords.length > 0,
    staleTime: 3600000, // 1 hour - articles update max once a day
    gcTime: 7200000, // 2 hours
    retry: 2,
  });

  // Process and sort articles by difficult words count
  const sortedArticles = useMemo(() => {
    if (
      isLoadingDifficultWords ||
      (isLoadingArticles && difficultWords.length > 0) ||
      !difficultWords.length
    ) {
      return [];
    }
    return getArticlesByDifficultWords(articlesData, difficultWords, limit);
  }, [articlesData, difficultWords, isLoadingDifficultWords, isLoadingArticles, limit]);

  // Flag to determine if we have enough articles with difficult words (≥3)
  const hasEnoughArticles = useMemo(() => {
    return sortedArticles.length >= 3;
  }, [sortedArticles.length]);

  // Count of difficult words for stats
  const difficultWordsCount = useMemo(() => {
    return difficultWords.length;
  }, [difficultWords.length]);

  return {
    articles: sortedArticles,
    isLoading: isLoadingDifficultWords || (isLoadingArticles && difficultWords.length > 0),
    difficultWordsCount,
    hasEnoughArticles,
    difficultWordRootIds,
  };
}
