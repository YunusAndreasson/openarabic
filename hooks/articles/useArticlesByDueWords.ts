import { skipToken, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { articleQueries, fsrsQueries, gated } from '@/constants/queries';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import { getArticlesByDueWords } from '@/utils/articleUtils';

interface UseArticlesByDueWordsResult {
  articles: Article[];
  isLoading: boolean;
  dueWordsCount: number;
  hasEnoughArticles: boolean; // Flag to determine if we have enough articles (≥1)
  dueWordRootIds: Set<RootId>; // Set of root IDs for words that are due
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
  limit = 10,
): UseArticlesByDueWordsResult {
  // Fetch due words for the current user with optimized query
  const { data: dueWords = [], isLoading: isLoadingDueWords } = useQuery({
    ...gated(fsrsQueries.due, userId),
  });

  // Fallback: fetch all study words if no due words (for better recommendations)
  // Second gate beyond the user id: only reach for the full list when the due
  // query came back empty.
  const { data: allStudyWords = [], isLoading: isLoadingAllWords } = useQuery({
    ...gated(
      id => fsrsQueries.allWithCooldown(id, DEFAULT_SESSION_COOLDOWN_HOURS),
      userId && dueWords.length === 0 ? userId : undefined,
    ),
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
  const shouldFetchArticles = !!userId && wordsToUse.length > 0 && limit > 0;
  const { data: articlesData = [], isLoading: isLoadingArticles } = useQuery({
    ...articleQueries.withStats(),
    queryFn: shouldFetchArticles ? () => articlesService.getArticlesWithWordStats() : skipToken,
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
  const hasEnoughArticles = limit > 0 && sortedArticles.length >= 1;

  // Count of due words for stats (only actual due words, not fallback)
  const dueWordsCount = dueWords.length;

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
