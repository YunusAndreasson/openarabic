/**
 * useReadingListMutations Hook Tests
 *
 * Tests reading list (bookmarks) mutation logic.
 *
 * Modern Jest 29 Patterns:
 * -  @jest/globals explicit imports
 * -  jest.mocked() for type-safe mocking
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';
import { Provider } from 'react-redux';

import { setupTestStore } from '@/__tests__/helpers/testStore';
import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { STRINGS } from '@/constants/strings';
import { useReadingListMutations } from '@/hooks/articles/useReadingListMutations';
import type { ArticleId } from '@/types/branded.types';
import { ToastType } from '@/types/enums';

// Mock modules at top level
const mockRouterReplace = jest.fn();
const mockShowToast = jest.fn();
const mockCheckAuthentication = jest.fn(async (..._args: unknown[]) => ({
  user: { id: 'test-user-id' },
}));
const mockAddToReadingList = jest.fn(async (..._args: unknown[]) => undefined);
const mockRemoveFromReadingList = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('expo-router', () => {
  const mockRouter = {
    replace: (...args: unknown[]) => mockRouterReplace(...args),
    push: jest.fn(),
    back: jest.fn(),
  };
  return {
    router: mockRouter,
  };
});

jest.mock('@/components/providers', () => ({
  useToast: () => ({ showToast: (...args: unknown[]) => mockShowToast(...args) }),
}));

jest.mock('@/services/supabase', () => ({
  checkAuthentication: () => mockCheckAuthentication(),
}));

jest.mock('@/services/bookmark', () => ({
  bookmarkService: {
    addToReadingList: (...args: unknown[]) => mockAddToReadingList(...args),
    removeFromReadingList: (...args: unknown[]) => mockRemoveFromReadingList(...args),
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

/** The service is called as a managed request: the mutation cache reports a failure once. */
const MANAGED = expect.objectContaining({ managed: true });

