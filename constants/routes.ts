export const getArticleRoute = (id: number, headerTitle?: string): string => {
  const base = `/article/${id}`;
  if (!headerTitle) return base;
  const encodedTitle = encodeURIComponent(headerTitle);
  return `${base}?headerTitle=${encodedTitle}`;
};

export const getFilterModalRoute = (categoryId: number): string =>
  `/(tabs)/read/filterModal?categoryId=${categoryId}`;

export const getCategoryFilterRoute = (categoryId: number, name?: string): string => {
  const base = `/(tabs)/read/filter`;
  const params = [`type=category`, `id=${categoryId}`];
  if (name) params.push(`name=${encodeURIComponent(name)}`);
  const query = params.join('&');
  return `${base}?${query}`;
};

export const ROUTE_PATHS = {
  AUTH: '/auth',
  TABS: '/(tabs)',
  READ_TAB: '/(tabs)/read',
  PRACTICE_TAB: '/(tabs)/practice',
  LISTEN_TAB: '/(tabs)/listen',
  ACCOUNT: '/(tabs)/read/account',
  ACCOUNT_HELP: '/(tabs)/read/account/help',
  ACCOUNT_FONT_SELECTOR: '/(tabs)/read/account/FontSelector',
  ACCOUNT_ISLAMIC_CALENDAR: '/(tabs)/read/account/islamicCalendar',

  PRACTICE_REVIEW: '/practice/review',
  PRACTICE_DICTIONARY: '/(tabs)/practice/dictionary',
} as const;

export const getPracticeReviewRoute = (
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
  return query ? `${ROUTE_PATHS.PRACTICE_REVIEW}?${query}` : ROUTE_PATHS.PRACTICE_REVIEW;
};
