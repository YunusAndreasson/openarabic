import { combineReducers, configureStore, type PreloadedState } from '@reduxjs/toolkit';
import { useMemo, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import filtersReducer from '@/store/filtersSlice';
import listenReducer from '@/store/listenSlice';

import settingsReducer from '@/store/settingsSlice';
import themeReducer from '@/store/themeSlice';

const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  filters: filtersReducer,
  listen: listenReducer,
});

export type TestRootState = ReturnType<typeof rootReducer>;

export const defaultPreloadedState: TestRootState = rootReducer(undefined, {
  type: '@@INIT',
}) as TestRootState;

export const setupTestStore = (
  preloadedState: PreloadedState<TestRootState> = defaultPreloadedState
) =>
  configureStore({
    reducer: rootReducer,
    preloadedState,
  });

type Props = {
  children: ReactNode;
  preloadedState?: PreloadedState<TestRootState>;
};

export const TestStoreProvider = ({ children, preloadedState }: Props) => {
  const store = useMemo(() => setupTestStore(preloadedState), [preloadedState]);
  return <Provider store={store}>{children}</Provider>;
};

export default TestStoreProvider;

// Basic test to avoid Jest "no tests" error
test('testStore helper initializes store', () => {
  const store = setupTestStore();
  expect(store.getState()).toEqual(defaultPreloadedState);
});
