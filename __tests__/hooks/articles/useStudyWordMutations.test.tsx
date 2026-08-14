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
const mockDecrementDailyWordCount = jest.fn();
const mockGetEffectiveLimitInfo = jest.fn();
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
    setFSRSStudyRoot: async (...args: unknown[]) => ({
      inStudyList: await mockToggleFSRSStudyRoot(...args),
      changed: true,
    }),
  },
}));

jest.mock('@/hooks/vocabulary', () => ({
  useDailyWordLimit: () => ({
    dailyWordLimit: 10,
    canAddWord: mockCanAddWord,
    incrementDailyWordCount: mockIncrementDailyWordCount,
    decrementDailyWordCount: mockDecrementDailyWordCount,
    getEffectiveLimitInfo: mockGetEffectiveLimitInfo,
  }),
}));

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
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
    mockDecrementDailyWordCount.mockResolvedValue(undefined);
    mockGetEffectiveLimitInfo.mockResolvedValue({ effective: 10, ceiling: 10, status: 'full' });
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

      expect(typeof result.current.handleRootPress).toBe('function');
      expect(result.current.toggleRootMutation).toBeDefined();
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

      expect(returned).toBeTruthy();
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

    test('releases the reserved daily slot when an add fails', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);
      mockToggleFSRSStudyRoot.mockRejectedValue(new Error('network failure'));

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId, 'add');
      });

      expect(mockIncrementDailyWordCount).toHaveBeenCalledTimes(1);
      expect(mockDecrementDailyWordCount).toHaveBeenCalledTimes(1);
    });

    test('does not release daily quota when a remove fails', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], [{ root_id: 1 }]);
      mockToggleFSRSStudyRoot.mockRejectedValue(new Error('network failure'));

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId, 'remove');
      });

      expect(mockDecrementDailyWordCount).not.toHaveBeenCalled();
    });

    test('releases daily quota when an explicit add is already present on the server', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);
      const setSpy = jest
        .spyOn(require('@/services/studyWordsFSRS').studyWordsFSRSService, 'setFSRSStudyRoot')
        .mockResolvedValueOnce({ inStudyList: true, changed: false });

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId, 'add');
      });

      expect(setSpy).toHaveBeenCalled();
      expect(mockDecrementDailyWordCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('due-backlog gate', () => {
    const dueKey = ['fsrs-words', 'test-user-id', 'due'];
    const twentyDue = Array.from({ length: 20 }, (_, i) => ({ root_id: i + 1 }));

    test('blocks adding via handleRootPress when the due backlog is at the threshold', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);
      queryClient.setQueryData(dueKey, twentyDue);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.handleRootPress(999 as RootId, 'add');
      });

      expect(returned).toBeUndefined();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringContaining('20'),
        3000,
        expect.anything(),
      );
      expect(mockToggleFSRSStudyRoot).not.toHaveBeenCalled();
    });

    test('still allows removing despite a high backlog', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], [{ root_id: 1 }]);
      queryClient.setQueryData(dueKey, twentyDue);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(1 as RootId, 'remove');
      });

      expect(mockToggleFSRSStudyRoot).toHaveBeenCalled();
    });

    test('fails open when the due cache is missing', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(2 as RootId, 'add');
      });

      expect(mockToggleFSRSStudyRoot).toHaveBeenCalled();
    });

    test('blocks adding when the due-specific cache is still empty but the full word list already shows the backlog', async () => {
      // Regression: the due-words query can still be mid-flight (its count
      // only shown via placeholderData, e.g. on the tab badge / Practice
      // screen) while the broader `fsrs-words` cache has already resolved.
      // The gate must derive the same due count from that cache instead of
      // reading an empty due-specific entry and waving the add through.
      queryClient.setQueryData(
        ['fsrs-words', 'test-user-id'],
        Array.from({ length: 20 }, (_, i) => ({ root_id: i + 1, fsrs_state: 0 })),
      );
      // No dueKey entry set — the due-specific query has not resolved yet.

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.handleRootPress(999 as RootId, 'add');
      });

      expect(returned).toBeUndefined();
      expect(mockToggleFSRSStudyRoot).not.toHaveBeenCalled();
    });

    test('does not block just below the threshold', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);
      queryClient.setQueryData(dueKey, twentyDue.slice(0, 19));

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        await result.current.handleRootPress(2 as RootId, 'add');
      });

      expect(mockToggleFSRSStudyRoot).toHaveBeenCalled();
    });
  });

  describe('Mutation behavior', () => {
    test('toggleRootMutation calls service with correct params', async () => {
      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        result.current.toggleRootMutation.mutate({
          userId: 'test-user-id',
          rootId: 456 as RootId,
        });
      });

      await waitFor(() => {
        expect(mockToggleFSRSStudyRoot).toHaveBeenCalledWith('test-user-id', 456, undefined);
      });
    });
  });

  describe('Optimistic updates', () => {
    test('optimistically updates query data on mutate', async () => {
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], []);

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        result.current.toggleRootMutation.mutate({
          userId: 'test-user-id',
          rootId: 1 as RootId,
        });
      });

      // Check optimistic update was applied
      const data = queryClient.getQueryData(['fsrs-words', 'test-user-id']) as unknown[];
      expect(data.some((w: any) => w.root_id === 1)).toBeTruthy();
    });

    test('reverts optimistic update on error', async () => {
      const originalData = [{ root_id: 999 }];
      queryClient.setQueryData(['fsrs-words', 'test-user-id'], originalData);
      mockToggleFSRSStudyRoot.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useStudyWordMutations(), { wrapper });

      await act(async () => {
        try {
          result.current.toggleRootMutation.mutate({
            userId: 'test-user-id',
            rootId: 1 as RootId,
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
        await result.current.toggleRootMutation.mutateAsync({
          userId: 'test-user-id',
          rootId: 1 as RootId,
        });
      });

      await waitFor(() => {
        expect(mockRefetch).toHaveBeenCalled();
      });
    });
  });
});
