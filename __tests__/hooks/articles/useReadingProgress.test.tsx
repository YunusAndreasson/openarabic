/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { createHookTestWrapper, type HookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { readingProgressQueries } from '@/constants/queries';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { readingProgressService } from '@/services/readingProgress';
import type { ReadingProgress } from '@/services/readingProgress';
import { articleId } from '@/__tests__/helpers/ids';
import type { ArticleId } from '@/types/branded.types';

// Mock service layer
jest.mock('@/services/readingProgress');
jest.mock('@/hooks/auth/useAuth');

const mockReadingProgressService = readingProgressService as jest.Mocked<
  typeof readingProgressService
>;

// Mock useAuth to provide test user
const mockUseAuth = jest.requireMock('@/hooks/auth/useAuth');

describe('useReadingProgress', () => {
  let queryClient: QueryClient;
  let wrapper: HookTestWrapper;
  const testUserId = 'test-user-123';
  const testArticleId = articleId(42);

  beforeEach(() => {
    jest.clearAllMocks();
    ({ wrapper, queryClient } = createHookTestWrapper());

    // Setup auth mock to return test user
    mockUseAuth.useAuth = jest.fn((..._args: unknown[]) => ({
      user: { id: testUserId },
      isLoading: false,
    }));

    // Default mock for bulk reading progress
    mockReadingProgressService.getBulkProgress.mockResolvedValue(
      new Map<ArticleId, ReadingProgress>([
        [
          testArticleId,
          {
            user_id: testUserId,
            article_id: testArticleId,
            last_sentence_read: 5,
            total_sentences: 10,
            updated_at: '2024-01-01T12:00:00Z',
            created_at: '2024-01-01T10:00:00Z',
          },
        ],
      ]),
    );

    // Mock updateProgress to return a Promise (even though it returns void)
    mockReadingProgressService.updateProgress.mockResolvedValue(undefined);
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe('Query Configuration', () => {
    // An observer option, not a query option: it lives on
    // `readingProgressQueries.bulk()`, and a cached `Query`'s `.options` never
    // carries it. Reading it off the cache entry (as this suite used to)
    // compared `undefined` to falsy and could not fail. (Not refetching on
    // mount is the app-wide default — app/_layout.tsx — so the factory no
    // longer restates it.)
    test('bulk progress does not refetch on reconnect', () => {
      expect(readingProgressQueries.bulk(testUserId).refetchOnReconnect).toBe(false);
    });

    test('the hook registers exactly one bulk-progress query', async () => {
      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: readingProgressQueries.bulk(testUserId).queryKey });

      expect(queries).toHaveLength(1);
    });
  });

  describe('Cache Updates', () => {
    test('updates bulk progress locally without refetching it', async () => {
      // Mock successful update (updateProgress returns void)
      mockReadingProgressService.updateProgress.mockResolvedValue(undefined);

      // Spy on queryClient.invalidateQueries
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      // Wait for initial query to settle
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Clear spy calls from initial render
      invalidateQueriesSpy.mockClear();

      // Trigger progress update
      await act(async () => {
        result.current.updateProgress(7);
        // Wait for mutation to complete
        await waitFor(() => expect(mockReadingProgressService.updateProgress).toHaveBeenCalled());
      });

      expect(invalidateQueriesSpy).not.toHaveBeenCalled();
      expect(
        queryClient
          .getQueryData<Map<ArticleId, ReadingProgress>>(
            readingProgressQueries.bulk(testUserId).queryKey,
          )
          ?.get(testArticleId)?.last_sentence_read,
      ).toBe(7);

      invalidateQueriesSpy.mockRestore();
    });

    test('should NOT invalidate cache on mutation error', async () => {
      // Mock failed update
      const error = new Error('Network error');
      mockReadingProgressService.updateProgress.mockRejectedValue(error);

      // Spy on queryClient.invalidateQueries
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      // Wait for initial query to settle
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Clear spy calls from initial render
      invalidateQueriesSpy.mockClear();

      // Trigger progress update (should fail)
      await act(async () => {
        result.current.updateProgress(7);
        // Wait for mutation to fail
        await waitFor(() => expect(mockReadingProgressService.updateProgress).toHaveBeenCalled());
      });

      // Verify NO cache invalidation happened on error
      expect(invalidateQueriesSpy).not.toHaveBeenCalled();

      invalidateQueriesSpy.mockRestore();
    });
  });

  describe('Mutation Flow', () => {
    test('coalesces visible sentences into one latest-position write', async () => {
      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      mockReadingProgressService.updateProgress.mockClear();

      jest.useFakeTimers();
      try {
        act(() => {
          result.current.scheduleProgressUpdate(6);
          result.current.scheduleProgressUpdate(8);
        });

        expect(mockReadingProgressService.updateProgress).not.toHaveBeenCalled();

        await act(async () => {
          jest.advanceTimersByTime(500);
          await Promise.resolve();
        });

        expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(1);
        expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith(
          expect.objectContaining({ lastSentenceRead: 8 }),
          expect.objectContaining({ managed: true }),
        );
      } finally {
        jest.useRealTimers();
      }
    });

    test('should successfully update reading progress when active', async () => {
      // Mock successful update (updateProgress returns void)
      mockReadingProgressService.updateProgress.mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      // Wait for initial query
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Trigger update
      await act(async () => {
        result.current.updateProgress(8);
        await waitFor(() => expect(mockReadingProgressService.updateProgress).toHaveBeenCalled());
      });

      // Verify service was called with correct params — as a managed request,
      // so the mutation cache reports a failure once instead of per attempt
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith(
        {
          userId: testUserId,
          articleId: testArticleId,
          lastSentenceRead: 8,
          totalSentences: 10,
        },
        expect.objectContaining({ managed: true }),
      );
    });

    test('keeps the high-water mark when requests settle out of order', async () => {
      const resolvers = new Map<number, () => void>();
      mockReadingProgressService.updateProgress.mockImplementation(
        ({ lastSentenceRead }) =>
          new Promise<void>(resolve => {
            resolvers.set(lastSentenceRead, resolve);
          }),
      );

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.updateProgress(7);
        result.current.updateProgress(8);
      });
      await waitFor(() =>
        expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2),
      );

      await act(async () => {
        resolvers.get(8)?.();
        await Promise.resolve();
        resolvers.get(7)?.();
      });

      act(() => result.current.updateProgress(8));
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2);
    });

    test('allows a failed reserved position to be retried', async () => {
      mockReadingProgressService.updateProgress
        .mockRejectedValueOnce(new Error('temporary failure'))
        .mockResolvedValue(undefined);

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => result.current.updateProgress(7));
      await waitFor(() =>
        expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(1),
      );
      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      act(() => result.current.updateProgress(7));
      await waitFor(() =>
        expect(mockReadingProgressService.updateProgress).toHaveBeenCalledTimes(2),
      );
    });

    test('should NOT update progress when inactive via updateProgress callback', async () => {
      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: false, // Inactive
          }),
        { wrapper },
      );

      // Wait for initial query and article open tracking to complete
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Clear calls from article open tracking
      mockReadingProgressService.updateProgress.mockClear();

      // Attempt update while inactive via the updateProgress callback
      await act(async () => {
        result.current.updateProgress(8);
      });

      // Verify service was NOT called for the manual update
      // (article open tracking already happened, this should not trigger another update)
      expect(mockReadingProgressService.updateProgress).not.toHaveBeenCalled();
    });

    test('should NOT update progress when user is not authenticated', async () => {
      // Mock no user
      mockUseAuth.useAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      // Query will be disabled without user, so no loading
      // Verify isLoading is false immediately (query disabled)
      expect(result.current.isLoading).toBeFalsy();

      // Attempt update without auth
      await act(async () => {
        result.current.updateProgress(8);
      });

      // Verify service was NOT called (no auth)
      expect(mockReadingProgressService.updateProgress).not.toHaveBeenCalled();
    });
  });

  describe('Progress Data', () => {
    test('should return reading progress from bulk query', async () => {
      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      // Wait for query to load and progress to be available
      await waitFor(
        () => {
          expect(result.current.isLoading).toBeFalsy();
          expect(result.current.progress).not.toBeNull();
        },
        { timeout: 3000 },
      );

      // Verify progress data is correctly extracted from bulk query
      // Note: The hook transforms snake_case to camelCase
      // Progress calculation: (lastSentenceRead + 1) / totalSentences = (5 + 1) / 10 = 60%
      expect(result.current.progress).toEqual({
        articleId: testArticleId,
        lastSentenceRead: 5,
        totalSentences: 10,
        progressPercentage: 60,
        updatedAt: '2024-01-01T12:00:00Z',
      });
    });

    test('should handle missing progress gracefully', async () => {
      // Mock empty progress map
      mockReadingProgressService.getBulkProgress.mockResolvedValue(
        new Map<ArticleId, ReadingProgress>(),
      );

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should return null when no progress exists
      expect(result.current.progress).toBeNull();
    });

    test('does not regress stored progress when unmounted before scrolling forward', async () => {
      const { result, unmount } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            isActive: true,
          }),
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.lastSentenceRead).toBe(5);
        expect(result.current.hadExistingProgressOnMount).toBe(true);
      });
      mockReadingProgressService.updateProgress.mockClear();

      unmount();

      expect(mockReadingProgressService.updateProgress).not.toHaveBeenCalled();
    });
  });
});
