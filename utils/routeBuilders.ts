import type { ArticleId, AuthorId, CategoryId, RootId } from '@/types/branded.types';

// Inlined to avoid require cycle: routes.ts -> routeBuilders.ts -> routes.ts
const PRACTICE_REVIEW_PATH = '/practice/review';

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
  const params = [`type=category`, `id=${categoryId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

export const getAuthorFilterRoute = (authorId: AuthorId, name?: string): string => {
  const base = `/(tabs)/explore/filter`;
  const params = [`type=author`, `id=${authorId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

export const getDifficultyFilterRoute = (difficultyId: number, name?: string): string => {
  const base = `/(tabs)/explore/filter`;
  const params = [`type=difficulty`, `id=${difficultyId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

export const getLengthFilterRoute = (lengthId: number, name?: string): string => {
  const base = `/(tabs)/explore/filter`;
  const params = [`type=length`, `id=${lengthId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

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
