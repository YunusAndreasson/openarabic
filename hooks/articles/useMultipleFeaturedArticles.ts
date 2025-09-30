import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  // Use the existing hooks for due and difficult words with cached data
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

  // Convert Sets to stable array representations for dependencies
  const stableDueWordRootIds = useMemo(() => Array.from(dueWordRootIds).sort(), [dueWordRootIds]);
  const stableDifficultWordRootIds = useMemo(
    () => Array.from(difficultWordRootIds).sort(),
    [difficultWordRootIds]
  );

  // State to store the computed selection
  const [selectedArticles, setSelectedArticles] = useState<MultipleFeaturedArticlesResult>(() => {
    // Return cached data immediately if available (from preloader)
    if (cachedFeatured) {
      return cachedFeatured;
    }

    // If we have articles, return them immediately to prevent loading state
    if (articlesData.length > 0) {
      const immediateArticles = articlesData.slice(0, 5);
      return {
        articles: immediateArticles,
        reason: STRINGS.RECOMMENDED,
        type: 'random' as const,
        dueWordRootIds: new Set<number>(),
      };
    }

    // Show loading only if no data at all
    return {
      articles: [],
      reason: STRINGS.LOADING_ARTICLES,
      type: 'random',
      dueWordRootIds: new Set<number>(),
    };
  });

  // Track if we've already initialized to prevent infinite loops
  const hasInitializedRef = useRef(false);

  // Use cached featured articles immediately if available
  useEffect(() => {
    if (cachedFeatured && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setSelectedArticles(cachedFeatured);
    }
  }, [cachedFeatured]);

  // Memoize the selection logic to prevent infinite re-renders
  const selectionLogic = useCallback(() => {
    // Determine the selection strategy and compute the result once
    let result: MultipleFeaturedArticlesResult;

    if (!hasArticles) {
      result = {
        articles: [],
        reason: STRINGS.LOADING_ARTICLES,
        type: 'random',
        dueWordRootIds: new Set<number>(),
      };
    } else if (cachedFeatured) {
      // Use cached featured articles from preloader
      result = cachedFeatured;
    } else if (refreshKey === 0) {
      // For initial load (refreshKey === 0), use intelligent selection
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

        result = intelligentSelection;
      } else {
        // Return cached selection for consistent display
        result = {
          articles: initialSelectionRef.current.articles,
          reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE, // Default reason for cached
          type: 'due-words', // Default type for cached
          dueWordRootIds,
        };
      }
    } else {
      // For refreshes, always perform new selection for variety
      result = {
        articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
        reason: STRINGS.RECOMMENDED,
        type: 'random' as const,
        dueWordRootIds,
      };
    }

    // Set the result only once per execution
    setSelectedArticles(result);
    return result;
  }, [
    hasArticles,
    cachedFeatured,
    refreshKey,
    scope,
    user?.id,
    hasDueWordArticles,
    stableDueWordRootIds, // Use stable array instead of Set
    hasDifficultWordArticles,
    stableDifficultWordRootIds, // Use stable array instead of Set
    hasAnyStudyWords,
    articlesData,
  ]);

  // Run selection logic when dependencies change
  useEffect(() => {
    // For initial load (refreshKey === 0), only run if not initialized
    if (refreshKey === 0 && hasInitializedRef.current) return;

    // For refresh (refreshKey > 0), always run to get new selection
    if (refreshKey > 0 || !hasInitializedRef.current) {
      // Mark as initialized for initial load
      if (refreshKey === 0) {
        hasInitializedRef.current = true;
      }

      // Only run if we have articles and no cached data
      if (hasArticles && !cachedFeatured) {
        selectionLogic();
      }
    }
  }, [hasArticles, cachedFeatured, selectionLogic, refreshKey]);

  return selectedArticles;
}
