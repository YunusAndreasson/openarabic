/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

// Unmock React Query to test real hook behavior
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { readingProgressQueries } from '@/constants/queries';
import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { readingProgressService } from '@/services/readingProgress';
import type { ReadingProgress } from '@/services/readingProgress';

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
  const testUserId = 'test-user-123';
  const testArticleId = 42;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Setup auth mock to return test user
    mockUseAuth.useAuth = jest.fn(() => ({
      user: { id: testUserId },
      isLoading: false,
    }));

    // Default mock for bulk reading progress
    mockReadingProgressService.getBulkProgress.mockResolvedValue(
      new Map<number, ReadingProgress>([
        [
          testArticleId,
          {
            user_id: testUserId,
            article_id: testArticleId,
            last_sentence_read: 5,
            total_sentences: 10,
            progress_percentage: 50,
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

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const { QueryClientProvider } = require('@tanstack/react-query');
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  describe('Query Configuration', () => {
    test('should have refetchOnMount set to false for optimization', async () => {
      // Mock getProgress for article open tracking
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
            isActive: true,
          }),
        { wrapper },
      );

      // Wait for query to settle
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Get the query from the cache to inspect its configuration
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: readingProgressQueries.keys.bulk(testUserId) });

      expect(queries).toHaveLength(1);
      const query = queries[0];

      // Verify refetchOnMount is false (optimization to prevent unnecessary refetches)
      expect(query.options.refetchOnMount).toBe(false);
    });

    test('should have refetchOnReconnect set to false', async () => {
      // Mock getProgress for article open tracking
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
            isActive: true,
          }),
        { wrapper },
      );

      // Wait for query to settle
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Get the query from the cache to inspect its configuration
      const queries = queryClient
        .getQueryCache()
        .findAll({ queryKey: readingProgressQueries.keys.bulk(testUserId) });

      expect(queries).toHaveLength(1);
      const query = queries[0];

      // Verify refetchOnReconnect is false (only refresh via pull-to-refresh)
      expect(query.options.refetchOnReconnect).toBe(false);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate reading progress queries on successful mutation', async () => {
      // Mock successful update (updateProgress returns void)
      mockReadingProgressService.updateProgress.mockResolvedValue(undefined);

      // Mock getProgress for article open tracking
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });

      // Spy on queryClient.invalidateQueries
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
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

      // Verify cache invalidation happened with correct query keys
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: readingProgressQueries.keys.bulk(testUserId),
      });

      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: readingProgressQueries.keys.streak(testUserId),
      });

      // Should have been called exactly twice (once for bulk, once for streak)
      expect(invalidateQueriesSpy).toHaveBeenCalledTimes(2);

      invalidateQueriesSpy.mockRestore();
    });

    test('should NOT invalidate cache on mutation error', async () => {
      // Mock failed update
      const error = new Error('Network error');
      mockReadingProgressService.updateProgress.mockRejectedValue(error);

      // Mock getProgress for article open tracking
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });

      // Spy on queryClient.invalidateQueries
      const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
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
    test('should successfully update reading progress when active', async () => {
      // Mock successful update (updateProgress returns void)
      mockReadingProgressService.updateProgress.mockResolvedValue(undefined);

      // Mock getProgress for article open tracking
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
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

      // Verify service was called with correct params
      expect(mockReadingProgressService.updateProgress).toHaveBeenCalledWith({
        userId: testUserId,
        articleId: testArticleId,
        lastSentenceRead: 8,
        totalSentences: 10,
      });
    });

    test('should NOT update progress when inactive via updateProgress callback', async () => {
      // Mock getProgress for article open tracking (returns existing progress)
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
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
            currentSentenceIndex: 0,
            isActive: true,
          }),
        { wrapper },
      );

      // Query will be disabled without user, so no loading
      // Verify isLoading is false immediately (query disabled)
      expect(result.current.isLoading).toBe(false);

      // Attempt update without auth
      await act(async () => {
        result.current.updateProgress(8);
      });

      // Verify service was NOT called (no auth)
      expect(mockReadingProgressService.updateProgress).not.toHaveBeenCalled();
      expect(mockReadingProgressService.getProgress).not.toHaveBeenCalled();
    });
  });

  describe('Progress Data', () => {
    test('should return reading progress from bulk query', async () => {
      // Mock getProgress for article open tracking
      mockReadingProgressService.getProgress.mockResolvedValue({
        user_id: testUserId,
        article_id: testArticleId,
        last_sentence_read: 5,
        total_sentences: 10,
        progress_percentage: 50,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
            isActive: true,
          }),
        { wrapper },
      );

      // Wait for query to load and progress to be available
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
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
        new Map<number, ReadingProgress>(),
      );

      // Mock getProgress returning null for article open tracking
      mockReadingProgressService.getProgress.mockResolvedValue(null);

      const { result } = renderHook(
        () =>
          useReadingProgress({
            articleId: testArticleId,
            totalSentences: 10,
            currentSentenceIndex: 0,
            isActive: true,
          }),
        { wrapper },
      );

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should return null when no progress exists
      expect(result.current.progress).toBeNull();
    });
  });
});
