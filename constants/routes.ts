export const getArticleRoute = (id: number, headerTitle?: string): string => {
  const base = `/(tabs)/read/article/${id}`;
  if (!headerTitle) return base;
  const search = new URLSearchParams({ headerTitle });
  const query = search.toString().replace(/\(/g, '%28').replace(/\)/g, '%29');
  return `${base}?${query}`;
};

export const getFilterModalRoute = (categoryId: number): string =>
  `/(tabs)/read/filterModal?categoryId=${categoryId}`;

export const getCategoryFilterRoute = (categoryId: number, name?: string): string => {
  const base = `/(tabs)/read/filter`;
  const params = new URLSearchParams({ type: 'category', id: String(categoryId) });
  if (name) params.append('name', name);
  const query = params.toString().replace(/\(/g, '%28').replace(/\)/g, '%29');
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
  ACCOUNT_PROGRESS: '/(tabs)/read/account/studyStats',
  PRACTICE_REVIEW: '/practice/review',
  PRACTICE_DICTIONARY: '/(tabs)/practice/dictionary',
  NOW_PLAYING: '/(tabs)/listen/now-playing',
} as const;

export type StaticRoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const getPracticeReviewRoute = (
  params?: Partial<{
    rootId: number;
    mode: 'new' | 'random' | 'spaced';
    count: number;
    fromRemember: string;
  }>
): string => {
  const search = new URLSearchParams();
  if (params?.rootId) search.append('rootId', String(params.rootId));
  if (params?.mode) search.append('mode', params.mode);
  if (params?.count) search.append('count', String(params.count));
  if (params?.fromRemember) search.append('fromRemember', params.fromRemember);
  const query = search.toString().replace(/\(/g, '%28').replace(/\)/g, '%29');
  return query ? `${ROUTE_PATHS.PRACTICE_REVIEW}?${query}` : ROUTE_PATHS.PRACTICE_REVIEW;
};
