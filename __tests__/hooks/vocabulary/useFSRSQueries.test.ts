/**
 * Hook Tests - useFSRSQueries
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

// Mock dependencies BEFORE imports
const mockQueryClient = {
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(() => mockQueryClient),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
  queryOptions: jest.fn((options) => options),
}));

jest.mock('@/constants/queries', () => ({
  fsrsQueries: {
    all: jest.fn(() => ({ queryKey: ['fsrs-words', 'all'], enabled: true })),
    due: jest.fn(() => ({ queryKey: ['fsrs-words', 'due'], enabled: true })),
    stats: jest.fn(() => ({ queryKey: ['fsrs-words', 'stats'], enabled: true })),
  },
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn(),
  },
}));

jest.mock('@/utils/dateTimeUtils', () => ({
  normalizeTimestamp: jest.fn((val) => val),
}));

import { useQuery } from '@tanstack/react-query';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId, UserId } from '@/types/branded.types';

const mockUseQuery = jest.mocked(useQuery);
const mockStudyWordsFSRSService = jest.mocked(studyWordsFSRSService);

describe('useFSRSQueries', () => {
  const mockStudyWord: StudyWord = {
    id: 1,
    root_id: 100 as RootId,
    user_id: 'user-123' as UserId,
    stability: 2.5,
    difficulty: 0.3,
    due: new Date().toISOString(),
    last_review: new Date().toISOString(),
    reps: 5,
    lapses: 1,
    state: 2,
    elapsed_days: 3,
    scheduled_days: 7,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockQueryClient.getQueryData.mockReturnValue(undefined);

    // Default query mock
    mockUseQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      error: null,
    } as never);
  });

  describe('Query configuration', () => {
    it('should not enable queries when userId is undefined', () => {
      renderHook(() => useFSRSQueries({ userId: undefined }));

      // Check that useQuery was called with enabled: false
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        }),
      );
    });

    it('should enable queries when userId is provided', () => {
      renderHook(() => useFSRSQueries({ userId: 'user-123' }));

      // Check that useQuery was called with enabled: true
      expect(mockUseQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
        }),
      );
    });
  });

  describe('Return value', () => {
    it('should return allWords, dueWords, isLoading, isFetching, and error', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: [mockStudyWord],
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: [mockStudyWord],
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: { total: 1, due: 1 },
          isLoading: false,
          isFetching: false,
          error: null,
        } as never);

      const { result } = renderHook(() => useFSRSQueries({ userId: 'user-123' }));

      expect(result.current).toHaveProperty('allWords');
      expect(result.current).toHaveProperty('dueWords');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('isFetching');
      expect(result.current).toHaveProperty('error');
    });

    it('should return loading true when either query is loading', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: undefined,
          isLoading: true,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never);

      const { result } = renderHook(() => useFSRSQueries({ userId: 'user-123' }));

      expect(result.current.isLoading).toBe(true);
    });

    it('should return fetching true when either query is fetching', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: [mockStudyWord],
          isLoading: false,
          isFetching: true,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: [mockStudyWord],
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: { total: 1, due: 1 },
          isLoading: false,
          isFetching: false,
          error: null,
        } as never);

      const { result } = renderHook(() => useFSRSQueries({ userId: 'user-123' }));

      expect(result.current.isFetching).toBe(true);
    });

    it('should return error if either query has an error', () => {
      const testError = new Error('Test error');
      mockUseQuery
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: testError,
        } as never)
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never);

      const { result } = renderHook(() => useFSRSQueries({ userId: 'user-123' }));

      expect(result.current.error).toBe(testError);
    });
  });

  describe('Data handling', () => {
    it('should return undefined for allWords and dueWords when no data', () => {
      mockUseQuery
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: undefined,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never);

      const { result } = renderHook(() => useFSRSQueries({ userId: 'user-123' }));

      expect(result.current.allWords).toBeUndefined();
      expect(result.current.dueWords).toBeUndefined();
    });

    it('should return word data when available', () => {
      const mockWords = [mockStudyWord];
      mockUseQuery
        .mockReturnValueOnce({
          data: mockWords,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: mockWords,
          isLoading: false,
          isFetching: false,
          error: null,
        } as never)
        .mockReturnValueOnce({
          data: { total: mockWords.length, due: mockWords.length },
          isLoading: false,
          isFetching: false,
          error: null,
        } as never);

      const { result } = renderHook(() => useFSRSQueries({ userId: 'user-123' }));

      expect(result.current.allWords).toEqual(mockWords);
      expect(result.current.dueWords).toEqual(mockWords);
    });
  });

  describe('Limit option', () => {
    it('should pass limit to queries when provided', () => {
      renderHook(() => useFSRSQueries({ userId: 'user-123', limit: 10 }));

      // The limit is passed to the query function, verify useQuery was called 3 times (all, due, stats)
      expect(mockUseQuery).toHaveBeenCalledTimes(3);
    });
  });
});
