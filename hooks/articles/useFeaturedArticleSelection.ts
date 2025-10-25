import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef } from 'react';

import { DEFAULT_SESSION_COOLDOWN_HOURS, FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { STRINGS } from '@/constants/strings';
import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { SentenceWord } from '@/types/vocabulary.types';
import { getBeginnerArticles } from '@/utils/articleUtils';

interface FeaturedArticleResult {
  article: Article | null;
  reason: string;
  type: 'due-words' | 'difficult-words' | 'beginner' | 'random';
  dueWordRootIds: Set<number>;
}

interface CachedSelection {
  article: Article | null;
  refreshKey: number;
  scope: string;
}

// Cache for article filtering to prevent repeated calculations
const articleFilterCache = new Map<string, Article[]>();
const CACHE_MAX_SIZE = 50; // Hardcoded value (was CACHE_SIZE.LARGE)

/**
 * Helper function to create a cache key for article filtering
 */
const createCacheKey = (
  articlesLength: number,
  refreshKey: number,
  userId: string | undefined,
  scope: string,
): string => {
  return `${scope}_${articlesLength}_${refreshKey}_${userId || 'anonymous'}`;
};

/**
 * Helper function to get available articles excluding a specific one
 */
const getAvailableArticles = (
  articlesData: Article[],
  excludeId: number,
  scope: string,
): Article[] => {
  const cacheKey = `exclude_${scope}_${excludeId}_${articlesData.length}`;

  if (articleFilterCache.has(cacheKey)) {
    const cached = articleFilterCache.get(cacheKey);
    if (cached) return cached;
  }

  const filtered = articlesData.filter(article => article.id !== excludeId);

  // Manage cache size
  if (articleFilterCache.size >= CACHE_MAX_SIZE) {
    const firstKey = articleFilterCache.keys().next().value;
    if (firstKey !== undefined) {
      articleFilterCache.delete(firstKey);
    }
  }

  articleFilterCache.set(cacheKey, filtered);
  return filtered;
};

/**
 * Generic hook for featured article selection that works with any article dataset
 * @param articlesData - The articles to select from (can be all articles or filtered subset)
 * @param refreshKey - Key to trigger new selections
 * @param scope - Scope identifier for caching ('global', 'category-{id}', etc.)
 */
export function useFeaturedArticleSelection(
  articlesData: Article[],
  refreshKey: number,
  scope: string = 'global',
): FeaturedArticleResult {
  const { user } = useAuth();

  // Use the existing hooks for due and difficult words (they work globally)
  const { hasEnoughArticles: hasDueWordArticles, dueWordRootIds } = useArticlesByDueWords(
    user?.id,
    10,
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
  const initialSelectionRef = useRef<CachedSelection | null>(null);

  // Memoize expensive computations
  const articlesLength = useMemo(() => articlesData.length, [articlesData.length]);
  const hasArticles = useMemo(() => articlesLength > 0, [articlesLength]);
  const userId = useMemo(() => user?.id, [user?.id]);

  // Memoize the cache key for better performance
  const cacheKey = useMemo(
    () => createCacheKey(articlesLength, refreshKey, userId || 'anonymous', scope),
    [articlesLength, refreshKey, userId, scope],
  );

  // Memoize random selection function
  const selectRandomArticle = useCallback((articles: Article[]): Article | null => {
    if (articles.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * articles.length);
    return articles[randomIndex] ?? null;
  }, []);

  // Enhanced stable selection logic with comprehensive memoization
  const currentArticle: FeaturedArticleResult = useMemo(() => {
    if (!hasArticles) {
      return {
        article: null,
        reason: STRINGS.LOADING_ARTICLES,
        type: 'random',
        dueWordRootIds: new Set<number>(),
      };
    }

    // For initial load (refreshKey === 0), cache and reuse the first intelligent selection
    if (refreshKey === 0) {
      if (
        initialSelectionRef.current?.refreshKey !== 0 ||
        initialSelectionRef.current.scope !== scope
      ) {
        // First time or scope change - perform intelligent selection
        let intelligentSelection: FeaturedArticleResult;

        // Strategy 1: If user has due words and enough articles with those words
        if (user?.id && hasDueWordArticles && dueWordRootIds.size > 0) {
          const dueWordArticles = articlesData.filter(article =>
            article.article_sentences?.some(sentence =>
              sentence.sentence_words?.some((word: SentenceWord) =>
                dueWordRootIds.has(word.root_id),
              ),
            ),
          );

          if (dueWordArticles.length > 0) {
            const randomArticle = selectRandomArticle(dueWordArticles);
            intelligentSelection = {
              article: randomArticle,
              reason: STRINGS.SELECTED_TO_HELP_PRACTICE_DUE,
              type: 'due-words',
              dueWordRootIds,
            };
          } else {
            intelligentSelection = performFallbackSelection();
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
                difficultWordRootIds.has(word.root_id),
              ),
            ),
          );

          if (difficultWordArticles.length > 0) {
            const randomArticle = selectRandomArticle(difficultWordArticles);
            intelligentSelection = {
              article: randomArticle,
              reason: STRINGS.CHOSEN_TO_REINFORCE_CHALLENGING,
              type: 'difficult-words',
              dueWordRootIds,
            };
          } else {
            intelligentSelection = performFallbackSelection();
          }
        }
        // Strategy 3: If user has no study progress, show beginner content
        else if (!user?.id || !hasAnyStudyWords) {
          const beginnerArticles = getBeginnerArticles(articlesData);

          if (beginnerArticles.length > 0) {
            const randomArticle = selectRandomArticle(beginnerArticles);
            intelligentSelection = {
              article: randomArticle,
              reason: STRINGS.PERFECT_FOR_GETTING_STARTED,
              type: 'beginner',
              dueWordRootIds,
            };
          } else {
            intelligentSelection = performFallbackSelection();
          }
        } else {
          intelligentSelection = performFallbackSelection();
        }

        // Cache the intelligent selection
        initialSelectionRef.current = {
          article: intelligentSelection.article,
          refreshKey: 0,
          scope,
        };

        return intelligentSelection;
      }

      // Use cached initial selection
      if (initialSelectionRef.current.article) {
        return {
          article: initialSelectionRef.current.article,
          reason: getReasonForArticle(initialSelectionRef.current.article),
          type: getTypeForArticle(initialSelectionRef.current.article),
          dueWordRootIds,
        };
      }
    }

    // For refresh (refreshKey > 0), pick a different article
    if (refreshKey > 0 && initialSelectionRef.current?.article) {
      const previousArticle = initialSelectionRef.current.article;
      const availableArticles = getAvailableArticles(articlesData, previousArticle.id, scope);

      if (availableArticles.length > 0) {
        const newArticle = selectRandomArticle(availableArticles);

        if (newArticle) {
          // Update cache for future refreshes
          initialSelectionRef.current = {
            article: newArticle,
            refreshKey: refreshKey,
            scope,
          };

          return {
            article: newArticle,
            reason: STRINGS.NEW_RECOMMENDATION_SELECTED,
            type: 'random',
            dueWordRootIds,
          };
        }
      }
    }

    // Fallback to intelligent selection
    return performFallbackSelection();

    function performFallbackSelection(): FeaturedArticleResult {
      const randomArticle = selectRandomArticle(articlesData);
      return {
        article: randomArticle,
        reason: STRINGS.RANDOMLY_SELECTED_FOR_DISCOVERY,
        type: 'random',
        dueWordRootIds,
      };
    }

    function getReasonForArticle(article: Article): string {
      // Determine reason based on article content and user state
      if (
        user?.id &&
        hasDueWordArticles &&
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) => dueWordRootIds.has(word.root_id)),
        )
      ) {
        return STRINGS.SELECTED_TO_HELP_PRACTICE_DUE;
      }

      if (
        user?.id &&
        hasDifficultWordArticles &&
        hasAnyStudyWords &&
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) =>
            difficultWordRootIds.has(word.root_id),
          ),
        )
      ) {
        return STRINGS.CHOSEN_TO_REINFORCE_CHALLENGING;
      }

      if (!user?.id || !hasAnyStudyWords) {
        const beginnerArticles = getBeginnerArticles(articlesData);
        if (beginnerArticles.some(beginner => beginner.id === article.id)) {
          return STRINGS.PERFECT_FOR_GETTING_STARTED;
        }
      }

      return STRINGS.RANDOMLY_SELECTED_FOR_DISCOVERY;
    }

    function getTypeForArticle(
      article: Article,
    ): 'due-words' | 'difficult-words' | 'beginner' | 'random' {
      // Determine type based on article content and user state
      if (
        user?.id &&
        hasDueWordArticles &&
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) => dueWordRootIds.has(word.root_id)),
        )
      ) {
        return 'due-words';
      }

      if (
        user?.id &&
        hasDifficultWordArticles &&
        hasAnyStudyWords &&
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: SentenceWord) =>
            difficultWordRootIds.has(word.root_id),
          ),
        )
      ) {
        return 'difficult-words';
      }

      if (!user?.id || !hasAnyStudyWords) {
        const beginnerArticles = getBeginnerArticles(articlesData);
        if (beginnerArticles.some(beginner => beginner.id === article.id)) {
          return 'beginner';
        }
      }

      return 'random';
    }
  }, [
    hasArticles,
    refreshKey,
    scope,
    articlesData,
    user?.id,
    hasDueWordArticles,
    dueWordRootIds,
    hasDifficultWordArticles,
    difficultWordRootIds,
    hasAnyStudyWords,
    selectRandomArticle,
    cacheKey,
  ]);

  return currentArticle;
}
