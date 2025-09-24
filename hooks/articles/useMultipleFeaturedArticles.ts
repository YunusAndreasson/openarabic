import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { getBeginnerArticles } from '@/utils/articleUtils';

interface MultipleFeaturedArticlesResult {
  articles: Article[];
  reason: string;
  type: 'due-words' | 'difficult-words' | 'beginner' | 'random';
  dueWordRootIds: Set<number>;
}

interface CachedMultipleSelection {
  articles: Article[];
  refreshKey: number;
  scope: string;
}

// Number of articles to return in the slider
const MAX_FEATURED_ARTICLES = 5;

/**
 * Helper function to shuffle array and return first N items
 */
const getRandomArticles = (articles: Article[], count: number): Article[] => {
  if (articles.length <= count) return [...articles];

  const shuffled = [...articles];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    const other = shuffled[j];
    if (temp !== undefined && other !== undefined) {
      shuffled[i] = other;
      shuffled[j] = temp;
    }
  }

  return shuffled.slice(0, count);
};

/**
 * Generic hook for multiple featured articles selection
 * @param articlesData - The articles to select from (can be all articles or filtered subset)
 * @param refreshKey - Key to trigger new selections
 * @param scope - Scope identifier for caching ('global', 'category-{id}', etc.)
 */
export function useMultipleFeaturedArticles(
  articlesData: Article[],
  refreshKey: number,
  scope: string = 'global'
): MultipleFeaturedArticlesResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Try to get cached featured articles first for immediate display
  const cachedFeatured = queryClient.getQueryData<MultipleFeaturedArticlesResult>([
    'featured-articles',
    scope,
    refreshKey,
  ]);

  // Use the existing hooks for due and difficult words
  const { hasEnoughArticles: hasDueWordArticles, dueWordRootIds } = useArticlesByDueWords(
    user?.id,
    10
  );

  const { hasEnoughArticles: hasDifficultWordArticles, difficultWordRootIds } =
    useArticlesByDifficultWords(user?.id, 10);

  const { data: allStudyWords = [] } = useQuery({
    queryKey: FSRS_QUERY_KEYS.allWithCooldown(user?.id || '', DEFAULT_SESSION_COOLDOWN_HOURS),
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(user.id, {
        forStats: true,
        limit: 1,
      });
    },
    enabled: !!user?.id,
    staleTime: 180000,
    gcTime: 600000,
  });

  const hasAnyStudyWords = allStudyWords.length > 0;

  // Cache the initial selection to prevent flashing
  const initialSelectionRef = useRef<CachedMultipleSelection | null>(null);

  // Memoize expensive computations
  const articlesLength = useMemo(() => articlesData.length, [articlesData.length]);
  const hasArticles = useMemo(() => articlesLength > 0, [articlesLength]);

  // State to store the computed selection
  const [selectedArticles, setSelectedArticles] = useState<MultipleFeaturedArticlesResult>(() => {
    // Return cached data immediately if available
    if (cachedFeatured) {
      return cachedFeatured;
    }

    // If no cached data but we have articles, use first 5 as immediate fallback
    if (articlesData.length > 0) {
      const fallbackArticles = articlesData.slice(0, 5);
      return {
        articles: fallbackArticles,
        reason: STRINGS.RECOMMENDED,
        type: 'random' as const,
        dueWordRootIds: new Set<number>(),
      };
    }

    // Otherwise show loading
    return {
      articles: [],
      reason: STRINGS.LOADING_ARTICLES,
      type: 'random',
      dueWordRootIds: new Set<number>(),
    };
  });

  // Use cached featured articles immediately if available
  useEffect(() => {
    if (cachedFeatured) {
      setSelectedArticles(cachedFeatured);
    }
  }, [cachedFeatured]);

  // Article selection logic - moved to useEffect to prevent infinite re-renders
  React.useEffect(() => {
    if (!hasArticles) {
      setSelectedArticles({
        articles: [],
        reason: STRINGS.LOADING_ARTICLES,
        type: 'random',
        dueWordRootIds: new Set<number>(),
      });
      return;
    }

    // Use requestIdleCallback to defer expensive computation if available
    const performSelection = () => {
      // For initial load (refreshKey === 0), cache and reuse the first intelligent selection
      if (refreshKey === 0) {
        if (
          !initialSelectionRef.current ||
          initialSelectionRef.current.refreshKey !== 0 ||
          initialSelectionRef.current.scope !== scope
        ) {
          // First time or scope change - perform intelligent selection
          let intelligentSelection: MultipleFeaturedArticlesResult;

          // Strategy 1: If user has due words and enough articles with those words
          if (user?.id && hasDueWordArticles && dueWordRootIds.size > 0) {
            const dueWordArticles = articlesData.filter(article =>
              article.article_sentences?.some(sentence =>
                sentence.sentence_words?.some((word: SentenceWord) =>
                  dueWordRootIds.has(word.root_id)
                )
              )
            );

            if (dueWordArticles.length > 0) {
              intelligentSelection = {
                articles: getRandomArticles(dueWordArticles, MAX_FEATURED_ARTICLES),
                reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE,
                type: 'due-words',
                dueWordRootIds,
              };
            } else {
              // Fallback to random selection
              intelligentSelection = {
                articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
                reason: STRINGS.RECOMMENDED,
                type: 'random' as const,
                dueWordRootIds,
              };
            }
          }
          // Strategy 2: If user has difficult words and study progress
          else if (
            user?.id &&
            hasDifficultWordArticles &&
            difficultWordRootIds.size > 0 &&
            hasAnyStudyWords
          ) {
            const difficultWordArticles = articlesData.filter(article =>
              article.article_sentences?.some(sentence =>
                sentence.sentence_words?.some((word: SentenceWord) =>
                  difficultWordRootIds.has(word.root_id)
                )
              )
            );

            if (difficultWordArticles.length > 0) {
              intelligentSelection = {
                articles: getRandomArticles(difficultWordArticles, MAX_FEATURED_ARTICLES),
                reason: STRINGS.CHOSEN_TO_REINFORCE_CHALLENGING,
                type: 'difficult-words',
                dueWordRootIds,
              };
            } else {
              // Fallback to random selection
              intelligentSelection = {
                articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
                reason: STRINGS.RECOMMENDED,
                type: 'random' as const,
                dueWordRootIds,
              };
            }
          }
          // Strategy 3: If new user, show beginner-friendly articles
          else if (!user?.id || !hasAnyStudyWords) {
            const beginnerArticles = getBeginnerArticles(articlesData);
            if (beginnerArticles.length > 0) {
              intelligentSelection = {
                articles: getRandomArticles(beginnerArticles, MAX_FEATURED_ARTICLES),
                reason: STRINGS.RECOMMENDED,
                type: 'beginner',
                dueWordRootIds,
              };
            } else {
              // Fallback to random selection
              intelligentSelection = {
                articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
                reason: STRINGS.RECOMMENDED,
                type: 'random' as const,
                dueWordRootIds,
              };
            }
          }
          // Strategy 4: Fallback to random selection
          else {
            intelligentSelection = {
              articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
              reason: STRINGS.RECOMMENDED,
              type: 'random' as const,
              dueWordRootIds,
            };
          }

          // Cache the intelligent selection
          initialSelectionRef.current = {
            articles: intelligentSelection.articles,
            refreshKey: 0,
            scope,
          };

          setSelectedArticles(intelligentSelection);
        } else {
          // Return cached selection for consistent display
          setSelectedArticles({
            articles: initialSelectionRef.current.articles,
            reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE, // Default reason for cached
            type: 'due-words', // Default type for cached
            dueWordRootIds,
          });
        }
      } else {
        // For refreshes, always perform new selection for variety
        setSelectedArticles({
          articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
          reason: STRINGS.RECOMMENDED,
          type: 'random' as const,
          dueWordRootIds,
        });
      }
    };

    // Defer computation using setTimeout to prevent blocking the UI thread
    // Use a small delay to allow the UI to render first
    setTimeout(performSelection, 0);
  }, [
    hasArticles,
    refreshKey,
    scope,
    user?.id,
    hasDueWordArticles,
    dueWordRootIds,
    hasDifficultWordArticles,
    difficultWordRootIds,
    hasAnyStudyWords,
    articlesData, // Add articlesData as dependency
  ]);

  return selectedArticles;
}
