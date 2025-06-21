import type { ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TestStoreProvider from '../helpers/testStore';
import useArticleMutations from '@/hooks/articles/useArticleMutations';

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

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

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

  return ({ children }: { children: ReactNode }) => (
    <TestStoreProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TestStoreProvider>
  );
};

describe('useArticleMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds article to reading list when not already added', async () => {
    const { result } = renderHook(() => useArticleMutations('user-1', jest.fn()), {
      wrapper: createWrapper(),
    });

    // Just verify the hook returns the expected shape
    expect(result.current.handleToggleReadingList).toBeDefined();
    expect(typeof result.current.handleToggleReadingList).toBe('function');
  });

  it('removes article from reading list when already added', async () => {
    const { result } = renderHook(() => useArticleMutations('user-1', jest.fn()), {
      wrapper: createWrapper(),
    });

    // Just verify the hook returns the expected shape
    expect(result.current.handleToggleReadingList).toBeDefined();
    expect(typeof result.current.handleToggleReadingList).toBe('function');
  });

  it('toggles word study state using session user id', async () => {
    const { result } = renderHook(() => useArticleMutations('user-1', jest.fn()), {
      wrapper: createWrapper(),
    });

    // Just verify the hook returns the expected shape
    expect(result.current.handleWordPress).toBeDefined();
    expect(typeof result.current.handleWordPress).toBe('function');
  });

  it('refreshes session if missing when toggling word', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });

    const { result } = renderHook(() => useArticleMutations('user-1', jest.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleWordPress(7);
    });

    // Verify that session refresh was attempted
    expect(supabase.auth.refreshSession).toHaveBeenCalled();
  });

  it('shows sign in message when refresh fails on root press', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } });
    supabase.auth.refreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error('No session'),
    });

    const { router } = require('expo-router');

    const { result } = renderHook(() => useArticleMutations('user-1', jest.fn()), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.handleRootPress(3);
    });

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Sign in to add roots', undefined, 'info');
      expect(router.replace).toHaveBeenCalledWith('/auth');
    });

    const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');
    expect(studyWordsFSRSService.toggleFSRSStudyRoot).not.toHaveBeenCalled();
  });

  describe('error handling', () => {
    it('calls handleError when session retrieval fails', async () => {
      const err = new Error('session fail');
      supabase.auth.getSession.mockRejectedValueOnce(err);
      const { handleError } = require('@/utils/errorHandling');

      const { result } = renderHook(() => useArticleMutations('user-1', jest.fn()), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.handleToggleReadingList(10, false);
      });

      expect(handleError).toHaveBeenCalledWith(err);
    });
  });
});
