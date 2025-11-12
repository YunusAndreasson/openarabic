import type { ArticleId, AuthorId, CategoryId, RootId } from '@/types/branded.types';

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
  const base = `/(tabs)/library/filter`;
  const params = [`type=category`, `id=${categoryId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

export const getAuthorFilterRoute = (authorId: AuthorId, name?: string): string => {
  const base = `/(tabs)/library/filter`;
  const params = [`type=author`, `id=${authorId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

export const ROUTE_PATHS = {
  AUTH: '/auth',
  AUTH_TERMS: '/auth/terms',
  AUTH_PRIVACY: '/auth/privacy',
  TABS: '/(tabs)',
  EXPLORE_TAB: '/(tabs)/library',
  PRACTICE_TAB: '/(tabs)/study',
  SAVED_TAB: '/(tabs)/bookmarks',
  ACCOUNT: '/(tabs)/library/account',
  ACCOUNT_HELP: '/(tabs)/library/account/help',
  ACCOUNT_FONT_SELECTOR: '/(tabs)/library/account/FontSelector',
  ACCOUNT_DELETE_ACCOUNT: '/(tabs)/library/account/DeleteAccount',
  ACCOUNT_FEEDBACK: '/(tabs)/library/account/feedback',
  TERMS: '/(tabs)/library/account/terms',
  PRIVACY: '/(tabs)/library/account/privacy',
  LEGAL: '/(tabs)/library/account/legal',

  STUDY_REVIEW: '/study/review',
  STUDY_DICTIONARY: '/(tabs)/study/dictionary',
} as const;

export const getStudyReviewRoute = (
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
  return query ? `${ROUTE_PATHS.STUDY_REVIEW}?${query}` : ROUTE_PATHS.STUDY_REVIEW;
};
