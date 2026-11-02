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
  useMutation: jest.fn(),
  useQueryClient: jest.fn((..._args: unknown[]) => mockQueryClient),
  QueryClient: jest.fn(),
  QueryClientProvider: ({ children }: { children: ReactNode }) => children,
  queryOptions: jest.fn(options => options),
  // Called at module scope by utils/mutationDefaults (the grade mutation's
  // shared options), so a plain function: resetMocks would empty a jest.fn.
  mutationOptions: (options: unknown) => options,
}));

// Plain functions (not jest.fn): resetMocks wipes jest.fn implementations
// before each test, which would make the factory return undefined mid-render.
jest.mock('@/constants/queries', () => ({
  // Spread the real module so `gated` stays the real gate — the factories
  // below are faked, but the skipToken guard under test must not be.
  ...jest.requireActual<Record<string, unknown>>('@/constants/queries'),
  fsrsQueries: {
    all: (userId: string) => ({
      queryKey: ['fsrs-words', userId],
      queryFn: () => Promise.resolve([]),
      enabled: true,
    }),
    due: (userId: string, sessionCooldownHours?: number, limit?: number) => ({
      queryKey: ['fsrs-words', userId, 'due', sessionCooldownHours ?? null, limit ?? null],
      queryFn: () => Promise.resolve([]),
      enabled: true,
    }),
    stats: (userId: string) => ({
      queryKey: ['fsrs-words', userId, 'stats'],
      queryFn: () => Promise.resolve([]),
      enabled: true,
    }),
    invalidateAll: () => Promise.resolve(),
  },
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn(),
    updateWordAndReview: jest.fn(),
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

// The scheduler boundary, not the library: this suite is about the session queue.
jest.mock('@/utils/fsrsScheduler', () => ({
  gradeWord: jest.fn((..._args: unknown[]) => ({
    fsrs_due: new Date().toISOString(),
    fsrs_stability: 3.0,
    fsrs_stability_fast: 1.0,
    fsrs_fast_reviewed_at: new Date().toISOString(),
    fsrs_difficulty: 3,
    fsrs_scheduled_days: 1,
    fsrs_reps: 1,
    fsrs_learning_steps: 0,
    fsrs_lapses: 0,
    fsrs_state: 1,
    fsrs_model: 'FSRS-7',
    fsrs_last_review: new Date().toISOString(),
  })),
  previewWordDueDates: jest.fn(() => ({})),
  wordHoldDays: jest.fn(() => 3),
  wordRetrievability: jest.fn(() => 0.9),
  wordDaysUntilRetrievability: jest.fn(() => 1),
}));

import { useMutation, useQuery } from '@tanstack/react-query';
import { useFSRS } from '@/hooks/vocabulary/useFSRS';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId, UserId } from '@/types/branded.types';
import { rootId, userId } from '@/__tests__/helpers/ids';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';

const mockUseQuery = jest.mocked(useQuery);
const mockUseMutation = jest.mocked(useMutation);
const mockStudyWordsFSRSService = jest.mocked(studyWordsFSRSService);

describe('useFSRS', () => {
  // The fixture used to carry a parallel set of un-prefixed FSRS fields
  // (`stability`, `due`, `reps`…) and a `roots` join with `arabic_word` /
  // `english_meaning` — none of which are real columns, so none of them reached
  // the hook.
  const createMockStudyWord = (id: number, overrides: Partial<StudyWord> = {}): StudyWord =>
    createTestWord({
      root_id: rootId(id),
      user_id: userId('user-123'),
      root: {
        id,
        letters: `word-${id}`,
        meaning: `meaning-${id}`,
        audio_url: '',
        audio_url_en: '',
      },
      fsrs_stability: 2.5,
      fsrs_difficulty: 0.3,
      fsrs_due: new Date().toISOString(),
      fsrs_last_review: new Date().toISOString(),
      fsrs_reps: 5,
      fsrs_lapses: 1,
      fsrs_state: 2,
      fsrs_scheduled_days: 7,
      created_at: new Date().toISOString(),
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

    mockUseMutation.mockReturnValue({
      mutateAsync: jest.fn((..._args: unknown[]) => Promise.resolve(true)),
    } as never);

    mockStudyWordsFSRSService.updateWordAndReview.mockResolvedValue(undefined);
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
      // No authenticated session is empty, not a successfully completed review.
      expect(result.current.isEmpty).toBe(true);
      expect(result.current.isComplete).toBe(false);
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
});
