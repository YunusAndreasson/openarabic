import { combineReducers, configureStore } from '@reduxjs/toolkit';
import React, { useMemo, type ReactNode } from 'react';
import { Provider } from 'react-redux';

import playlistReducer from '../../store/playlistSlice';
import editModeReducer from '../../store/editModeSlice';
import filtersReducer from '../../store/filtersSlice';
import settingsReducer from '../../store/settingsSlice';

import themeReducer from '../../store/themeSlice';

const rootReducer = combineReducers({
  theme: themeReducer,
  settings: settingsReducer,
  filters: filtersReducer,
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

// Mock useAuth hook for tests that need authentication context
const mockUseAuth = jest.fn(() => ({
  user: { id: 'test-user-id', email: 'test@example.com' },
  isLoading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  refreshSession: jest.fn(),
}));

// Mock AuthProvider for tests that need authentication context
const MockAuthProvider = ({ children }: { children: ReactNode }) => {
  // Mock the useAuth hook globally for this test
  jest.doMock('../../hooks/auth/useAuth', () => ({
    useAuth: mockUseAuth,
  }));

  return (
    <div data-testid="mock-auth-provider" data-user-id="test-user-id">
      {children}
    </div>
  );
};

// Combined provider that includes both Redux store and Auth context
export const TestProviders = ({ children, preloadedState }: Props) => {
  return (
    <TestStoreProvider preloadedState={preloadedState}>
      <MockAuthProvider>{children}</MockAuthProvider>
    </TestStoreProvider>
  );
};

export default TestStoreProvider;

// Basic test to avoid Jest "no tests" error
test('testStore helper initializes store', () => {
  const store = setupTestStore();
  expect(store.getState()).toEqual(defaultPreloadedState);
});
