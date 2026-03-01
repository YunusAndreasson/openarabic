import { combineReducers, configureStore } from '@reduxjs/toolkit';
import React, { useMemo, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import playlistReducer from '../../store/playlistSlice';
import editModeReducer from '../../store/editModeSlice';
import settingsReducer from '../../store/settingsSlice';
import themeReducer from '../../store/themeSlice';

const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  playlist: playlistReducer,
  editMode: editModeReducer,
});

export type TestRootState = ReturnType<typeof rootReducer>;

export const defaultPreloadedState: TestRootState = rootReducer(undefined, {
  type: '@@INIT',
}) as TestRootState;

export const setupTestStore = (preloadedState?: Partial<TestRootState>) =>
  configureStore({
    reducer: rootReducer,
    preloadedState: preloadedState
      ? { ...defaultPreloadedState, ...preloadedState }
      : defaultPreloadedState,
  });

type Props = {
  children: ReactNode;
  preloadedState?: Partial<TestRootState>;
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
