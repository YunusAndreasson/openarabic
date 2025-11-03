import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { APP_SESSION_ID, fsrsQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
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
  sessionId: number;
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
  scope: string = 'global',
): MultipleFeaturedArticlesResult {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentSessionId = APP_SESSION_ID;

  // Try to get cached featured articles first for immediate display
  // Include APP_SESSION_ID to ensure fresh articles on each app launch
  const cachedFeatured = queryClient.getQueryData<MultipleFeaturedArticlesResult>([
    'featured-articles',
    scope,
    refreshKey,
    APP_SESSION_ID,
  ]);

  // Use the existing hooks for due and difficult words with cached data
  const { hasEnoughArticles: hasDueWordArticles, dueWordRootIds } = useArticlesByDueWords(
    user?.id,
    10,
  );

  const { hasEnoughArticles: hasDifficultWordArticles, difficultWordRootIds } =
    useArticlesByDifficultWords(user?.id, 10);

  const { data: allStudyWords = [] } = useQuery({
    ...fsrsQueries.allWithCooldown(user?.id || '', DEFAULT_SESSION_COOLDOWN_HOURS),
    enabled: !!user?.id,
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
    [difficultWordRootIds],
  );

  // Create stable Set from stable array to prevent infinite loops
  // This ensures the Set reference only changes when the actual word IDs change
  const stableDueWordSet = useMemo(
    () => new Set(stableDueWordRootIds),
    [stableDueWordRootIds.join(',')],
  );

  const stableDifficultWordSet = useMemo(
    () => new Set(stableDifficultWordRootIds),
    [stableDifficultWordRootIds.join(',')],
  );

  // State to store the computed selection (only for refreshes)
  const [selectedArticles, setSelectedArticles] = useState<MultipleFeaturedArticlesResult>(() => {
    // For initial load without cache, show first 5 articles immediately
    if (articlesData.length > 0 && refreshKey === 0) {
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

  // Prevent rapid re-execution during cascading data updates
  const isUpdatingRef = useRef(false);

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
    } else if (refreshKey === 0) {
      // For initial load (refreshKey === 0), use intelligent selection
      if (
        initialSelectionRef.current?.refreshKey !== 0 ||
        initialSelectionRef.current.scope !== scope ||
        initialSelectionRef.current.sessionId !== currentSessionId
      ) {
        // First time or scope change - perform intelligent selection
        let intelligentSelection: MultipleFeaturedArticlesResult;

        // Strategy 1: If user has due words and enough articles with those words
        if (user?.id && hasDueWordArticles && stableDueWordSet.size > 0) {
          const dueWordArticles = articlesData.filter(article =>
            article.article_sentences?.some(sentence =>
              sentence.sentence_words?.some((word: SentenceWord) =>
                stableDueWordSet.has(word.root_id),
              ),
            ),
          );

          if (dueWordArticles.length > 0) {
            intelligentSelection = {
              articles: getRandomArticles(dueWordArticles, MAX_FEATURED_ARTICLES),
              reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE,
              type: 'due-words',
              dueWordRootIds: stableDueWordSet,
            };
          } else {
            intelligentSelection = {
              articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
              reason: STRINGS.RECOMMENDED,
              type: 'random' as const,
              dueWordRootIds: stableDueWordSet,
            };
          }
        }
        // Strategy 2: If user has difficult words and study progress
        else if (
          user?.id &&
          hasDifficultWordArticles &&
          stableDifficultWordSet.size > 0 &&
          hasAnyStudyWords
        ) {
          const difficultWordArticles = articlesData.filter(article =>
            article.article_sentences?.some(sentence =>
              sentence.sentence_words?.some((word: SentenceWord) =>
                stableDifficultWordSet.has(word.root_id),
              ),
            ),
          );

          if (difficultWordArticles.length > 0) {
            intelligentSelection = {
              articles: getRandomArticles(difficultWordArticles, MAX_FEATURED_ARTICLES),
              reason: STRINGS.CHOSEN_TO_REINFORCE_CHALLENGING,
              type: 'difficult-words',
              dueWordRootIds: stableDueWordSet,
            };
          } else {
            intelligentSelection = {
              articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
              reason: STRINGS.RECOMMENDED,
              type: 'random' as const,
              dueWordRootIds: stableDueWordSet,
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
              dueWordRootIds: stableDueWordSet,
            };
          } else {
            intelligentSelection = {
              articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
              reason: STRINGS.RECOMMENDED,
              type: 'random' as const,
              dueWordRootIds: stableDueWordSet,
            };
          }
        }
        // Strategy 4: Fallback to random selection
        else {
          intelligentSelection = {
            articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
            reason: STRINGS.RECOMMENDED,
            type: 'random' as const,
            dueWordRootIds: stableDueWordSet,
          };
        }

        // Cache the intelligent selection (including session ID for fresh selection on app relaunch)
        initialSelectionRef.current = {
          articles: intelligentSelection.articles,
          refreshKey: 0,
          scope,
          sessionId: currentSessionId,
        };

        result = intelligentSelection;
      } else {
        // Return cached selection for consistent display
        result = {
          articles: initialSelectionRef.current.articles,
          reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE, // Default reason for cached
          type: 'due-words', // Default type for cached
          dueWordRootIds: stableDueWordSet,
        };
      }
    } else {
      // For refreshes, always perform new selection for variety
      result = {
        articles: getRandomArticles(articlesData, MAX_FEATURED_ARTICLES),
        reason: STRINGS.RECOMMENDED,
        type: 'random' as const,
        dueWordRootIds: stableDueWordSet,
      };
    }

    // Set the result only once per execution
    setSelectedArticles(result);
    return result;
  }, [
    hasArticles,
    refreshKey,
    scope,
    user?.id,
    hasDueWordArticles,
    stableDueWordRootIds, // Use stable array instead of Set
    hasDifficultWordArticles,
    stableDifficultWordRootIds, // Use stable array instead of Set
    hasAnyStudyWords,
    articlesData,
    // REMOVED: dueWordRootIds - Already tracked via stableDueWordRootIds
    // Including the Set directly caused infinite loops because Sets get new references
  ]);

  // Run selection logic when dependencies change
  useEffect(() => {
    // Prevent rapid re-execution during cascading updates
    if (isUpdatingRef.current) return;

    // For initial load (refreshKey === 0), only run if not initialized
    if (refreshKey === 0 && hasInitializedRef.current) return;

    // For refresh (refreshKey > 0), always run to get new selection
    if (refreshKey > 0 || !hasInitializedRef.current) {
      // Mark as initialized for initial load
      if (refreshKey === 0) {
        hasInitializedRef.current = true;
      }

      // Only run if we have articles
      if (hasArticles) {
        isUpdatingRef.current = true;
        selectionLogic();
        // Reset after a short delay to allow legitimate updates
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 100);
      }
    }
  }, [hasArticles, selectionLogic, refreshKey]);

  // CRITICAL: Trust preloader cache for initial load (refreshKey === 0)
  // This prevents expensive recomputation and eliminates jank
  if (cachedFeatured && refreshKey === 0) {
    return cachedFeatured;
  }

  return selectedArticles;
}
