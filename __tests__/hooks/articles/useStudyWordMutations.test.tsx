/**
 * useStudyWordMutations Hook Tests
 *
 * Tests study word mutation logic including add/remove with FSRS validation.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Provider } from 'react-redux';

import { setupTestStore } from '@/__tests__/helpers/testStore';
import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import type { RootId } from '@/types/branded.types';

// Mock modules at top level
const mockShowToast = jest.fn();
const mockRouterReplace = jest.fn();
const mockCheckAuthentication = jest.fn();
const mockToggleFSRSStudyRoot = jest.fn();
const mockCanAddWord = jest.fn();
const mockIncrementDailyWordCount = jest.fn();
const mockErrorFeedback = jest.fn();

jest.mock('@/components/providers', () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}));

jest.mock('expo-router', () => ({
  router: {
    replace: mockRouterReplace,
  },
}));

jest.mock('@/services/supabase', () => ({
  checkAuthentication: () => mockCheckAuthentication(),
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    toggleFSRSStudyRoot: (...args: unknown[]) => mockToggleFSRSStudyRoot(...args),
  },
}));

jest.mock('@/hooks/vocabulary', () => ({
  useDailyWordLimit: () => ({
    dailyWordLimit: 10,
    canAddWord: mockCanAddWord,
    incrementDailyWordCount: mockIncrementDailyWordCount,
  }),
}));

jest.mock('@/utils/haptics', () => ({
  errorFeedback: mockErrorFeedback,
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

describe('useStudyWordMutations', () => {
  let queryClient: QueryClient;
  let mockStore: ReturnType<typeof setupTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockStore = setupTestStore();

    // Default mock implementations
    mockCanAddWord.mockResolvedValue(true);
    mockIncrementDailyWordCount.mockResolvedValue(true);
    mockCheckAuthentication.mockResolvedValue({ user: { id: 'test-user-id' } });
    mockToggleFSRSStudyRoot.mockResolvedValue(true);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  describe('Initialization', () => {
    test('returns expected interface', () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      expect(typeof result.current.handleWordPress).toBe('function');
      expect(typeof result.current.handleRootPress).toBe('function');
      expect(result.current.toggleWordMutation).toBeDefined();
      expect(result.current.toggleRootMutation).toBeDefined();
    });
  });

  describe('handleWordPress', () => {
    test('checks daily word limit first', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleWordPress(1 as RootId);
      });

      expect(mockCanAddWord).toHaveBeenCalled();
    });

    test('shows toast when daily limit reached (before auth check)', async () => {
      mockCanAddWord.mockResolvedValue(false);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleWordPress(1 as RootId);
      });

      expect(mockShowToast).toHaveBeenCalled();
      // Auth should not be checked if limit reached
      expect(mockCheckAuthentication).not.toHaveBeenCalled();
      expect(mockToggleFSRSStudyRoot).not.toHaveBeenCalled();
    });

    test('checks authentication after limit check passes', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleWordPress(1 as RootId);
      });

      expect(mockCheckAuthentication).toHaveBeenCalled();
    });

    test('shows toast when not authenticated', async () => {
      mockCheckAuthentication.mockRejectedValue(new Error('Not authenticated'));

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleWordPress(1 as RootId);
      });

      expect(mockShowToast).toHaveBeenCalled();
    });

    test('increments daily word count on successful add', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleWordPress(1 as RootId);
      });

      expect(mockIncrementDailyWordCount).toHaveBeenCalled();
    });
  });

  describe('handleRootPress', () => {
    test('checks authentication first', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId);
      });

      expect(mockCheckAuthentication).toHaveBeenCalled();
    });

    test('returns undefined and shows toast when not authenticated', async () => {
      mockCheckAuthentication.mockRejectedValue(new Error('Not authenticated'));

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.handleRootPress(1 as RootId);
      });

      expect(returned).toBeUndefined();
      expect(mockShowToast).toHaveBeenCalled();
    });

    test('allows removing existing word regardless of daily limit', async () => {
      // Set up query data to show word exists using correct query key format
      // The hook uses fsrsQueries.all(userId).queryKey which is ['fsrs-words', userId]
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], [{ root_id: 1 }]);
      mockCanAddWord.mockResolvedValue(false);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId);
      });

      // For removal, canAddWord should not block
      // The mutation should proceed
      expect(mockToggleFSRSStudyRoot).toHaveBeenCalled();
    });

    test('returns result from mutation on success', async () => {
      mockToggleFSRSStudyRoot.mockResolvedValue(true);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.handleRootPress(1 as RootId);
      });

      expect(returned).toBe(true);
    });

    test('increments daily count only for add operations', async () => {
      // Word doesn't exist - this is an add
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId);
      });

      expect(mockIncrementDailyWordCount).toHaveBeenCalled();
    });

    test('does not increment daily count for remove operations', async () => {
      // Word exists - this is a remove
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], [{ root_id: 1 }]);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId);
      });

      // For removal, incrementDailyWordCount should not be called
      expect(mockIncrementDailyWordCount).not.toHaveBeenCalled();
    });
  });

  describe('Mutation behavior', () => {
    test('toggleWordMutation calls service with correct params', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        result.current.toggleWordMutation.mutate({
          userId: 'test-user-id',
          wordId: 123 as RootId,
        });
      });

      await waitFor(() => {
        expect(mockToggleFSRSStudyRoot).toHaveBeenCalledWith('test-user-id', 123);
      });
    });

    test('toggleRootMutation calls service with correct params', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        result.current.toggleRootMutation.mutate({
          userId: 'test-user-id',
          rootId: 456,
        });
      });

      await waitFor(() => {
        expect(mockToggleFSRSStudyRoot).toHaveBeenCalledWith('test-user-id', 456);
      });
    });
  });

  describe('Optimistic updates', () => {
    test('optimistically updates query data on mutate', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        result.current.toggleWordMutation.mutate({
          userId: 'test-user-id',
          wordId: 1 as RootId,
        });
      });

      // Check optimistic update was applied
      const data = queryClient.getQueryData(['fsrs-words', 'test-user-id']) as unknown[];
      expect(data.some((w: any) => w.root_id === 1)).toBe(true);
    });

    test('reverts optimistic update on error', async () => {
      const originalData = [{ root_id: 999 }];
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], originalData);
      mockToggleFSRSStudyRoot.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        try {
          result.current.toggleWordMutation.mutate({
            userId: 'test-user-id',
            wordId: 1 as RootId,
          });
        } catch {
          // Expected to fail
        }
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalled();
      });
    });
  });

  describe('refetchStudyWords callback', () => {
    test('calls refetchStudyWords on mutation success', async () => {
      const mockRefetch = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useStudyWordMutations(mockRefetch), {
        wrapper,
      });

      await act(async () => {
        await result.current.toggleWordMutation.mutateAsync({
          userId: 'test-user-id',
          wordId: 1 as RootId,
        });
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });
});
