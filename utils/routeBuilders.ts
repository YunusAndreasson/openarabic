import type { ArticleId, CategoryId, RootId } from '@/types/branded.types';

// Inlined to avoid require cycle: routes.ts -> routeBuilders.ts -> routes.ts
const PRACTICE_REVIEW_PATH = '/review';
const PRACTICE_WORD_PATH = '/(tabs)/practice/word';
const WORD_DETAIL_PATH = '/word-detail';

/** Path prefix of the article reader route (`/article/[id]`). */
export const ARTICLE_ROUTE_PREFIX = '/article/';

export const getArticleRoute = (
  id: ArticleId,
  headerTitle?: string,
  disableAutoScroll?: boolean,
  sentenceId?: number,
): string => {
  const base = `${ARTICLE_ROUTE_PREFIX}${id}`;
  const params: string[] = [];

  if (headerTitle) {
    params.push(`headerTitle=${encodeURIComponent(headerTitle)}`);
  }

  if (disableAutoScroll) {
    params.push('disableAutoScroll=true');
  }
  if (sentenceId !== undefined) {
    params.push(`sentenceId=${sentenceId}`);
  }

  if (params.length === 0) return base;
  return `${base}?${params.join('&')}`;
};

export const getCategoryFilterRoute = (categoryId: CategoryId, name?: string): string => {
  const base = `/(tabs)/explore/filter`;
  const params = [`id=${categoryId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  return `${base}?${params.join('&')}`;
};

/**
 * Word detail. Lives inside the practice stack (not at the root) so it pushes
 * within the dictionary's modal instead of presenting behind it.
 */
export const getPracticeWordRoute = (rootId: RootId): string =>
  `${PRACTICE_WORD_PATH}?rootId=${rootId}`;

/**
 * The word sheet, at the ROOT of the navigator rather than inside a tab.
 *
 * `getPracticeWordRoute` above is tab-scoped by design — it has to push inside
 * the dictionary's modal. This one is opened from the Explore tab, where that
 * path would jump tabs before the sheet ever appeared, so it is a root-level
 * `formSheet` alongside `/words-to-revisit` and presents over whichever tab the
 * learner is on.
 */
export const getWordDetailRoute = (rootId: RootId): string =>
  `${WORD_DETAIL_PATH}?rootId=${rootId}`;

export const getPracticeReviewRoute = (
  params?: Partial<{
    rootId: RootId;
    mode: 'new' | 'random' | 'spaced';
    count: number;
    fromRemember: string;
  }>,
): string => {
  const queryParts: string[] = [];
  if (params?.rootId) queryParts.push(`rootId=${params.rootId}`);
  if (params?.mode) queryParts.push(`mode=${params.mode}`);
  if (params?.count) queryParts.push(`count=${params.count}`);
  if (params?.fromRemember)
    queryParts.push(`fromRemember=${encodeURIComponent(params.fromRemember)}`);
  const query = queryParts.join('&');
  return query ? `${PRACTICE_REVIEW_PATH}?${query}` : PRACTICE_REVIEW_PATH;
};
