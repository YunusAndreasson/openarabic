import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { APP_SESSION_ID } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useFSRSData } from '@/components/providers/FSRSDataProvider';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Article } from '@/types/articles.types';
import type { RootId } from '@/types/branded.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { getBeginnerArticles, getRandomItems } from '@/utils/articleUtils';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { isHardWord } from '@/utils/wordClassification';

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

// Number of articles to return in the featured carousel
export const MAX_FEATURED_ARTICLES = 7;

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

  // Use due words hook for Strategy 1
  const {
    hasEnoughArticles: hasDueWordArticles,
    dueWordRootIds,
    isLoading: isDueWordsLoading,
  } = useArticlesByDueWords(user?.id, 10);

  // Use already-loaded FSRS data for difficult words (Strategy 2) - no separate API call needed
  const { studyWords = [], isLoading: isFSRSLoading } = useFSRSData();

  // Compute hard word root IDs inline using simplified isHardWord logic
  const difficultWordRootIds = useMemo(() => {
    const hardWords = studyWords.filter(isHardWord);
    return new Set(hardWords.map(w => w.root_id as RootId));
  }, [studyWords]);

  const hasDifficultWordArticles = difficultWordRootIds.size >= 3;
  const hasAnyStudyWords = studyWords.length > 0;

  // Get reading progress for all articles to filter for unread/low-progress
  const articleIds = useMemo(() => articlesData.map(a => a.id), [articlesData]);
  const { data: progressMap, isLoading: isLoadingProgress } =
    useSafeBulkReadingProgress(articleIds);

  // Track combined loading state for all queries
  const allQueriesReady = !isDueWordsLoading && !isFSRSLoading && !isLoadingProgress;

  // Filter articles to show only unread articles (0% progress) in featured section
  // This ensures featured articles are always fresh content the user hasn't started
  const unreadArticles = useMemo(() => {
    if (!progressMap || progressMap.size === 0) return articlesData;

    return articlesData.filter(article => {
      const progress = progressMap.get(article.id);

      // Include if unread (no progress entry)
      if (!progress) return true;

      // Include only if truly unread (0% progress)
      const progressPercentage = calculateProgressPercentage(
        progress.last_sentence_read,
        progress.total_sentences,
      );
      return progressPercentage === 0;
    });
  }, [articlesData, progressMap]);

  // Cache the initial selection to prevent flashing
  const initialSelectionRef = useRef<CachedMultipleSelection | null>(null);

  // Frozen selection to prevent flickering during refresh
  const frozenSelectionRef = useRef<MultipleFeaturedArticlesResult | null>(null);

  const hasArticles = articlesData.length > 0;

  // Convert Sets to stable array representations for dependencies
  const stableDueWordRootIds = useMemo(() => Array.from(dueWordRootIds).sort(), [dueWordRootIds]);
  const stableDifficultWordRootIds = useMemo(
    () => Array.from(difficultWordRootIds).sort(),
    [difficultWordRootIds],
  );

  // Create stable Set from stable array to prevent infinite loops
  // This ensures the Set reference only changes when the actual word IDs change
  const stableDueWordSet = useMemo(() => new Set(stableDueWordRootIds), [stableDueWordRootIds]);

  const stableDifficultWordSet = useMemo(
    () => new Set(stableDifficultWordRootIds),
    [stableDifficultWordRootIds],
  );

  // State to store the computed selection (only for refreshes)
  const [selectedArticles, setSelectedArticles] = useState<MultipleFeaturedArticlesResult>(() => {
    // For initial load without cache, show first articles immediately
    if (articlesData.length > 0 && refreshKey === 0) {
      const immediateArticles = articlesData.slice(0, MAX_FEATURED_ARTICLES);
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

  // Track when refresh is in progress
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lastRefreshKeyRef = useRef(refreshKey);

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
          const dueWordArticles = unreadArticles.filter(article =>
            article.article_sentences.some(sentence =>
              sentence.sentence_words?.some((word: SentenceWord) =>
                stableDueWordSet.has(word.root_id),
              ),
            ),
          );

          if (dueWordArticles.length > 0) {
            intelligentSelection = {
              articles: getRandomItems(dueWordArticles, MAX_FEATURED_ARTICLES),
              reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE,
              type: 'due-words',
              dueWordRootIds: stableDueWordSet,
            };
          } else {
            intelligentSelection = {
              articles: getRandomItems(unreadArticles, MAX_FEATURED_ARTICLES),
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
          const difficultWordArticles = unreadArticles.filter(article =>
            article.article_sentences.some(sentence =>
              sentence.sentence_words?.some((word: SentenceWord) =>
                stableDifficultWordSet.has(word.root_id),
              ),
            ),
          );

          if (difficultWordArticles.length > 0) {
            intelligentSelection = {
              articles: getRandomItems(difficultWordArticles, MAX_FEATURED_ARTICLES),
              reason: STRINGS.CHOSEN_TO_REINFORCE_CHALLENGING,
              type: 'difficult-words',
              dueWordRootIds: stableDueWordSet,
            };
          } else {
            intelligentSelection = {
              articles: getRandomItems(unreadArticles, MAX_FEATURED_ARTICLES),
              reason: STRINGS.RECOMMENDED,
              type: 'random' as const,
              dueWordRootIds: stableDueWordSet,
            };
          }
        }
        // Strategy 3: If new user, show beginner-friendly articles
        else if (!user?.id || !hasAnyStudyWords) {
          const beginnerArticles = getBeginnerArticles(unreadArticles);
          if (beginnerArticles.length > 0) {
            intelligentSelection = {
              articles: getRandomItems(beginnerArticles, MAX_FEATURED_ARTICLES),
              reason: STRINGS.RECOMMENDED,
              type: 'beginner',
              dueWordRootIds: stableDueWordSet,
            };
          } else {
            intelligentSelection = {
              articles: getRandomItems(unreadArticles, MAX_FEATURED_ARTICLES),
              reason: STRINGS.RECOMMENDED,
              type: 'random' as const,
              dueWordRootIds: stableDueWordSet,
            };
          }
        }
        // Strategy 4: Fallback to random selection
        else {
          intelligentSelection = {
            articles: getRandomItems(unreadArticles, MAX_FEATURED_ARTICLES),
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
      // For refreshes, always perform new selection for variety from unread/low-progress articles
      result = {
        articles: getRandomItems(unreadArticles, MAX_FEATURED_ARTICLES),
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
    unreadArticles, // Use filtered articles instead of all articlesData
    // REMOVED: dueWordRootIds - Already tracked via stableDueWordRootIds
    // Including the Set directly caused infinite loops because Sets get new references
  ]);

  // Detect when refresh starts and freeze current selection
  useEffect(() => {
    if (refreshKey !== lastRefreshKeyRef.current && refreshKey > 0) {
      // Store current selection before refresh
      if (selectedArticles.articles.length > 0) {
        frozenSelectionRef.current = selectedArticles;
      }
      setIsRefreshing(true);
      lastRefreshKeyRef.current = refreshKey;
    }
  }, [refreshKey, selectedArticles]);

  // Run selection once when all queries are ready (initial load or after refresh).
  // Selection logic depends on async query readiness, so the result must be committed via setState
  // once data is ready; cannot be derived from props alone.
  useEffect(() => {
    // For initial load (refreshKey === 0)
    if (refreshKey === 0 && !hasInitializedRef.current) {
      if (hasArticles && allQueriesReady) {
        hasInitializedRef.current = true;
        const result = selectionLogic();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedArticles(result);
      }
      return;
    }

    // For refresh (refreshKey > 0), wait until all queries ready
    if (refreshKey > 0 && isRefreshing && allQueriesReady) {
      if (hasArticles) {
        const result = selectionLogic();
        setSelectedArticles(result);
        setIsRefreshing(false);
        // Clear frozen selection after successful update
        frozenSelectionRef.current = null;
      }
    }
  }, [refreshKey, hasArticles, allQueriesReady, isRefreshing, selectionLogic]);

  // CRITICAL: Trust preloader cache for initial load (refreshKey === 0)
  // This prevents expensive recomputation and eliminates jank
  if (cachedFeatured && refreshKey === 0) {
    return cachedFeatured;
  }

  // During refresh, return frozen selection to prevent flickering.
  // Reading frozenSelectionRef during render is intentional: the ref is an imperatively-set snapshot
  // that we want to use as the UI value while refresh is in flight; lifting to state would defeat the
  // anti-flicker purpose (re-renders would happen on freeze/unfreeze).
  // eslint-disable-next-line react-hooks/refs
  if (isRefreshing && frozenSelectionRef.current) {
    // eslint-disable-next-line react-hooks/refs
    return frozenSelectionRef.current;
  }

  return selectedArticles;
}
