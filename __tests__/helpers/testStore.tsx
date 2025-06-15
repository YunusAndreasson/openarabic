import { useMemo, type ReactNode } from 'react';
import { Provider } from 'react-redux';
import {
  configureStore,
  combineReducers,
  type PreloadedState,
} from '@reduxjs/toolkit';

import themeReducer from '@/store/themeSlice';
import settingsReducer from '@/store/settingsSlice';
import readingListReducer from '@/store/readingListSlice';
import filtersReducer from '@/store/filtersSlice';
import listenReducer from '@/store/listenSlice';

const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  readingList: readingListReducer,
  filters: filtersReducer,
  listen: listenReducer,
});

export type TestRootState = ReturnType<typeof rootReducer>;

export const defaultPreloadedState: TestRootState = rootReducer(undefined, {
  type: '@@INIT',
}) as TestRootState;

export const setupTestStore = (
  preloadedState: PreloadedState<TestRootState> = defaultPreloadedState,
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
