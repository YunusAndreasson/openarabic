import type { ArticleId, CategoryId, RootId } from '@/types/branded.types';

// Inlined to avoid require cycle: routes.ts -> routeBuilders.ts -> routes.ts
const PRACTICE_REVIEW_PATH = '/review';

export const getArticleRoute = (
  id: ArticleId,
  headerTitle?: string,
  disableAutoScroll?: boolean,
): string => {
  const base = `/article/${id}`;
  const params: string[] = [];

  if (headerTitle) {
    params.push(`headerTitle=${encodeURIComponent(headerTitle)}`);
  }

  if (disableAutoScroll) {
    params.push('disableAutoScroll=true');
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

export const getPracticeWordRoute = (rootId: RootId): string => `/practice-word?rootId=${rootId}`;

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
