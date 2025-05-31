import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Article } from '../types/articles.types';
import { getArticlesByDueWords } from '../utils/articleUtils';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '../services/studyWordsFSRS';
import { articlesService } from '../services/articles';

interface UseArticlesByDueWordsResult {
  articles: Article[];
  isLoading: boolean;
  dueWordsCount: number;
  hasEnoughArticles: boolean; // Flag to determine if we have enough articles (≥3)
  dueWordRootIds: Set<number>; // Set of root IDs for words that are due
}

/**
 * Hook to fetch and sort articles based on the number of due words they contain
 * Optimized to use smart queries and reduce data fetching overhead
 * @param userId - The current user ID
 * @param limit - Maximum number of articles to return
 * @returns Object containing sorted articles and metadata
 */
export function useArticlesByDueWords(
  userId: string | undefined,
  limit = 10
): UseArticlesByDueWordsResult {
  // Fetch due words for the current user with optimized query
  const { data: dueWords = [], isLoading: isLoadingDueWords } = useQuery({
    queryKey: FSRS_QUERY_KEYS.due(userId || ''),
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        limit: 200, // Increased from 100 to support larger vocabularies
        forStats: false, // We need root data for matching
      });
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute - due words change frequently
    gcTime: 300000, // 5 minutes
    retry: 2,
  });

  // Extract set of root IDs from due words for highlighting and matching
  const dueWordRootIds = useMemo(() => {
    return new Set(dueWords.map(word => word.root_id));
  }, [dueWords]);

  // Use optimized articles query with word stats (shared cache with other hooks)
  const { data: articlesData = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ['articles', 'with-word-stats'],
    queryFn: () => {
      if (!dueWords.length) return Promise.resolve([]);
      return articlesService.getArticlesWithWordStats();
    },
    enabled: !!userId && dueWords.length > 0,
    staleTime: 3600000, // 1 hour - articles update max once a day
    gcTime: 7200000, // 2 hours
    retry: 2,
  });

  // Process and sort articles by due words count
  const sortedArticles = useMemo(() => {
    if (isLoadingDueWords || (isLoadingArticles && dueWords.length > 0) || !dueWords.length) {
      return [];
    }
    return getArticlesByDueWords(articlesData, dueWords, limit);
  }, [articlesData, dueWords, isLoadingDueWords, isLoadingArticles, limit]);

  // Flag to determine if we have enough articles with due words (≥3)
  const hasEnoughArticles = useMemo(() => {
    return sortedArticles.length >= 3;
  }, [sortedArticles.length]);

  // Count of due words for stats
  const dueWordsCount = useMemo(() => {
    return dueWords.length;
  }, [dueWords.length]);

  return {
    articles: sortedArticles,
    isLoading: isLoadingDueWords || (isLoadingArticles && dueWords.length > 0),
    dueWordsCount,
    hasEnoughArticles,
    dueWordRootIds,
  };
}
