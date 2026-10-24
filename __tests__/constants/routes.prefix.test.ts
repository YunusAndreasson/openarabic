// What `router.push` turns an href object into, so these pin the URLs the
// builders produce rather than the shape of the object.
import { resolveHref } from 'expo-router/build/link/href';

import { ROUTE_PATHS, SHEET_ROUTE_PATHS } from '@/constants/routes';
import { articleId, categoryId, rootId } from '@/__tests__/helpers/ids';
import {
  getArticleRoute,
  getCategoryFilterRoute,
  getPracticeWordRoute,
  getWordDetailRoute,
} from '@/utils/routeBuilders';

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
    expect(ROUTE_PATHS.EXPLORE_TAB.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.EXPLORE_FILTER.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.PRACTICE_TAB.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.PRACTICE_WORD.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.ACCOUNT.startsWith('/(tabs)/')).toBeTruthy();
    expect(ROUTE_PATHS.PRACTICE_DICTIONARY.startsWith('/(tabs)/')).toBeTruthy();
  });

  test('screens presented over any tab carry no /(tabs) prefix', () => {
    expect(ROUTE_PATHS.ARTICLE).toBe('/article/[id]');
    expect(ROUTE_PATHS.REVIEW).toBe('/review');
    expect(ROUTE_PATHS.WORD_DETAIL).toBe('/word-detail');
  });
});

describe('route builders', () => {
  test('the reader route is the bare id unless asked for more', () => {
    expect(resolveHref(getArticleRoute(articleId(5)))).toBe('/article/5');
    expect(resolveHref(getArticleRoute(articleId(5), { disableAutoScroll: false }))).toBe(
      '/article/5',
    );
  });

  test('the reader route carries the start position as the reader reads it', () => {
    expect(
      resolveHref(getArticleRoute(articleId(5), { disableAutoScroll: true, sentenceId: 12 })),
    ).toBe('/article/5?disableAutoScroll=true&sentenceId=12');
  });

  test('a category name is encoded exactly once', () => {
    expect(resolveHref(getCategoryFilterRoute(categoryId(3), 'Fiqh & 100%'))).toBe(
      '/(tabs)/explore/filter?id=3&name=Fiqh%20%26%20100%25',
    );
    expect(resolveHref(getCategoryFilterRoute(categoryId(3)))).toBe('/(tabs)/explore/filter?id=3');
  });

  test('the two word routes differ only in where they present', () => {
    expect(resolveHref(getPracticeWordRoute(rootId(9)))).toBe('/(tabs)/practice/word?rootId=9');
    expect(resolveHref(getWordDetailRoute(rootId(9)))).toBe('/word-detail?rootId=9');
  });
});
