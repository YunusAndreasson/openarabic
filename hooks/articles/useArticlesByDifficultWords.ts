import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { articleQueries } from '@/constants/queries';
import { articlesService } from '@/services/articles';
import { strugglingWordsService } from '@/services/strugglingWords';
import type { Article } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import { getArticlesByDifficultWords } from '@/utils/articleUtils';

interface UseArticlesByDifficultWordsResult {
  articles: Article[];
  isLoading: boolean;
  difficultWordsCount: number;
  hasEnoughArticles: boolean; // Flag to determine if we have enough articles (≥3)
  difficultWordRootIds: Set<RootId>; // Set of root IDs for words that are difficult
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
  limit = 10,
): UseArticlesByDifficultWordsResult {
  // Fetch difficult words for the current user with optimized query
  const { data: difficultWords = [], isLoading: isLoadingDifficultWords } = useQuery({
    queryKey: ['struggling-words', userId, 50] as const,
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
    ...articleQueries.withStats(),
    queryFn: () => {
      if (!difficultWords.length) return Promise.resolve([]);
      return articlesService.getArticlesWithWordStats();
    },
    enabled: !!userId && difficultWords.length > 0,
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
