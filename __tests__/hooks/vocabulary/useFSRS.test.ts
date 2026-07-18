/**
 * Hook Tests - useFSRS
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

// Mock dependencies BEFORE imports
const mockQueryClient = {
  getQueryData: jest.fn(),
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
};

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(() => mockQueryClient),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
  queryOptions: jest.fn(options => options),
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
    updateStudyWord: jest.fn(),
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('ts-fsrs', () => ({
  fsrs: jest.fn(() => ({
    next: jest.fn(() => ({
      card: {
        stability: 3.0,
        difficulty: 0.3,
        due: new Date(),
        last_review: new Date(),
        reps: 1,
        lapses: 0,
        state: 1,
        elapsed_days: 0,
        scheduled_days: 1,
      },
      log: {},
    })),
  })),
  generatorParameters: jest.fn(() => ({})),
  createEmptyCard: jest.fn(() => ({
    stability: 0,
    difficulty: 0,
    due: new Date(),
    last_review: null,
    reps: 0,
    lapses: 0,
    state: 0,
    elapsed_days: 0,
    scheduled_days: 0,
  })),
  Rating: {
    Again: 1,
    Hard: 2,
    Good: 3,
    Easy: 4,
  },
  State: {
    New: 0,
    Learning: 1,
    Review: 2,
    Relearning: 3,
  },
}));

import { useQuery } from '@tanstack/react-query';
import { useFSRS } from '@/hooks/vocabulary/useFSRS';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId, UserId } from '@/types/branded.types';

const mockUseQuery = jest.mocked(useQuery);
const mockStudyWordsFSRSService = jest.mocked(studyWordsFSRSService);

describe('useFSRS', () => {
  const createMockStudyWord = (rootId: number, overrides = {}): StudyWord => ({
    id: rootId,
    root_id: rootId as RootId,
    user_id: 'user-123' as UserId,
    root: {
      id: rootId as RootId,
      arabic_word: `word-${rootId}`,
      english_meaning: `meaning-${rootId}`,
    },
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
    fsrs_stability: 2.5,
    fsrs_difficulty: 0.3,
    fsrs_due: new Date().toISOString(),
    fsrs_last_review: new Date().toISOString(),
    fsrs_reps: 5,
    fsrs_lapses: 1,
    fsrs_state: 2,
    fsrs_elapsed_days: 3,
    fsrs_scheduled_days: 7,
    ...overrides,
  });

  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockQueryClient.getQueryData.mockReturnValue(undefined);

    // Default query mock - no due words
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
    } as never);

    mockStudyWordsFSRSService.updateStudyWord.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial state', () => {
    test('should return initial state when no user', () => {
      const { result } = renderHook(() =>
        useFSRS({
          userId: undefined,
          onComplete: mockOnComplete,
        }),
      );

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
      // With no user, queue is empty so isComplete is true
      expect(result.current.isComplete).toBeTruthy();
      expect(result.current.isLoading).toBeFalsy();
    });

    test('should return initial state with empty due words', () => {
      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
    });
  });

  describe('Word queue initialization', () => {
    test('should initialize queue with due words', async () => {
      const mockWords = [createMockStudyWord(1), createMockStudyWord(2), createMockStudyWord(3)];

      mockUseQuery.mockReturnValue({
        data: mockWords,
        isLoading: false,
        isFetching: false,
        error: null,
      } as never);

      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      await waitFor(() => {
        expect(result.current.wordQueue.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Return value structure', () => {
    test('should return all expected properties', () => {
      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      expect(result.current).toHaveProperty('currentWord');
      expect(result.current).toHaveProperty('wordQueue');
      expect(result.current).toHaveProperty('progress');
      expect(result.current).toHaveProperty('isComplete');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('updateWord');
      expect(result.current).toHaveProperty('resetQueue');
      expect(result.current).toHaveProperty('invalidateQueries');
    });

    test('should return updateWord as a function', () => {
      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      expect(typeof result.current.updateWord).toBe('function');
    });

    test('should return resetQueue as a function', () => {
      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      expect(typeof result.current.resetQueue).toBe('function');
    });
  });

  describe('Loading state', () => {
    test('should be loading when query is loading', () => {
      mockUseQuery.mockReturnValue({
        data: undefined,
        isLoading: true,
        isFetching: false,
        error: null,
      } as never);

      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      expect(result.current.isLoading).toBeTruthy();
    });

    test('should not be loading when query completes', () => {
      mockUseQuery.mockReturnValue({
        data: [],
        isLoading: false,
        isFetching: false,
        error: null,
      } as never);

      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      expect(result.current.isLoading).toBeFalsy();
    });
  });

  describe('Reset queue', () => {
    test('should reset state when resetQueue is called', async () => {
      const mockWords = [createMockStudyWord(1)];

      mockUseQuery.mockReturnValue({
        data: mockWords,
        isLoading: false,
        isFetching: false,
        error: null,
      } as never);

      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      // Wait for initialization
      await waitFor(() => {
        expect(result.current.wordQueue.length).toBeGreaterThanOrEqual(0);
      });

      // Reset the queue
      act(() => {
        result.current.resetQueue();
      });

      // resetQueue bumps the session epoch, so the init effect re-runs against
      // the current due data and a fresh session starts (the "Review N more"
      // restart path) — progress returns to 0 and the queue is rebuilt.
      await waitFor(() => {
        expect(result.current.wordQueue).toHaveLength(1);
      });
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBeFalsy();
    });
  });

  describe('Completion callback', () => {
    test('should provide onComplete callback option', () => {
      const customOnComplete = jest.fn();

      const { result } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: customOnComplete,
        }),
      );

      // The hook should accept the onComplete callback without errors
      expect(result.current).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', () => {
      const { unmount } = renderHook(() =>
        useFSRS({
          userId: 'user-123',
          onComplete: mockOnComplete,
        }),
      );

      // Should unmount without errors
      unmount();
    });
  });
});
