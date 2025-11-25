/**
 * useReadingListMutations Hook Tests
 *
 * Tests reading list (bookmarks) mutation logic.
 *
 * Modern Jest 29 Patterns:
 * -  @jest/globals explicit imports
 * -  jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Provider } from 'react-redux';

import { setupTestStore } from '@/__tests__/helpers/testStore';
import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { useReadingListMutations } from '@/hooks/articles/useReadingListMutations';
import type { ArticleId } from '@/types/branded.types';

// Mock modules at top level
const mockRouterReplace = jest.fn();
const mockCheckAuthentication = jest.fn();
const mockAddToReadingList = jest.fn();
const mockRemoveFromReadingList = jest.fn();

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

describe('useReadingListMutations', () => {
  let queryClient: QueryClient;
  let mockStore: ReturnType<typeof setupTestStore>;
  let mockRefetchReadingListStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
    mockStore = setupTestStore();
    mockRefetchReadingListStatus = jest.fn();

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
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      expect(typeof result.current.handleToggleReadingList).toBe('function');
      expect(result.current.addToReadingListMutation).toBeDefined();
      expect(result.current.removeFromReadingListMutation).toBeDefined();
    });
  });

  describe('handleToggleReadingList', () => {
    test('returns early for undefined articleId', async () => {
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(undefined, false);
      });

      expect(mockCheckAuthentication).not.toHaveBeenCalled();
      expect(mockAddToReadingList).not.toHaveBeenCalled();
    });

    test('checks authentication before toggling', async () => {
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(1 as ArticleId, false);
      });

      expect(mockCheckAuthentication).toHaveBeenCalled();
    });

    test('redirects to auth when not authenticated', async () => {
      mockCheckAuthentication.mockRejectedValue(new Error('Not authenticated'));

      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(1 as ArticleId, false);
      });

      expect(mockRouterReplace).toHaveBeenCalled();
    });

    test('calls addToReadingList when not in reading list', async () => {
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(123 as ArticleId, false);
      });

      await waitFor(() => {
        expect(mockAddToReadingList).toHaveBeenCalledWith('test-user-id', 123);
      });
    });

    test('calls removeFromReadingList when in reading list', async () => {
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        await result.current.handleToggleReadingList(123 as ArticleId, true);
      });

      await waitFor(() => {
        expect(mockRemoveFromReadingList).toHaveBeenCalledWith('test-user-id', 123);
      });
    });
  });

  describe('addToReadingListMutation', () => {
    test('calls bookmark service with correct params', async () => {
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        result.current.addToReadingListMutation.mutate({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      await waitFor(() => {
        expect(mockAddToReadingList).toHaveBeenCalledWith('test-user-id', 42);
      });
    });

    test('calls refetchReadingListStatus on success', async () => {
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        await result.current.addToReadingListMutation.mutateAsync({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      expect(mockRefetchReadingListStatus).toHaveBeenCalled();
    });

    test('handles duplicate key errors silently', async () => {
      const { handleError } = require('@/utils/errorHandling');
      mockAddToReadingList.mockRejectedValue(new Error('duplicate key value violates constraint'));

      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
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
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        result.current.removeFromReadingListMutation.mutate({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      await waitFor(() => {
        expect(mockRemoveFromReadingList).toHaveBeenCalledWith('test-user-id', 42);
      });
    });

    test('calls refetchReadingListStatus on success', async () => {
      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
        wrapper,
      });

      await act(async () => {
        await result.current.removeFromReadingListMutation.mutateAsync({
          userId: 'test-user-id',
          articleId: 42 as ArticleId,
        });
      });

      expect(mockRefetchReadingListStatus).toHaveBeenCalled();
    });

    test('handles errors silently', async () => {
      const { handleError } = require('@/utils/errorHandling');
      mockRemoveFromReadingList.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
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

      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
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

      const { result } = renderHook(() => useReadingListMutations(mockRefetchReadingListStatus), {
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
