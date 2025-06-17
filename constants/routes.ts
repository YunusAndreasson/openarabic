export const getArticleRoute = (id: number, headerTitle?: string): string => {
  const base = `/(tabs)/read/article/${id}`;
  return headerTitle ? `${base}?headerTitle=${encodeURIComponent(headerTitle)}` : base;
};

export const getFilterRoute = (
  type: 'category' | 'author',
  id: number,
  name?: string,
): string => {
  const base = `/(tabs)/read/filter?type=${type}&id=${id}`;
  return name ? `${base}&name=${encodeURIComponent(name)}` : base;
};

export const getFilterModalRoute = (categoryId: number): string =>
  `/(tabs)/read/filterModal?categoryId=${categoryId}`;

export const AUTH_ROUTE = '/auth';
export const READ_TAB_ROUTE = '/(tabs)/read';
export const PRACTICE_TAB_ROUTE = '/(tabs)/practice';
export const LISTEN_TAB_ROUTE = '/(tabs)/listen';
export const ACCOUNT_ROUTE = '/(tabs)/read/account';
export const ACCOUNT_LEARNING_METHOD_ROUTE =
  '/(tabs)/read/account/learningMethod';
export const ACCOUNT_CLASSICAL_TEXTS_ROUTE =
  '/(tabs)/read/account/classicalTexts';
export const ACCOUNT_ISLAMIC_CALENDAR_ROUTE =
  '/(tabs)/read/account/islamicCalendar';
export const ACCOUNT_FONT_SELECTOR_ROUTE =
  '/(tabs)/read/account/font-selector';

export const PRACTICE_AUDIO_ROUTE = '/practice/audio';
export const PRACTICE_REVIEW_ROUTE = '/practice/review';

export const getPracticeAudioRoute = (fromRemember?: boolean): string =>
  fromRemember ? `${PRACTICE_AUDIO_ROUTE}?fromRemember=true` : PRACTICE_AUDIO_ROUTE;

export const getPracticeReviewRoute = (
  params?: Partial<{
    rootId: number;
    mode: 'new' | 'random' | 'spaced';
    count: number;
    fromVocabulary: string;
    fromRemember: string;
  }>,
): string => {
  const search = new URLSearchParams();
  if (params?.rootId) search.append('rootId', String(params.rootId));
  if (params?.mode) search.append('mode', params.mode);
  if (params?.count) search.append('count', String(params.count));
  if (params?.fromVocabulary) search.append('fromVocabulary', params.fromVocabulary);
  if (params?.fromRemember) search.append('fromRemember', params.fromRemember);
  const query = search.toString();
  return query ? `${PRACTICE_REVIEW_ROUTE}?${query}` : PRACTICE_REVIEW_ROUTE;
};
