import type { JSX } from 'react';
import { useMemo, memo, useRef, useCallback } from 'react';

import FeaturedSection from '@/components/home/FeaturedSection';
import { CACHE_SIZE } from '@/constants/performance';
import { STRINGS } from '@/constants/strings';
import { useIntelligentArticleSelection } from '@/hooks/articles/useIntelligentArticleSelection';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Article } from '@/types/articles.types';

// Extract constants outside component to prevent recreation
const EMPTY_ARTICLE_RESULT = {
  article: null,
  reason: STRINGS.LOADING_ARTICLES,
  type: 'random' as const,
  dueWordRootIds: new Set<number>(),
};

// Cache for article filtering to prevent repeated calculations
const articleFilterCache = new Map<string, Article[]>();
const CACHE_MAX_SIZE = CACHE_SIZE.LARGE;

interface IntelligentArticleSectionProps {
  articlesData: Article[];
  refreshKey: number;
  onArticlePress: (article: Article) => void;
}

interface CachedSelection {
  article: Article | null;
  refreshKey: number;
}

interface CurrentArticleResult {
  article: Article | null;
  reason: string;
  type: 'due-words' | 'difficult-words' | 'beginner' | 'random';
  dueWordRootIds: Set<number>;
}

/**
 * Custom comparison function for React.memo optimization
 */
const IntelligentArticleSectionComparison = (
  prevProps: IntelligentArticleSectionProps,
  nextProps: IntelligentArticleSectionProps
): boolean => {
  // Quick path comparisons first (most likely to change)
  if (prevProps.refreshKey !== nextProps.refreshKey) return false;
  if (prevProps.onArticlePress !== nextProps.onArticlePress) return false;

  // Array reference and length checks
  if (prevProps.articlesData !== nextProps.articlesData) return false;
  if (prevProps.articlesData?.length !== nextProps.articlesData?.length) return false;

  return true;
};

/**
 * Helper function to create a cache key for article filtering
 */
const createCacheKey = (
  articlesLength: number,
  refreshKey: number,
  userId: string | undefined
): string => {
  return `${articlesLength}_${refreshKey}_${userId || 'anonymous'}`;
};

/**
 * Helper function to get available articles excluding a specific one
 */
const getAvailableArticles = (articlesData: Article[], excludeId: number): Article[] => {
  const cacheKey = `exclude_${excludeId}_${articlesData.length}`;

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
 * Internal component implementation
 */
const IntelligentArticleSectionInternal = memo(function IntelligentArticleSectionInternal({
  articlesData,
  refreshKey,
  onArticlePress,
}: IntelligentArticleSectionProps): JSX.Element | null {
  const { user } = useAuth();
  const intelligentArticle = useIntelligentArticleSelection(user, articlesData);

  // Cache the initial selection to prevent flashing
  const initialSelectionRef = useRef<CachedSelection | null>(null);

  // Memoize expensive computations
  const articlesLength = useMemo(() => articlesData.length, [articlesData.length]);
  const hasArticles = useMemo(() => articlesLength > 0, [articlesLength]);
  const userId = useMemo(() => user?.id, [user?.id]);

  // Memoize the cache key for better performance
  const cacheKey = useMemo(
    () => createCacheKey(articlesLength, refreshKey, userId || 'anonymous'),
    [articlesLength, refreshKey, userId]
  );

  // Memoize random selection function
  const selectRandomArticle = useCallback((articles: Article[]): Article | null => {
    if (articles.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * articles.length);
    return articles[randomIndex] ?? null;
  }, []);

  // Enhanced stable selection logic with comprehensive memoization
  const currentArticle: CurrentArticleResult = useMemo(() => {
    if (!hasArticles) {
      return EMPTY_ARTICLE_RESULT;
    }

    // For initial load (refreshKey === 0), cache and reuse the first intelligent selection
    if (refreshKey === 0) {
      if (!initialSelectionRef.current || initialSelectionRef.current.refreshKey !== 0) {
        // First time or reset - cache the intelligent selection
        initialSelectionRef.current = {
          article: intelligentArticle.article,
          refreshKey: 0,
        };
      }

      // Use cached initial selection
      if (initialSelectionRef.current.article) {
        return {
          article: initialSelectionRef.current.article,
          reason: intelligentArticle.reason,
          type: intelligentArticle.type,
          dueWordRootIds: intelligentArticle.dueWordRootIds,
        };
      }
    }

    // For refresh (refreshKey > 0), pick a different article
    if (refreshKey > 0 && intelligentArticle.article) {
      const previousArticle = initialSelectionRef.current?.article || intelligentArticle.article;
      const availableArticles = getAvailableArticles(articlesData, previousArticle.id);

      if (availableArticles.length > 0) {
        const newArticle = selectRandomArticle(availableArticles);

        if (newArticle) {
          // Update cache for future refreshes
          initialSelectionRef.current = {
            article: newArticle,
            refreshKey: refreshKey,
          };

          return {
            ...intelligentArticle,
            article: newArticle,
            reason: STRINGS.NEW_RECOMMENDATION_SELECTED,
          };
        }
      }
    }

    // Fallback to intelligent selection
    return intelligentArticle;
  }, [
    hasArticles,
    refreshKey,
    intelligentArticle,
    articlesData,
    selectRandomArticle,
    cacheKey, // Include cache key in dependencies to ensure proper invalidation
  ]);

  // Memoize the selected article for FeaturedSection
  const selectedArticle = useMemo(() => currentArticle.article, [currentArticle.article]);

  // Memoize the onPress callback to prevent unnecessary re-renders
  const memoizedOnPress = useCallback(
    (article: Article) => {
      onArticlePress(article);
    },
    [onArticlePress]
  );

  // Memoize FeaturedSection props
  const featuredSectionProps = useMemo(() => {
    if (!selectedArticle) return null;
    return {
      article: selectedArticle,
      onPress: memoizedOnPress,
    };
  }, [selectedArticle, memoizedOnPress]);

  // Early return if no article selected
  if (!featuredSectionProps) {
    return null;
  }

  return <FeaturedSection {...featuredSectionProps} />;
},
IntelligentArticleSectionComparison);

export default IntelligentArticleSectionInternal;
