import {
  ROUTE_PATHS,
  SHEET_ROUTE_PATHS,
  getArticleRoute,
  getPracticeReviewRoute,
} from '@/constants/routes';
import { articleId } from '@/__tests__/helpers/ids';

describe('SHEET_ROUTE_PATHS', () => {
  // The root MiniPlayer stands down on exactly these. `review-depth` was once
  // declared as a sheet in the layout and missing here, so the MiniPlayer drew
  // over the "Reviews done" sheet on Android.
  test('lists every root-level sheet route', () => {
    expect([...SHEET_ROUTE_PATHS].sort()).toEqual(
      [
        ROUTE_PATHS.SLEEP_TIMER,
        ROUTE_PATHS.PRACTICE_DUE_WORDS,
        ROUTE_PATHS.PRACTICE_MEMORY_RETENTION,
        ROUTE_PATHS.PRACTICE_STUDY_STREAK,
        ROUTE_PATHS.PRACTICE_REVIEW_DEPTH,
        ROUTE_PATHS.PRACTICE_WORDS_TO_REVISIT,
        ROUTE_PATHS.WORD_DETAIL,
      ].sort(),
    );
  });
});

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
    expect(getArticleRoute(articleId(5))).toBe('/article/5');
  });

  test('getPracticeReviewRoute keeps path without /(tabs) (modal route)', () => {
    expect(getPracticeReviewRoute()).toBe('/review');
  });
});
