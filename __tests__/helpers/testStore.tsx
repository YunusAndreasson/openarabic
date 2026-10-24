import { configureStore } from '@reduxjs/toolkit';

import { rootReducer } from '../../store/rootReducer';

export type TestRootState = ReturnType<typeof rootReducer>;

export const defaultPreloadedState: TestRootState = rootReducer(undefined, {
  type: '@@INIT',
}) as TestRootState;

/**
 * Per-slice overrides. The previous shape was `Partial<TestRootState>`, which
 * only let a caller replace a WHOLE slice — so overriding one setting meant
 * restating all twelve, and every call site that did not was relying on the
 * suite being untyped. Each slice is merged onto its real initial state.
 */
export type TestPreloadedState = {
  [K in keyof TestRootState]?: Partial<TestRootState[K]>;
};

const mergeSlice = <K extends keyof TestRootState>(
  key: K,
  override: Partial<TestRootState[K]> | undefined,
): TestRootState[K] =>
  ({
    ...(defaultPreloadedState[key] as object),
    ...(override as object),
  }) as TestRootState[K];

/**
 * Merges every slice the real root reducer declares. Driven by the keys of
 * `defaultPreloadedState` rather than a hand-written list, so a slice added to
 * `store/rootReducer.ts` is carried here automatically — the previous version
 * enumerated four slices and had already lost `voiceAliases`.
 */
const mergeSlices = (overrides: TestPreloadedState): TestRootState => {
  const keys = Object.keys(defaultPreloadedState) as (keyof TestRootState)[];
  return Object.fromEntries(
    keys.map(key => [key, mergeSlice(key, overrides[key])]),
  ) as TestRootState;
};

export const setupTestStore = (preloadedState?: TestPreloadedState) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState ? mergeSlices(preloadedState) : defaultPreloadedState,
  });
