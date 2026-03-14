import { ROUTE_PATHS, getArticleRoute, getPracticeReviewRoute } from '@/constants/routes';

describe('ROUTE_PATHS - /(tabs) prefix', () => {
  test('ensures tab routes include /(tabs) prefix', () => {
    expect(ROUTE_PATHS.TABS.startsWith('/(tabs)')).toBeTruthy();
    expect(ROUTE_PATHS.EXPLORE_TAB.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.PRACTICE_TAB.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.PLAYLIST_TAB.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.ACCOUNT.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.PRACTICE_DICTIONARY.startsWith('/(tabs)/')).toBeTruthy();
  });

  test('getArticleRoute returns /article/:id', () => {
    expect(getArticleRoute(5)).toBe('/article/5');
  });

  test('getPracticeReviewRoute keeps path without /(tabs) (modal route)', () => {
    expect(getPracticeReviewRoute()).toBe('/review');
  });
});
