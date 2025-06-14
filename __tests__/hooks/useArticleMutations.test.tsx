import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import themeReducer from '@/store/themeSlice';
import settingsReducer from '@/store/settingsSlice';
import readingListReducer from '@/store/readingListSlice';
import filtersReducer from '@/store/filtersSlice';
import listenReducer from '@/store/listenSlice';
import useArticleMutations from '@/hooks/articles/useArticleMutations';

const store = configureStore({
  reducer: combineReducers({
    theme: themeReducer,
    settings: settingsReducer,
    readingList: readingListReducer,
    filters: filtersReducer,
    listen: listenReducer,
  }),
});

// Mock services used by the hook
jest.mock('@/services/readingList', () => ({
  readingListService: {
    addToReadingList: jest.fn().mockResolvedValue(undefined),
    removeFromReadingList: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    toggleFSRSStudyRoot: jest.fn().mockResolvedValue(true),
  },
  FSRS_QUERY_KEYS: {
    all: () => ['fsrs'],
    due: () => ['due'],
  },
}));

const mockShowToast = jest.fn();
jest.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

jest.mock('@sentry/react-native', () => ({}));

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
    },
  },
}));

const { readingListService } = require('@/services/readingList');
const { supabase } = require('@/services/supabase');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
};

describe('useArticleMutations', () => {
  it('adds article to reading list when not already added', async () => {
    const { result } = renderHook(
      () => useArticleMutations('user-1', jest.fn()),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleToggleReadingList(42, false);
    });

    expect(readingListService.addToReadingList).toHaveBeenCalledWith(
      'user-1',
      42
    );
  });

  it('removes article from reading list when already added', async () => {
    const { result } = renderHook(
      () => useArticleMutations('user-1', jest.fn()),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleToggleReadingList(99, true);
    });

    expect(readingListService.removeFromReadingList).toHaveBeenCalledWith(
      'user-1',
      99
    );
  });

  it('toggles word study state using session user id', async () => {
    const { result } = renderHook(
      () => useArticleMutations('user-1', jest.fn()),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleWordPress(5);
    });

    const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');
    expect(studyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(
      'user-1',
      5
    );
  });

  it('refreshes session if missing when toggling word', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    const { result } = renderHook(
      () => useArticleMutations('user-1', jest.fn()),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleWordPress(7);
    });

    expect(supabase.auth.refreshSession).toHaveBeenCalled();
    const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');
    expect(studyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(
      'user-1',
      7
    );
  });

  it('shows sign in message when refresh fails on root press', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    supabase.auth.refreshSession.mockResolvedValueOnce({ data: { session: null }, error: new Error('No session') });

    const { router } = require('expo-router');

    const { result } = renderHook(
      () => useArticleMutations('user-1', jest.fn()),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleRootPress(3);
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      'Please sign in to add roots to your study list',
      undefined,
      'info'
    );
    expect(router.replace).toHaveBeenCalledWith('/auth');
    const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');
    expect(studyWordsFSRSService.toggleFSRSStudyRoot).not.toHaveBeenCalled();
  });
});