describe('useReadingListMutations', () => {
  let queryClient: QueryClient;
  let mockStore: ReturnType<typeof setupTestStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockStore = setupTestStore();

    // Default mock implementations
    mockCheckAuthentication.mockResolvedValue({ user: { id: 'test-user-id' } });
    mockAddToReadingList.mockResolvedValue(undefined);
    mockRemoveFromReadingList.mockResolvedValue(undefined);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={mockStore}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );

  describe('Initialization', () => {
    test('returns expected interface', () => {
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      expect(typeof result.current.handleToggleReadingList).toBe('function');
      expect(result.current.addToReadingListMutation).toBeDefined();
      expect(result.current.removeFromReadingListMutation).toBeDefined();
    });
  });

  describe('handleToggleReadingList', () => {
    test('returns early for undefined articleId', async () => {
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(undefined, false);
      });

      expect(mockCheckAuthentication).not.toHaveBeenCalled();
      expect(mockAddToReadingList).not.toHaveBeenCalled();
    });

    test('checks authentication before toggling', async () => {
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(1 as ArticleId, false);
      });

      expect(mockCheckAuthentication).toHaveBeenCalled();
    });

    test('keeps the reader in place and asks to sign in when the session check fails', async () => {
      mockCheckAuthentication.mockRejectedValue(new Error('Not authenticated'));

      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      let succeeded: boolean | undefined;
      await act(async () => {
        succeeded = await result.current.handleToggleReadingList(1 as ArticleId, false);
      });

      expect(succeeded).toBe(false);
      // The Stack.Protected guards own auth navigation; a redirect here bounced to Explore.
      expect(mockRouterReplace).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        STRINGS.PLEASE_SIGN_IN_TO_SAVE_ARTICLES,
        undefined,
        ToastType.INFO,
      );
      expect(mockAddToReadingList).not.toHaveBeenCalled();
    });

    test('calls addToReadingList when not in reading list', async () => {
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(123 as ArticleId, false);
      });

      await waitFor(() => {
        expect(mockAddToReadingList).toHaveBeenCalledWith('test-user-id', 123, MANAGED);
      });
    });

    test('calls removeFromReadingList when in reading list', async () => {
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(123 as ArticleId, true);
      });

      await waitFor(() => {
        expect(mockRemoveFromReadingList).toHaveBeenCalledWith('test-user-id', 123, MANAGED);
      });
    });

    test('resolves only after the bookmark mutation settles', async () => {
      let resolveMutation: (() => void) | undefined;
      mockAddToReadingList.mockImplementation(
        () => new Promise<void>(resolve => (resolveMutation = resolve)) as never,
      );

      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      let settled = false;
      const togglePromise = result.current
        .handleToggleReadingList(123 as ArticleId, false)
        .then(value => {
          settled = true;
          return value;
        });

      await waitFor(() => expect(mockAddToReadingList).toHaveBeenCalled());
      expect(settled).toBe(false);

      await act(async () => resolveMutation?.());
      await expect(togglePromise).resolves.toBe(true);
    });

    test('returns false without redirecting when the mutation fails', async () => {
      mockAddToReadingList.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      let succeeded: boolean | undefined;
      await act(async () => {
        succeeded = await result.current.handleToggleReadingList(123 as ArticleId, false);
      });

      expect(succeeded).toBe(false);
      expect(mockRouterReplace).not.toHaveBeenCalled();
    });
  });

  describe('addToReadingListMutation', () => {
    test('calls bookmark service with correct params', async () => {
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        result.current.addToReadingListMutation.mutate({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      await waitFor(() => {
        expect(mockAddToReadingList).toHaveBeenCalledWith('test-user-id', 42, MANAGED);
      });
    });

    test('refreshes the reading list and the tracks of every audio language on success', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.addToReadingListMutation.mutateAsync({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['readingList', 'test-user-id'],
      });
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['enhancedAudioTracks', 'test-user-id'],
      });
    });

    // Whether an article is saved is a select of the reading list, and the
    // reader's button holds its optimistic state until the mutation settles.
    test('settles only once the reading list has refetched', async () => {
      let resolveList: ((list: never[]) => void) | undefined;
      const listFetch = jest.fn(() => new Promise<never[]>(resolve => (resolveList = resolve)));
      const observer = renderHook(
        () =>
          useQuery({
            queryKey: ['readingList', 'test-user-id'],
            queryFn: listFetch,
            staleTime: Infinity,
            initialData: [],
          }),
        { wrapper },
      );
      const { result } = renderHook(() => useReadingListMutations(), { wrapper });

      let settled = false;
      let mutation: Promise<void> | undefined;
      await act(async () => {
        mutation = result.current.addToReadingListMutation
          .mutateAsync({ userId: 'test-user-id', articleId: 42 as ArticleId })
          .then(() => {
            settled = true;
          });
      });

      await waitFor(() => expect(listFetch).toHaveBeenCalled());
      expect(settled).toBe(false);

      await act(async () => {
        resolveList?.([]);
        await mutation;
      });
      expect(settled).toBe(true);
      observer.unmount();
    });

    test('handles duplicate key errors silently', async () => {
      const { handleError } = require('@/utils/errorHandling');
      mockAddToReadingList.mockRejectedValue(new Error('duplicate key value violates constraint'));

      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        try {
          await result.current.addToReadingListMutation.mutateAsync({
            userId: 'test-user-id',
            articleId: 42 as ArticleId,
          });
        } catch {
          // Expected to fail
        }
      });

      // Should not log duplicate errors
      expect(handleError).not.toHaveBeenCalled();
    });
  });

  describe('removeFromReadingListMutation', () => {
    test('calls bookmark service with correct params', async () => {
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        result.current.removeFromReadingListMutation.mutate({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      await waitFor(() => {
        expect(mockRemoveFromReadingList).toHaveBeenCalledWith('test-user-id', 42, MANAGED);
      });
    });

    test('refreshes the reading list on success', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');
      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.removeFromReadingListMutation.mutateAsync({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ['readingList', 'test-user-id'],
      });
    });

    test('handles errors silently', async () => {
      const { handleError } = require('@/utils/errorHandling');
      mockRemoveFromReadingList.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        try {
          await result.current.removeFromReadingListMutation.mutateAsync({
            userId: 'test-user-id',
            articleId: 42 as ArticleId,
          });
        } catch {
          // Expected to fail
        }
      });

      // Should call handleError with showToast: false
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ showToast: false }),
      );
    });
  });

  describe('Query invalidation', () => {
    test('invalidates queries on successful add', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.addToReadingListMutation.mutateAsync({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });

    test('invalidates queries on successful remove', async () => {
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(() => useReadingListMutations(), {
        wrapper,
      });

      await act(async () => {
        await result.current.removeFromReadingListMutation.mutateAsync({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      expect(invalidateQueriesSpy).toHaveBeenCalled();
    });
  });
});
