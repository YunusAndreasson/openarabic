import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { ARTICLE_QUERY_KEYS } from '@/constants/queryKeys';
import { articlesService } from '@/services/articles';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import { getArticlesByDueWords } from '@/utils/articleUtils';

interface UseArticlesByDueWordsResult {
  articles: Article[];
  isLoading: boolean;
  dueWordsCount: number;
  hasEnoughArticles: boolean; // Flag to determine if we have enough articles (≥1)
  dueWordRootIds: Set<number>; // Set of root IDs for words that are due
}

/**
 * Hook to fetch and sort articles based on the number of due words they contain
 * Provides fallback to show articles with any study words when no due words exist
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
    queryKey: userId ? FSRS_QUERY_KEYS.due(userId) : FSRS_QUERY_KEYS.FALLBACK.due,
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(userId, {
        onlyDue: true,
        limit: 200, // Increased from 100 to support larger vocabularies
        forStats: false, // We need root data for matching
        // Align due words with practice cooldown so freshly reviewed words
        // do not appear in recommendations immediately after a session
        sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
      });
    },
    enabled: !!userId,
    staleTime: 60000, // 1 minute - due words change frequently
    gcTime: 300000, // 5 minutes
    retry: 2,
  });

  // Fallback: fetch all study words if no due words (for better recommendations)
  const { data: allStudyWords = [], isLoading: isLoadingAllWords } = useQuery({
    queryKey: userId
      ? FSRS_QUERY_KEYS.allWithCooldown(userId, DEFAULT_SESSION_COOLDOWN_HOURS)
      : FSRS_QUERY_KEYS.FALLBACK.allWithCooldown(DEFAULT_SESSION_COOLDOWN_HOURS),
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(userId, {
        forStats: false, // We need root data for matching
        sessionCooldownHours: DEFAULT_SESSION_COOLDOWN_HOURS,
        limit: 100, // Reasonable limit for fallback
      });
    },
    enabled: !!userId && dueWords.length === 0, // Only fetch if no due words
    staleTime: 180000, // 3 minutes - all words change less frequently
    gcTime: 600000, // 10 minutes
    retry: 2,
  });

  // Use due words if available, otherwise fallback to all study words
  const wordsToUse = useMemo(() => {
    return dueWords.length > 0 ? dueWords : allStudyWords;
  }, [dueWords, allStudyWords]);

  // Extract set of root IDs from words for highlighting and matching
  const dueWordRootIds = useMemo(() => {
    return new Set(wordsToUse.map(word => word.root_id));
  }, [wordsToUse]);

  // Use optimized articles query with word stats (shared cache with other hooks)
  const { data: articlesData = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ARTICLE_QUERY_KEYS.withStats(),
    queryFn: () => {
      if (!wordsToUse.length || limit <= 0) return Promise.resolve([]);
      return articlesService.getArticlesWithWordStats();
    },
    enabled: !!userId && wordsToUse.length > 0 && limit > 0,
    staleTime: 3600000, // 1 hour - articles update max once a day
    gcTime: 7200000, // 2 hours
    retry: 2,
  });

  // Process and sort articles by words count
  const sortedArticles = useMemo(() => {
    if (limit <= 0) return [];
    const isLoadingWords = isLoadingDueWords || (dueWords.length === 0 && isLoadingAllWords);
    if (isLoadingWords || (isLoadingArticles && wordsToUse.length > 0) || !wordsToUse.length) {
      return [];
    }
    return getArticlesByDueWords(articlesData, wordsToUse, limit);
  }, [
    articlesData,
    wordsToUse,
    isLoadingDueWords,
    isLoadingAllWords,
    isLoadingArticles,
    limit,
    dueWords.length,
  ]);

  // Flag to determine if we have enough articles with words (≥1)
  const hasEnoughArticles = useMemo(() => {
    if (limit <= 0) return false;
    return sortedArticles.length >= 1;
  }, [sortedArticles.length, limit]);

  // Count of due words for stats (only actual due words, not fallback)
  const dueWordsCount = useMemo(() => {
    return dueWords.length;
  }, [dueWords.length]);

  const isLoading =
    isLoadingDueWords ||
    (dueWords.length === 0 && isLoadingAllWords) ||
    (limit > 0 && isLoadingArticles && wordsToUse.length > 0);

  return {
    articles: sortedArticles,
    isLoading,
    dueWordsCount,
    hasEnoughArticles,
    dueWordRootIds,
  };
}
