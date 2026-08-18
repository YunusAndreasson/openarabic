import { describe, expect, test } from '@jest/globals';

import { defaultPreloadedState, setupTestStore } from '@/__tests__/helpers/testStore';
import { rootReducer } from '@/store/rootReducer';

/**
 * The test store used to re-declare `combineReducers` and had silently lost the
 * `voiceAliases` slice, so suites reading it exercised a state shape the app
 * never produces. These assert the helper still mirrors the real store.
 */
describe('testStore helper', () => {
  test('carries every slice the app root reducer declares', () => {
    const appSlices = Object.keys(rootReducer(undefined, { type: '@@INIT' })).sort();
    expect(Object.keys(setupTestStore().getState()).sort()).toEqual(appSlices);
  });

  test('an empty store equals the real initial state', () => {
    expect(setupTestStore().getState()).toEqual(defaultPreloadedState);
  });

  test('a slice override merges onto that slice and leaves the others alone', () => {
    const state = setupTestStore({ settings: { dailyWordLimit: 3 } }).getState();

    expect(state.settings.dailyWordLimit).toBe(3);
    expect(state.settings.arabicFont).toEqual(defaultPreloadedState.settings.arabicFont);
    expect(state.playlist).toEqual(defaultPreloadedState.playlist);
    expect(state.voiceAliases).toEqual(defaultPreloadedState.voiceAliases);
  });
});
