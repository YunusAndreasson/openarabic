export const getArticleRoute = (id: number, headerTitle?: string): string => {
  const base = `/(tabs)/read/article/${id}`;
  if (!headerTitle) return base;
  const search = new URLSearchParams({ headerTitle });
  return `${base}?${search.toString()}`;
};

export const getFilterRoute = (
  type: 'category' | 'author' | 'bookmark',
  id: number | string,
  name?: string
): string => {
  const params = new URLSearchParams({ type, id: id.toString() });
  if (name) params.append('name', name);
  return `/(tabs)/read/filter?${params.toString()}`;
};

export const getFilterModalRoute = (categoryId: number): string =>
  `/(tabs)/read/filterModal?categoryId=${categoryId}`;

export const ROUTE_PATHS = {
  AUTH: '/auth',
  TABS: '/(tabs)',
  READ_TAB: '/(tabs)/read',
  PRACTICE_TAB: '/(tabs)/practice',
  LISTEN_TAB: '/(tabs)/listen',
  ACCOUNT: '/(tabs)/read/account',
  ACCOUNT_LEARNING_METHOD: '/(tabs)/read/account/learningMethod',
  ACCOUNT_CLASSICAL_TEXTS: '/(tabs)/read/account/classicalTexts',
  ACCOUNT_ISLAMIC_CALENDAR: '/(tabs)/read/account/islamicCalendar',
  ACCOUNT_FONT_SELECTOR: '/(tabs)/read/account/font-selector',
  INSIGHTS: '/insights',
  PRACTICE_AUDIO: '/practice/audio',
  PRACTICE_REVIEW: '/practice/review',
} as const;

export type StaticRoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];

export const getInsightsInfoRoute = (type: string): string =>
  `${ROUTE_PATHS.INSIGHTS}/info/${type}`;

export const getPracticeReviewRoute = (
  params?: Partial<{
    rootId: number;
    mode: 'new' | 'random' | 'spaced';
    count: number;
    fromVocabulary: string;
    fromRemember: string;
  }>
): string => {
  const search = new URLSearchParams();
  if (params?.rootId) search.append('rootId', String(params.rootId));
  if (params?.mode) search.append('mode', params.mode);
  if (params?.count) search.append('count', String(params.count));
  if (params?.fromVocabulary) search.append('fromVocabulary', params.fromVocabulary);
  if (params?.fromRemember) search.append('fromRemember', params.fromRemember);
  const query = search.toString();
  return query ? `${ROUTE_PATHS.PRACTICE_REVIEW}?${query}` : ROUTE_PATHS.PRACTICE_REVIEW;
};
