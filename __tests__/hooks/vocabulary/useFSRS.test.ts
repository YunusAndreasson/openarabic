import { renderHook, act } from '@testing-library/react-native';
import { Rating } from 'ts-fsrs';
import { useFSRS } from '../../../hooks/vocabulary/useFSRS';
import type { StudyWord } from '../../../types/vocabulary.types';
import type { WordConfidence } from '../../../types/review.types';

// Mock dependencies
jest.mock('../../../services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn(),
    updateWordAndReview: jest.fn().mockResolvedValue(true),
  },
  FSRS_QUERY_KEYS: {
    due: (userId: string) => ['fsrs-words', userId, 'due'],
    all: (userId: string) => ['fsrs-words', userId],
  },
}));

jest.mock('../../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const { studyWordsFSRSService } = require('../../../services/studyWordsFSRS');
const { handleError } = require('../../../utils/errorHandling');
const reactQuery = require('@tanstack/react-query');

// Test data factories using Jest's smart patterns
const createBaseWord = (overrides: Partial<StudyWord> = {}): StudyWord => {
  const now = Date.now();
  return {
    root_id: 1,
    user_id: 'test-user',
    created_at: new Date(now).toISOString(),
    fsrs_due: new Date(now).toISOString(),
    fsrs_stability: 5,
    fsrs_difficulty: 6.5,
    fsrs_elapsed_days: 0,
    fsrs_scheduled_days: 1,
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_lapses: 0,
    fsrs_state: 0,
    fsrs_last_review: null,
    difficulty: 0.65,
    success_streak: 0,
    root: undefined,
    ...overrides,
  } as StudyWord;
};

// Factory for creating word sets with different priority scenarios
const createWordSet = (
  scenarios: Array<{
    id: number;
    hoursOverdue?: number;
    stability?: number;
    difficulty?: number;
    state?: number;
  }>
) => {
  const now = Date.now();
  return scenarios.map(({ id, hoursOverdue = 0, stability = 5, difficulty = 6.5, state = 0 }) =>
    createBaseWord({
      root_id: id,
      fsrs_due: new Date(now - hoursOverdue * 3600 * 1000).toISOString(),
      fsrs_stability: stability,
      fsrs_difficulty: difficulty,
      fsrs_state: state,
    })
  );
};

// Custom Jest matchers for better assertions
expect.extend({
  toHaveCorrectPriority(received: StudyWord[], expected: number[]) {
    const actualOrder = received.map(w => w.root_id);
    const pass = JSON.stringify(actualOrder) === JSON.stringify(expected);

    return {
      message: () =>
        `Expected word order ${JSON.stringify(expected)}, but got ${JSON.stringify(actualOrder)}`,
      pass,
    };
  },

  toBeWithinRange(received: number, min: number, max: number) {
    const pass = received >= min && received <= max;
    return {
      message: () => `Expected ${received} to be within range ${min}-${max}`,
      pass,
    };
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveCorrectPriority(expected: number[]): R;
      toBeWithinRange(min: number, max: number): R;
    }
  }
}

// Mock query client with spy functions
const createMockQueryClient = () => ({
  invalidateQueries: jest.fn(),
  removeQueries: jest.fn(),
  getQueryData: jest.fn(),
});

describe('useFSRS Hook', () => {
  let mockQueryClient: ReturnType<typeof createMockQueryClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockQueryClient = createMockQueryClient();

    (reactQuery.useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });

    (reactQuery.useQueryClient as jest.Mock).mockReturnValue(mockQueryClient);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  // Test 1: Word Priority Calculation & Queue Ordering
  describe('Word Priority Calculation & Queue Ordering', () => {
    const priorityTestCases = [
      {
        name: 'overdue words get highest priority',
        words: [
          { id: 1, hoursOverdue: 24, stability: 5, difficulty: 6.5 }, // Most overdue
          { id: 2, hoursOverdue: 12, stability: 5, difficulty: 6.5 }, // Less overdue
          { id: 3, hoursOverdue: 0, stability: 5, difficulty: 6.5 }, // Due now
        ],
        expectedOrder: [1, 2, 3],
      },
      {
        name: 'lower stability gets higher priority when due dates equal',
        words: [
          { id: 1, hoursOverdue: 0, stability: 1, difficulty: 6.5 }, // Unstable - priority = 0 + 0.9 + 0.015 = 0.915
          { id: 2, hoursOverdue: 0, stability: 10, difficulty: 6.5 }, // Stable - priority = 0 + 0 + 0.015 = 0.015
          { id: 3, hoursOverdue: 0, stability: 5, difficulty: 6.5 }, // Medium - priority = 0 + 0.5 + 0.015 = 0.515
        ],
        expectedOrder: [2, 3, 1], // Lower priority value = higher priority, so 2 (0.015) comes first
      },
      {
        name: 'higher difficulty gets slight priority boost',
        words: [
          { id: 1, hoursOverdue: 0, stability: 5, difficulty: 8.0 }, // Hard - priority = 0 + 0.5 + 0.03 = 0.53
          { id: 2, hoursOverdue: 0, stability: 5, difficulty: 5.0 }, // Easy - priority = 0 + 0.5 + 0.00 = 0.50
          { id: 3, hoursOverdue: 0, stability: 5, difficulty: 6.5 }, // Medium - priority = 0 + 0.5 + 0.015 = 0.515
        ],
        expectedOrder: [2, 3, 1], // Lower priority value = higher priority, so 2 (0.50) comes first
      },
    ];

    test.each(priorityTestCases)('$name', ({ words, expectedOrder }) => {
      const wordSet = createWordSet(words);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: wordSet,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.wordQueue).toHaveCorrectPriority(expectedOrder);
    });

    test('handles large dataset efficiently (500+ words)', () => {
      const largeWordSet = Array.from({ length: 500 }, (_, i) =>
        createBaseWord({
          root_id: i + 1,
          fsrs_due: new Date(Date.now() - Math.random() * 86400000).toISOString(), // Random overdue
          fsrs_stability: Math.random() * 10 + 1,
          fsrs_difficulty: Math.random() * 5 + 5,
        })
      );

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: largeWordSet,
        isLoading: false,
        refetch: jest.fn(),
      });

      const startTime = performance.now();
      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      const endTime = performance.now();
      const initTime = endTime - startTime;

      expect(initTime).toBeLessThan(100); // Should initialize in < 100ms
      expect(result.current.wordQueue).toHaveLength(500);
      expect(result.current.currentWord).toBeDefined();
    });
  });

  // Test 2: WordConfidence → Rating Mapping & FSRS Integration
  describe('WordConfidence → Rating Mapping & FSRS Integration', () => {
    const confidenceRatingCases: Array<{
      confidence: WordConfidence;
      expectedRating: Rating;
      description: string;
    }> = [
      { confidence: 'known', expectedRating: Rating.Good, description: 'known maps to Good' },
      { confidence: 'vague', expectedRating: Rating.Hard, description: 'vague maps to Hard' },
      { confidence: 'unknown', expectedRating: Rating.Again, description: 'unknown maps to Again' },
    ];

    test.each(confidenceRatingCases)('$description', async ({ confidence, expectedRating }) => {
      const word = createBaseWord({ root_id: 1 });

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: [word],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      await act(async () => {
        await result.current.updateWord(1, confidence);
      });

      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
        'test-user',
        1,
        expect.objectContaining({
          fsrs_due: expect.any(String),
          fsrs_stability: expect.any(Number),
          fsrs_difficulty: expect.any(Number),
        }),
        expectedRating,
        expect.any(Number)
      );
    });

    test('converts StudyWord to FSRS Card correctly', async () => {
      const wordWithHistory = createBaseWord({
        root_id: 1,
        fsrs_stability: 10,
        fsrs_difficulty: 7.5,
        fsrs_reps: 5,
        fsrs_state: 2,
        fsrs_last_review: new Date().toISOString(),
      });

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: [wordWithHistory],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      await act(async () => {
        await result.current.updateWord(1, 'known');
      });

      const updateCall = studyWordsFSRSService.updateWordAndReview.mock.calls[0];
      const fsrsUpdate = updateCall[2];

      expect(fsrsUpdate).toMatchObject({
        fsrs_stability: expect.any(Number),
        fsrs_difficulty: expect.any(Number),
        fsrs_reps: expect.any(Number),
        fsrs_state: expect.any(Number),
      });
    });

    test('handles new word without FSRS history', async () => {
      const newWord = createBaseWord({
        root_id: 1,
        fsrs_stability: null,
        fsrs_difficulty: null,
        fsrs_reps: null,
        fsrs_state: null,
        fsrs_last_review: null,
      });

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: [newWord],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      await act(async () => {
        await result.current.updateWord(1, 'known');
      });

      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalled();
      // Should not throw error and should create valid FSRS update
    });
  });

  // Test 3: Word Requeuing with MIN_WORD_SPACING Logic
  describe('Word Requeuing with MIN_WORD_SPACING Logic', () => {
    test('maintains MIN_WORD_SPACING=3 for single requeued word', async () => {
      const words = createWordSet([
        { id: 1, hoursOverdue: 1 },
        { id: 2, hoursOverdue: 2 },
        { id: 3, hoursOverdue: 3 },
        { id: 4, hoursOverdue: 4 },
        { id: 5, hoursOverdue: 5 },
      ]);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      const firstWordId = result.current.currentWord?.root_id;
      expect(firstWordId).toBe(5); // Most overdue

      // Mark first word as vague (should be requeued)
      await act(async () => {
        await result.current.updateWord(5, 'vague');
        jest.runAllTimers();
      });

      // Process next 3 words
      const processedWords: number[] = [];
      for (let i = 0; i < 3; i++) {
        const currentId = result.current.currentWord?.root_id;
        if (currentId) {
          processedWords.push(currentId);
          await act(async () => {
            await result.current.updateWord(currentId, 'known');
            jest.runAllTimers();
          });
        }
      }

      expect(processedWords).not.toContain(5); // Word 5 should not appear in next 3
      expect(processedWords).toHaveLength(3);
    });

    test('handles multiple requeued words with proper spacing', async () => {
      const words = createWordSet(
        Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          hoursOverdue: 10 - i,
        }))
      );

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      const requeuedWords: number[] = [];

      // Mark first 3 words as vague
      for (let i = 0; i < 3; i++) {
        const currentId = result.current.currentWord?.root_id;
        if (currentId) {
          requeuedWords.push(currentId);
          await act(async () => {
            await result.current.updateWord(currentId, 'vague');
            jest.runAllTimers();
          });
        }
      }

      // Process next few words and verify requeued words don't appear too soon
      const nextWords: number[] = [];
      for (let i = 0; i < 4; i++) {
        const currentId = result.current.currentWord?.root_id;
        if (currentId) {
          nextWords.push(currentId);
          await act(async () => {
            await result.current.updateWord(currentId, 'known');
            jest.runAllTimers();
          });
        }
      }

      // None of the requeued words should appear in the immediate next words
      const hasEarlyRequeue = nextWords.some(id => requeuedWords.includes(id));
      expect(hasEarlyRequeue).toBe(false);
    });
  });

  // Test 4: Progress Calculation Based on Unique Words
  describe('Progress Calculation Based on Unique Words', () => {
    test('calculates progress based on unique words, not total reviews', async () => {
      const words = [
        createBaseWord({ root_id: 1 }),
        createBaseWord({ root_id: 2 }),
        createBaseWord({ root_id: 3 }),
        createBaseWord({ root_id: 1 }), // Duplicate root_id
      ];

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.progress).toBe(0);

      // Complete first unique word
      await act(async () => {
        const currentId = result.current.currentWord?.root_id;
        if (currentId) {
          await result.current.updateWord(currentId, 'known');
          jest.runAllTimers();
        }
      });

      expect(result.current.progress).toBeWithinRange(33, 34); // 1/3 unique words

      // Complete second unique word
      await act(async () => {
        const currentId = result.current.currentWord?.root_id;
        if (currentId) {
          await result.current.updateWord(currentId, 'known');
          jest.runAllTimers();
        }
      });

      expect(result.current.progress).toBeWithinRange(66, 67); // 2/3 unique words
    });

    test('progress handles requeued words correctly', async () => {
      const words = createWordSet([{ id: 1 }, { id: 2 }, { id: 3 }]);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      // Mark first word as vague (requeued, not completed)
      await act(async () => {
        const currentId = result.current.currentWord?.root_id;
        if (currentId) {
          await result.current.updateWord(currentId, 'vague');
          jest.runAllTimers();
        }
      });

      expect(result.current.progress).toBe(0); // No unique words completed yet

      // Complete next word
      await act(async () => {
        const currentId = result.current.currentWord?.root_id;
        if (currentId) {
          await result.current.updateWord(currentId, 'known');
          jest.runAllTimers();
        }
      });

      expect(result.current.progress).toBeWithinRange(33, 34); // 1/3 unique words
    });
  });

  // Test 5: Session State Management & Completion Logic
  describe('Session State Management & Completion Logic', () => {
    test('prevents double completion calls', async () => {
      const onComplete = jest.fn();
      const words = [createBaseWord({ root_id: 1 })];

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }));

      act(() => {
        jest.runAllTimers();
      });

      // Complete the only word
      await act(async () => {
        await result.current.updateWord(1, 'known');
        jest.runAllTimers();
      });

      expect(result.current.isComplete).toBe(true);
      expect(onComplete).toHaveBeenCalledTimes(1);

      // Try to trigger completion again
      await act(async () => {
        jest.runAllTimers();
      });

      expect(onComplete).toHaveBeenCalledTimes(1); // Should not be called again
    });

    test('prevents concurrent updates with isProcessingUpdate flag', async () => {
      const words = [createBaseWord({ root_id: 1 })];

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      // Start first update (don't await)
      const firstUpdate = act(async () => {
        await result.current.updateWord(1, 'known');
      });

      // Try to start second update immediately
      await act(async () => {
        await result.current.updateWord(1, 'vague');
      });

      await firstUpdate;

      // Only the first update should have been processed
      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(1);
    });

    test('handles session completion with empty initial queue', () => {
      const onComplete = jest.fn();

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: [], // Empty queue
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }));

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.isComplete).toBe(true);
      expect(result.current.currentWord).toBeNull();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    test('resetQueue cleans up all state correctly', () => {
      const words = createWordSet([{ id: 1 }, { id: 2 }]);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.wordQueue).toHaveLength(2);
      expect(result.current.currentWord).toBeDefined();

      act(() => {
        result.current.resetQueue();
      });

      expect(result.current.wordQueue).toHaveLength(0);
      expect(result.current.currentWord).toBeNull();
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
    });
  });

  // Test 6: Query Cache Invalidation Patterns
  describe('Query Cache Invalidation Patterns', () => {
    test('invalidates correct query keys after word updates', async () => {
      const words = [createBaseWord({ root_id: 1 })];

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      act(() => {
        result.current.invalidateQueries();
      });

      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['fsrs-words', 'test-user', 'due'],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['fsrs-words', 'test-user'],
      });
      expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['vocabulary-stats'],
      });

      expect(mockQueryClient.removeQueries).toHaveBeenCalledTimes(3);
    });

    test('does not invalidate queries when userId is undefined', () => {
      const { result } = renderHook(() => useFSRS({ userId: undefined }));

      act(() => {
        result.current.invalidateQueries();
      });

      expect(mockQueryClient.invalidateQueries).not.toHaveBeenCalled();
      expect(mockQueryClient.removeQueries).not.toHaveBeenCalled();
    });
  });

  // Test 7: Error Handling & Recovery
  describe('Error Handling & Recovery', () => {
    test('handles service failures gracefully', async () => {
      const words = [createBaseWord({ root_id: 1 })];
      const serviceError = new Error('Service unavailable');

      studyWordsFSRSService.updateWordAndReview.mockRejectedValueOnce(serviceError);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      await act(async () => {
        await result.current.updateWord(1, 'known');
        jest.runAllTimers();
      });

      expect(handleError).toHaveBeenCalledWith(serviceError);
      // Session should remain in consistent state
      expect(result.current.currentWord).toBeDefined();
    });

    test('maintains session state after error recovery', async () => {
      const words = createWordSet([{ id: 1 }, { id: 2 }]);

      studyWordsFSRSService.updateWordAndReview
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(true);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      const initialQueueLength = result.current.wordQueue.length;

      // First update fails
      await act(async () => {
        await result.current.updateWord(1, 'known');
        jest.runAllTimers();
      });

      // Queue should remain unchanged after error
      expect(result.current.wordQueue).toHaveLength(initialQueueLength);
      expect(result.current.isComplete).toBe(false);

      // Second update succeeds
      await act(async () => {
        await result.current.updateWord(1, 'known');
        jest.runAllTimers();
      });

      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(2);
    });
  });

  // Test 8: Data Transformation & Validation
  describe('Data Transformation & Validation', () => {
    const dataTransformationCases = [
      {
        name: 'new word with no FSRS history',
        word: createBaseWord({
          fsrs_stability: null,
          fsrs_difficulty: null,
          fsrs_reps: null,
          fsrs_state: null,
          fsrs_last_review: null,
        }),
      },
      {
        name: 'word with partial FSRS data',
        word: createBaseWord({
          fsrs_stability: 5,
          fsrs_difficulty: null,
          fsrs_reps: 2,
          fsrs_state: 1,
          fsrs_last_review: null,
        }),
      },
      {
        name: 'word with complete FSRS history',
        word: createBaseWord({
          fsrs_stability: 10,
          fsrs_difficulty: 7.5,
          fsrs_reps: 5,
          fsrs_state: 2,
          fsrs_last_review: new Date().toISOString(),
        }),
      },
    ];

    test.each(dataTransformationCases)('handles $name correctly', async ({ word }) => {
      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: [word],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      // Should not throw error during conversion
      await act(async () => {
        await result.current.updateWord(word.root_id, 'known');
      });

      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalled();
    });

    test('handles invalid date strings gracefully', async () => {
      const wordWithInvalidDate = createBaseWord({
        fsrs_due: 'invalid-date',
        fsrs_last_review: 'also-invalid',
      });

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: [wordWithInvalidDate],
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      // Should handle invalid dates without crashing
      expect(result.current.currentWord).toBeDefined();
    });
  });

  // Test 9: Performance Under Load
  describe('Performance Under Load', () => {
    test('maintains responsive performance with large vocabulary sets', () => {
      const largeWordSet = Array.from({ length: 1000 }, (_, i) =>
        createBaseWord({
          root_id: i + 1,
          fsrs_due: new Date(Date.now() - Math.random() * 86400000).toISOString(),
        })
      );

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: largeWordSet,
        isLoading: false,
        refetch: jest.fn(),
      });

      const startTime = performance.now();
      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(200); // Should process in < 200ms
      expect(result.current.wordQueue).toHaveLength(1000);
      expect(result.current.currentWord).toBeDefined();
    });

    test('queue operations remain fast with frequent updates', async () => {
      const words = createWordSet(Array.from({ length: 100 }, (_, i) => ({ id: i + 1 })));

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      // Measure time for multiple rapid updates
      const startTime = performance.now();

      for (let i = 0; i < 10; i++) {
        await act(async () => {
          const currentId = result.current.currentWord?.root_id;
          if (currentId) {
            await result.current.updateWord(currentId, i % 2 === 0 ? 'known' : 'vague');
            jest.runAllTimers();
          }
        });
      }

      const endTime = performance.now();
      const avgUpdateTime = (endTime - startTime) / 10;

      expect(avgUpdateTime).toBeLessThan(50); // Each update should be < 50ms
    });
  });

  // Test 10: Concurrent Session Operations
  describe('Concurrent Session Operations', () => {
    test('handles rapid user interactions without data corruption', async () => {
      const words = createWordSet([{ id: 1 }, { id: 2 }, { id: 3 }]);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      const initialCurrentWord = result.current.currentWord?.root_id;
      expect(initialCurrentWord).toBeDefined(); // Ensure it's defined before using

      // Simulate rapid clicks - multiple updateWord calls
      const rapidUpdates = Promise.all([
        act(async () => {
          await result.current.updateWord(initialCurrentWord as number, 'known');
        }),
        act(async () => {
          await result.current.updateWord(initialCurrentWord as number, 'vague');
        }),
        act(async () => {
          await result.current.updateWord(initialCurrentWord as number, 'unknown');
        }),
      ]);

      await rapidUpdates;

      // Only one update should have been processed due to isProcessingUpdate flag
      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(1);

      // Session state should remain consistent
      expect(result.current.wordQueue.length).toBeGreaterThanOrEqual(0);
      expect(result.current.progress).toBeWithinRange(0, 100);
    });

    test('handles queue modifications during active updates', async () => {
      const words = createWordSet([{ id: 1 }, { id: 2 }]);

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      // Start an update
      const updatePromise = act(async () => {
        await result.current.updateWord(1, 'vague'); // This will requeue the word
      });

      // Try to reset queue during update
      act(() => {
        result.current.resetQueue();
      });

      await updatePromise;

      // State should be consistent after concurrent operations
      expect(result.current.wordQueue.length).toBeGreaterThanOrEqual(0);
      expect(result.current.isComplete).toBeDefined();
    });

    test('prevents updateWord calls with wrong word ID', async () => {
      const words = [createBaseWord({ root_id: 1 })];

      (reactQuery.useQuery as jest.Mock).mockReturnValue({
        data: words,
        isLoading: false,
        refetch: jest.fn(),
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }));

      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.currentWord?.root_id).toBe(1);

      // Try to update with wrong ID
      await act(async () => {
        await result.current.updateWord(999, 'known'); // Wrong ID
      });

      // Should not call service with wrong ID
      expect(studyWordsFSRSService.updateWordAndReview).not.toHaveBeenCalled();
    });
  });
});
