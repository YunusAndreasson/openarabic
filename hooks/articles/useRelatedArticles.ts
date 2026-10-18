import { useMultipleFeaturedArticles } from '@/hooks/articles/useMultipleFeaturedArticles';
import { useBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import type { Article } from '@/types/articles.types';
import { deduplicateArticlesByImage } from '@/utils/articleUtils';
import { getArticleProgressPercentage, type ReadingProgressLookup } from '@/utils/progressUtils';

/** Below this, a text still counts as fresh enough to recommend. */
const MAX_RECOMMENDED_PROGRESS = 20;
const DEFAULT_MAX_ARTICLES = 5;

const NO_EXCLUSIONS: ReadonlySet<number> = new Set();

interface UseRelatedArticlesOptions {
  currentArticleId: number;
  articlesData: Article[];
  filterType: 'author' | 'category';
  filterId: number;
  /** Texts another list on the same screen already shows */
  excludeIds?: ReadonlySet<number>;
  maxArticles?: number;
}

interface RelatedArticles {
  articles: Article[];
  progressMap: ReadingProgressLookup;
}

/**
 * The texts for one "More from …" list at the foot of the reader: same author
 * or same category, unread or barely started (under 20%), one per image.
 *
 * Selection runs through `useMultipleFeaturedArticles`, scoped per article and
 * filter so the pick holds still while the learner reads. `excludeIds` is
 * applied after that pick rather than before it: the featured hook freezes its
 * first selection, so a candidate pool that shrank once the other list resolved
 * would not be re-picked from.
 */
export function useRelatedArticles({
  currentArticleId,
  articlesData,
  filterType,
  filterId,
  excludeIds = NO_EXCLUSIONS,
  maxArticles = DEFAULT_MAX_ARTICLES,
}: UseRelatedArticlesOptions): RelatedArticles {
  const candidates = articlesData.filter(
    article =>
      article.id !== currentArticleId &&
      (filterType === 'author' ? article.author_id : article.category_id) === filterId,
  );

  const { articles: selected } = useMultipleFeaturedArticles(
    candidates,
    0, // No refresh for stability in article context
    `article-${currentArticleId}-${filterType}-${filterId}`, // Unique scope per filter for cache consistency
  );

  const { data: progressMap } = useBulkReadingProgress(selected.map(article => article.id));

  const fresh = selected.filter(
    article =>
      !excludeIds.has(article.id) &&
      getArticleProgressPercentage(progressMap, article.id) < MAX_RECOMMENDED_PROGRESS,
  );

  return {
    articles: deduplicateArticlesByImage(fresh).slice(0, maxArticles),
    progressMap,
  };
}
