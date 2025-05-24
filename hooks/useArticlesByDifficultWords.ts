import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Article } from '../types/articles.types';
import { getArticlesByDifficultWords } from '../utils/articleUtils';
import { strugglingWordsService } from '../services/strugglingWords';
import { articlesService } from '../services/articles';

interface UseArticlesByDifficultWordsResult {
  articles: Article[];
  isLoading: boolean;
  difficultWordsCount: number;
  hasEnoughArticles: boolean; // Flag to determine if we have enough articles (≥3)
  difficultWordRootIds: Set<number>; // Set of root IDs for words that are difficult
}

/**
 * Hook to fetch and sort articles based on the number of difficult words they contain
 * @param userId - The current user ID
 * @param limit - Maximum number of articles to return
 * @returns Object containing sorted articles and metadata
 */
export function useArticlesByDifficultWords(
  userId: string | undefined,
  limit = 10
): UseArticlesByDifficultWordsResult {
  // Fetch difficult words for the current user
  const { data: difficultWords = [], isLoading: isLoadingDifficultWords } = useQuery({
    queryKey: ['difficultWords', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve([]);
      return strugglingWordsService.getStrugglingWords(userId, 20); // Get more words for better article matching
    },
    enabled: !!userId,
    staleTime: 300000, // 5 minutes
  });

  // Extract set of root IDs from difficult words for highlighting
  const difficultWordRootIds = useMemo(() => {
    return new Set(difficultWords.map(word => word.root_id));
  }, [difficultWords]);

  // Fetch all articles with their sentences and words in a single query
  const { data: articlesData = [], isLoading: isLoadingArticles } = useQuery({
    queryKey: ['articles-with-sentences-and-words'],
    queryFn: async () => {
      if (!difficultWords.length) return [];
      return articlesService.getArticlesWithSentencesAndWords();
    },
    enabled: !!userId && difficultWords.length > 0,
    staleTime: 600000, // 10 minutes
  });

  // Process and sort articles by difficult words count
  const sortedArticles = useMemo(() => {
    if (
      isLoadingDifficultWords ||
      (isLoadingArticles && difficultWords.length > 0) ||
      !difficultWords.length
    )
      return [];
    return getArticlesByDifficultWords(articlesData, difficultWords, limit);
  }, [articlesData, difficultWords, isLoadingDifficultWords, isLoadingArticles, limit]);

  // Flag to determine if we have enough articles with difficult words (≥3)
  const hasEnoughArticles = useMemo(() => {
    return sortedArticles.length >= 3;
  }, [sortedArticles.length]);

  // Fix loading state calculation to handle when there are no difficult words
  const isLoading = useMemo(() => {
    // We're loading if difficult words are loading
    if (isLoadingDifficultWords) return true;

    // If difficult words have loaded but are empty, we're not loading anymore
    if (difficultWords.length === 0) return false;

    // Otherwise, we're loading if articles are loading
    return isLoadingArticles;
  }, [isLoadingDifficultWords, difficultWords.length, isLoadingArticles]);

  return {
    articles: sortedArticles,
    isLoading,
    difficultWordsCount: difficultWords.length,
    hasEnoughArticles,
    difficultWordRootIds,
  };
}
