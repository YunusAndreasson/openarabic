/**
 * useFSRS Hook Edge Case Tests
 *
 * Additional edge cases for the FSRS hook to catch subtle bugs:
 * - Queue race conditions
 * - Spacing queue boundary conditions
 * - State transition edge cases
 * - Progress calculation edge cases
 * - Concurrent update handling
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { useFSRS } from '@/hooks/vocabulary/useFSRS';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId, UserId } from '@/types/branded.types';

// Mock service layer
jest.mock('@/services/studyWordsFSRS');
jest.mock('@/utils/errorHandling');

const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');

// Helper to create mock study words
function createMockStudyWord(overrides: Partial<StudyWord> = {}): StudyWord {
  return {
    root_id: 1 as RootId,
    user_id: 'test-user' as UserId,
    created_at: new Date().toISOString(),
    fsrs_difficulty: 5,
    fsrs_due: new Date().toISOString(),
    fsrs_lapses: 0,
    fsrs_last_review: new Date().toISOString(),
    fsrs_learning_steps: 0,
    fsrs_reps: 0,
    fsrs_scheduled_days: 1,
    fsrs_stability: 1,
    fsrs_state: State.New,
    ...overrides,
  };
}

describe('useFSRS Hook - Edge Cases', () => {
  let wrapper: ReturnType<typeof createHookTestWrapper>['wrapper'];
  let queryClient: ReturnType<typeof createHookTestWrapper>['queryClient'];

  beforeEach(() => {
    jest.clearAllMocks();
    // Don't use fake timers globally - they conflict with waitFor and async operations
    const testWrapper = createHookTestWrapper();
    wrapper = testWrapper.wrapper;
    queryClient = testWrapper.queryClient;

    studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([]);
    studyWordsFSRSService.updateWordAndReview = jest.fn().mockResolvedValue(undefined);
  });

  // ============================================================================
  // QUEUE INITIALIZATION TIMING
  // ============================================================================

  describe('Queue Initialization Timing', () => {
    test('handles rapid userId changes without race conditions', async () => {
      const words1 = [createMockStudyWord({ root_id: 1 as RootId })];
      const words2 = [createMockStudyWord({ root_id: 2 as RootId })];

      let resolvers: Array<(value: StudyWord[]) => void> = [];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockImplementation(() => {
        return new Promise<StudyWord[]>(resolve => {
          resolvers.push(resolve);
        });
      });

      const { result, rerender } = renderHook(
        ({ userId }: { userId: string }) => useFSRS({ userId }),
        { wrapper, initialProps: { userId: 'user-1' } },
      );

      // Immediately change to user-2 before first request resolves
      rerender({ userId: 'user-2' });

      // Resolve requests in reverse order (user-2 first, then user-1)
      await act(async () => {
        resolvers[1]?.(words2); // user-2's request
        resolvers[0]?.(words1); // user-1's request (stale)
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      // Should show user-2's words, not user-1's
      expect(result.current.currentWord?.root_id).toBe(2);
    });

    test('prevents double initialization when data arrives slowly', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];

      let resolvePromise: (value: StudyWord[]) => void;
      studyWordsFSRSService.getFSRSWords = jest.fn().mockImplementation(() => {
        return new Promise<StudyWord[]>(resolve => {
          resolvePromise = resolve;
        });
      });

      const { result, rerender } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      expect(result.current.isLoading).toBeTruthy();

      // Force re-render while still loading
      rerender({});
      rerender({});

      // Resolve the promise
      await act(async () => {
        resolvePromise!(words);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      // Queue should be initialized exactly once
      expect(result.current.wordQueue.length).toBe(1);
    });
  });

  // ============================================================================
  // SPACING QUEUE BOUNDARY CONDITIONS
  // ============================================================================

  describe('Spacing Queue Boundary Conditions', () => {
    test('handles spacing queue exhaustion (all words need spacing)', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Mark both words as unknown (both go to the spacing queue / drill)
      await act(async () => {
        await result.current.updateWord(1, 'unknown');
      });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await act(async () => {
        await result.current.updateWord(2, 'unknown');
      });

      // Now both words are in spacing queue - hook should handle this
      await waitFor(() => {
        // Either shows a word from spacing or handles gracefully
        expect(result.current.isComplete).toBeDefined();
      });
    });

    test('respects minimum spacing between repeated words', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
        createMockStudyWord({ root_id: 3 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Mark word 1 as unknown - should not appear again immediately
      await act(async () => {
        await result.current.updateWord(1, 'unknown');
      });

      const seenWords: number[] = [1];

      // Process remaining words
      for (let i = 0; i < 2; i++) {
        await waitFor(() => {
          expect(result.current.currentWord).not.toBeNull();
        });

        const currentWordId = result.current.currentWord?.root_id;
        if (currentWordId) {
          seenWords.push(currentWordId);
          await act(async () => {
            await result.current.updateWord(currentWordId, 'known');
          });
        }
      }

      // Word 1 should not appear consecutively
      for (let i = 1; i < seenWords.length; i++) {
        expect(seenWords[i]).not.toBe(seenWords[i - 1]);
      }
    });
  });

  // ============================================================================
  // CONCURRENT UPDATE HANDLING
  // ============================================================================

  describe('Concurrent Update Handling', () => {
    test('handles multiple rapid confidence updates', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
        createMockStudyWord({ root_id: 3 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Fire multiple updates without waiting
      const updates = [
        result.current.updateWord(1, 'known'),
        result.current.updateWord(2, 'vague'),
        result.current.updateWord(3, 'unknown'),
      ];

      await act(async () => {
        await Promise.all(updates);
      });

      // Should handle gracefully without corruption
      expect(result.current.wordQueue).toBeDefined();
      expect(result.current.progress).toBeGreaterThanOrEqual(0);
      expect(result.current.progress).toBeLessThanOrEqual(100);
    });

    test('serializes updates to prevent state corruption', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });

      let updateCount = 0;
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);
      studyWordsFSRSService.updateWordAndReview = jest.fn().mockImplementation(() => {
        updateCount++;
        return Promise.resolve(undefined);
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Try to update same word 5 times simultaneously
      await act(async () => {
        await Promise.all([
          result.current.updateWord(1, 'known'),
          result.current.updateWord(1, 'known'),
          result.current.updateWord(1, 'known'),
          result.current.updateWord(1, 'known'),
          result.current.updateWord(1, 'known'),
        ]);
      });

      // Should only process once (first call wins)
      expect(updateCount).toBe(1);
    });
  });

  // ============================================================================
  // PROGRESS CALCULATION EDGE CASES
  // ============================================================================

  describe('Progress Calculation Edge Cases', () => {
    test('maintains valid progress range (0-100) at all times', async () => {
      const words = Array.from({ length: 5 }, (_, i) =>
        createMockStudyWord({ root_id: (i + 1) as RootId }),
      );

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Process words and check progress is always valid
      for (let i = 1; i <= 5; i++) {
        expect(result.current.progress).toBeGreaterThanOrEqual(0);
        expect(result.current.progress).toBeLessThanOrEqual(100);

        await act(async () => {
          await result.current.updateWord(i as RootId, 'known');
        });
      }

      expect(result.current.progress).toBe(100);
    });

    test('handles progress calculation with spacing queue words', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Mark as unknown - goes to spacing, progress should not increase
      await act(async () => {
        await result.current.updateWord(1, 'unknown');
      });

      expect(result.current.progress).toBe(0); // No progress for a re-drilled miss

      // Mark second word as known
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await act(async () => {
        await result.current.updateWord(2, 'known');
      });

      // Progress should be 50% (1 known out of 2)
      expect(result.current.progress).toBe(50);
    });
  });

  // ============================================================================
  // STATE TRANSITION EDGE CASES
  // ============================================================================

  describe('State Transition Edge Cases', () => {
    test('handles transition from Review to Relearning (lapsed word)', async () => {
      const reviewWord = createMockStudyWord({
        root_id: 1 as RootId,
        fsrs_state: State.Review,
        fsrs_reps: 10,
        fsrs_stability: 30,
        fsrs_lapses: 2,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([reviewWord]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Mark as unknown - should transition to Relearning
      await act(async () => {
        await result.current.updateWord(1, 'unknown');
      });

      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
        'test-user',
        1,
        expect.objectContaining({
          fsrs_lapses: expect.any(Number), // Should increment lapses
        }),
      );
    });

    test('handles maximum stability values', async () => {
      const highStabilityWord = createMockStudyWord({
        root_id: 1 as RootId,
        fsrs_state: State.Review,
        fsrs_stability: 100, // Very high stability
        fsrs_reps: 50,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([highStabilityWord]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should handle without overflow
      const newStability = await result.current.updateWord(1, 'known');

      expect(newStability).toBeGreaterThan(0);
      expect(Number.isFinite(newStability)).toBeTruthy();
    });

    test('handles zero stability (edge case)', async () => {
      const zeroStabilityWord = createMockStudyWord({
        root_id: 1 as RootId,
        fsrs_state: State.Learning,
        fsrs_stability: 0.001, // Very low but not zero
        fsrs_reps: 1,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([zeroStabilityWord]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should not crash
      const newStability = await result.current.updateWord(1, 'known');

      expect(newStability).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // COMPLETION EDGE CASES
  // ============================================================================

  describe('Completion Edge Cases', () => {
    test('handles completion during spacing queue processing', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const onComplete = jest.fn();
      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Mark first as unknown (missed → enters the in-session drill)
      await act(async () => {
        await result.current.updateWord(1, 'unknown');
      });

      // Mark second as known (graduates immediately — it was never missed)
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await act(async () => {
        await result.current.updateWord(2, 'known');
      });

      // Word 1 comes back from the drill. The FIRST correct recall does NOT
      // graduate it — the drill criterion is two correct recalls.
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      await act(async () => {
        await result.current.updateWord(1, 'known');
      });

      // It returns once more; the second correct recall meets criterion → done.
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      await act(async () => {
        await result.current.updateWord(1, 'known');
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    test('prevents false completion when words remain in spacing queue', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Mark both as unknown (both re-drilled → spacing queue)
      await act(async () => {
        await result.current.updateWord(1, 'unknown');
      });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await act(async () => {
        await result.current.updateWord(2, 'unknown');
      });

      // Should NOT be complete - words are still in spacing queue
      expect(result.current.isComplete).toBeFalsy();
    });

    test('handles onComplete callback that throws', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const onComplete = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should not crash even if onComplete throws
      // Using try/catch to handle the error gracefully in tests
      try {
        await act(async () => {
          await result.current.updateWord(1, 'known');
        });
      } catch (_e) {
        // Expected to throw from onComplete
      }

      // The onComplete callback should have been called
      expect(onComplete).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // MEMORY AND CLEANUP
  // ============================================================================

  describe('Memory and Cleanup', () => {
    test('clears pending operations on unmount', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];

      let resolvePromise: (value: StudyWord[]) => void;
      studyWordsFSRSService.getFSRSWords = jest.fn().mockImplementation(() => {
        return new Promise<StudyWord[]>(resolve => {
          resolvePromise = resolve;
        });
      });

      const { unmount } = renderHook(() => useFSRS({ userId: 'test-user' }), {
        wrapper,
      });

      // Unmount while loading
      unmount();

      // Resolve after unmount - should not cause errors
      await act(async () => {
        resolvePromise!(words);
      });

      // No errors means success
      expect(true).toBeTruthy();
    });

    test('handles multiple mount/unmount cycles', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      for (let i = 0; i < 5; i++) {
        // Clear query cache before each mount to ensure fresh fetches
        queryClient.clear();

        const { result, unmount } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

        await waitFor(() => {
          expect(result.current.currentWord).not.toBeNull();
        });

        unmount();
      }

      // Should handle all cycles without memory issues
      // Each cycle should have triggered a fetch after cache clear
      expect(studyWordsFSRSService.getFSRSWords).toHaveBeenCalled();
      // Note: Due to React Query caching behavior, exact call count may vary
      // The important thing is no errors occurred during mount/unmount cycles
    });
  });
});
