import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

// Mock the auth hook
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  }),
}));

// Mock the reading progress service
jest.mock('@/services/readingProgress', () => ({
  readingProgressService: {
    getProgress: jest.fn(),
    updateProgress: jest.fn(),
  },
}));

// Mock error handling
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

import { useReadingProgress } from '@/hooks/articles/useReadingProgress';
import { readingProgressService } from '@/services/readingProgress';

const mockGetProgress = readingProgressService.getProgress as jest.MockedFunction<
  typeof readingProgressService.getProgress
>;
const mockUpdateProgress = readingProgressService.updateProgress as jest.MockedFunction<
  typeof readingProgressService.updateProgress
>;

describe('useReadingProgress - Article Open Tracking', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    jest.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('should track article open immediately when component mounts', async () => {
    // Mock existing progress
    mockGetProgress.mockResolvedValue({
      user_id: 'test-user-id',
      article_id: 123,
      last_sentence_read: 2,
      total_sentences: 10,
      progress_percentage: 20,
      updated_at: '2025-01-01T10:00:00Z',
      created_at: '2025-01-01T09:00:00Z',
    });

    const { rerender } = renderHook(
      () =>
        useReadingProgress({
          articleId: 123,
          totalSentences: 10,
          currentSentenceIndex: 0,
          isActive: false, // Not yet active
        }),
      { wrapper }
    );

    // Wait for the immediate article open tracking to execute
    await waitFor(() => {
      expect(mockGetProgress).toHaveBeenCalledWith('test-user-id', 123);
      expect(mockUpdateProgress).toHaveBeenCalledWith({
        userId: 'test-user-id',
        articleId: 123,
        lastSentenceRead: 2, // Should use existing progress
        totalSentences: 10,
      });
    });
  });

  it('should create initial progress record when none exists', async () => {
    // Mock no existing progress
    mockGetProgress.mockResolvedValue(null);

    const { rerender } = renderHook(
      () =>
        useReadingProgress({
          articleId: 456,
          totalSentences: 15,
          currentSentenceIndex: 0,
          isActive: false,
        }),
      { wrapper }
    );

    // Wait for the article open tracking to create initial record
    await waitFor(() => {
      expect(mockGetProgress).toHaveBeenCalledWith('test-user-id', 456);
      expect(mockUpdateProgress).toHaveBeenCalledWith({
        userId: 'test-user-id',
        articleId: 456,
        lastSentenceRead: 0,
        totalSentences: 15,
      });
    });
  });

  it('should handle case when totalSentences is not yet available', async () => {
    // Mock no existing progress and totalSentences = 0 (not loaded yet)
    mockGetProgress.mockResolvedValue(null);

    const { rerender } = renderHook(
      () =>
        useReadingProgress({
          articleId: 789,
          totalSentences: 0, // Article not yet loaded
          currentSentenceIndex: 0,
          isActive: false,
        }),
      { wrapper }
    );

    // Should still create record with fallback value
    await waitFor(() => {
      expect(mockUpdateProgress).toHaveBeenCalledWith({
        userId: 'test-user-id',
        articleId: 789,
        lastSentenceRead: 0,
        totalSentences: 1, // Fallback value
      });
    });
  });

  it('should update progress when article becomes active with correct totalSentences', async () => {
    // Mock existing progress
    mockGetProgress.mockResolvedValue({
      user_id: 'test-user-id',
      article_id: 999,
      last_sentence_read: 0,
      total_sentences: 1, // Initially created with fallback
      progress_percentage: 0,
      updated_at: '2025-01-01T10:00:00Z',
      created_at: '2025-01-01T10:00:00Z',
    });

    const { rerender } = renderHook(
      () =>
        useReadingProgress({
          articleId: 999,
          totalSentences: 20, // Now article is loaded with actual count
          currentSentenceIndex: 0,
          isActive: true, // Article is now active
        }),
      { wrapper }
    );

    // Should update with correct totalSentences when active
    await waitFor(
      () => {
        expect(mockUpdateProgress).toHaveBeenCalledWith({
          userId: 'test-user-id',
          articleId: 999,
          lastSentenceRead: 0,
          totalSentences: 20, // Correct count
        });
      },
      { timeout: 1000 }
    );
  });

  it('should not track progress when user is not authenticated', () => {
    // Mock the auth hook to return no user
    jest.doMock('@/hooks/auth/useAuth', () => ({
      useAuth: () => ({ user: null }),
    }));

    const { rerender } = renderHook(
      () =>
        useReadingProgress({
          articleId: 123,
          totalSentences: 10,
          currentSentenceIndex: 0,
          isActive: false,
        }),
      { wrapper }
    );

    // Should not call any service methods
    expect(mockGetProgress).not.toHaveBeenCalled();
    expect(mockUpdateProgress).not.toHaveBeenCalled();
  });

  it('should not track progress when articleId is invalid', () => {
    const { rerender } = renderHook(
      () =>
        useReadingProgress({
          articleId: 0, // Invalid article ID
          totalSentences: 10,
          currentSentenceIndex: 0,
          isActive: false,
        }),
      { wrapper }
    );

    // Should not call any service methods
    expect(mockGetProgress).not.toHaveBeenCalled();
    expect(mockUpdateProgress).not.toHaveBeenCalled();
  });
});
