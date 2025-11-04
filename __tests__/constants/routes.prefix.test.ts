import { ROUTE_PATHS, getArticleRoute, getStudyReviewRoute } from '@/constants/routes';

describe('ROUTE_PATHS - /(tabs) prefix', () => {
  it('ensures tab routes include /(tabs) prefix', () => {
    expect(ROUTE_PATHS.TABS.startsWith('/(tabs)')).toBe(true);
    expect(ROUTE_PATHS.EXPLORE_TAB.startsWith('/(tabs)/')).toBe(true);
    expect(ROUTE_PATHS.PRACTICE_TAB.startsWith('/(tabs)/')).toBe(true);
    expect(ROUTE_PATHS.SAVED_TAB.startsWith('/(tabs)/')).toBe(true);
    expect(ROUTE_PATHS.ACCOUNT.startsWith('/(tabs)/')).toBe(true);
    expect(ROUTE_PATHS.STUDY_DICTIONARY.startsWith('/(tabs)/')).toBe(true);
  });

  it('getArticleRoute returns /article/:id', () => {
    expect(getArticleRoute(5)).toBe('/article/5');
  });

  it('getStudyReviewRoute keeps path without /(tabs) (modal route)', () => {
    expect(getStudyReviewRoute()).toBe('/study/review');
  });
});
