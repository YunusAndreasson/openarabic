export const getArticleRoute = (id: number, headerTitle?: string): string => {
  const base = `/article/${id}`;
  if (!headerTitle) return base;
  const encodedTitle = encodeURIComponent(headerTitle);
  return `${base}?headerTitle=${encodedTitle}`;
};

export const getFilterModalRoute = (categoryId: number): string =>
  `/(tabs)/library/filterModal?categoryId=${categoryId}`;

export const getCategoryFilterRoute = (categoryId: number, name?: string): string => {
  const base = `/(tabs)/library/filter`;
  const params = [`type=category`, `id=${categoryId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

export const ROUTE_PATHS = {
  AUTH: '/auth',
  TABS: '/(tabs)',
  LIBRARY_TAB: '/(tabs)/library',
  STUDY_TAB: '/(tabs)/study',
  BOOKMARKS_TAB: '/(tabs)/bookmarks',
  ACCOUNT: '/(tabs)/library/account',
  ACCOUNT_HELP: '/(tabs)/library/account/help',
  ACCOUNT_FONT_SELECTOR: '/(tabs)/library/account/FontSelector',
  ACCOUNT_ISLAMIC_CALENDAR: '/(tabs)/library/account/islamicCalendar',

  STUDY_REVIEW: '/study/review',
  STUDY_DICTIONARY: '/(tabs)/study/dictionary',
} as const;

export const getStudyReviewRoute = (
  params?: Partial<{
    rootId: number;
    mode: 'new' | 'random' | 'spaced';
    count: number;
    fromRemember: string;
  }>
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
