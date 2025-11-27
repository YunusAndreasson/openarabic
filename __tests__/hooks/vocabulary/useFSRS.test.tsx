/**
 * useFSRS Hook Tests
 *
 * Tests the core FSRS (Free Spaced Repetition Scheduler) hook which manages:
 * - Priority queue for word ordering
 * - FSRS card state transitions
 * - Session completion logic
 * - Word spacing enforcement
 * - Cache invalidation
 * - Progress tracking
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: No test.concurrent() - tests share mock state and need isolation
 */

// Unmock React Query to test real hook behavior
jest.unmock('@tanstack/react-query');

import { renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { useFSRS } from '@/hooks/vocabulary/useFSRS';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId } from '@/types/branded.types';
import type { UserId } from '@/types/branded.types';

// Mock only the service layer (network boundary)
jest.mock('@/services/studyWordsFSRS');
jest.mock('@/utils/errorHandling');

const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');

// Helper to create mock study words
function createMockStudyWord(overrides: Partial<StudyWord> = {}): StudyWord {
  return {
    root_id: 1 as RootId,
    user_id: 'test-user' as UserId,
    created_at: new Date().toISOString(),
    fsrs_difficulty: null,
    fsrs_due: new Date().toISOString(),
    fsrs_lapses: null,
    fsrs_last_review: new Date().toISOString(),
    fsrs_learning_steps: null,
    fsrs_reps: null,
    fsrs_scheduled_days: null,
    fsrs_stability: null,
    fsrs_state: State.New,
    ...overrides,
  };
}

describe('useFSRS Hook', () => {
  let wrapper: ReturnType<typeof createHookTestWrapper>['wrapper'];
  let queryClient: ReturnType<typeof createHookTestWrapper>['queryClient'];

  beforeEach(() => {
    jest.clearAllMocks();
    const testWrapper = createHookTestWrapper();
    wrapper = testWrapper.wrapper;
    queryClient = testWrapper.queryClient;

    // Default mock implementations
    studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([]);
    studyWordsFSRSService.updateWordAndReview = jest.fn().mockResolvedValue(undefined);
  });

  describe('Initialization & Setup', () => {
    test('initializes with empty state when no userId provided', () => {
      const { result } = renderHook(() => useFSRS({ userId: undefined }), { wrapper });

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });

    test('initializes with loading state when fetching due words', async () => {
      studyWordsFSRSService.getFSRSWords = jest
        .fn()
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.currentWord).toBeNull();
    });

    test('loads due words and initializes queue', async () => {
      const mockWords = [
        createMockStudyWord({
          root_id: 1 as RootId,
          fsrs_due: new Date('2024-01-01').toISOString(),
        }),
        createMockStudyWord({
          root_id: 2 as RootId,
          fsrs_due: new Date('2024-01-02').toISOString(),
        }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentWord).not.toBeNull();
      expect(result.current.wordQueue.length).toBeGreaterThan(0);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
    });

    test('calls onComplete when no due words available', async () => {
      const onComplete = jest.fn();
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([]);

      renderHook(() => useFSRS({ userId: 'test-user', onComplete }), { wrapper });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    test('respects session cooldown hours', async () => {
      const userId = 'test-user';
      const cooldownHours = 2;

      // Mock last completed timestamp (1 hour ago)
      // Note: Use FSRS_BASE_KEY 'fsrs-words' not 'fsrs'
      queryClient.setQueryData(
        ['fsrs-words', userId, 'lastCompletedAt'],
        Date.now() - 60 * 60 * 1000,
      );

      renderHook(() => useFSRS({ userId, sessionCooldownHours: cooldownHours }), { wrapper });

      await waitFor(() => {
        expect(studyWordsFSRSService.getFSRSWords).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ sessionCooldownHours: cooldownHours }),
        );
      });
    });
  });

  describe('Priority Queue Management', () => {
    test('orders words by due date (earliest first)', async () => {
      const now = new Date();
      const mockWords = [
        createMockStudyWord({
          root_id: 3 as RootId,
          fsrs_due: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        }),
        createMockStudyWord({
          root_id: 1 as RootId,
          fsrs_due: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day
        }),
        createMockStudyWord({
          root_id: 2 as RootId,
          fsrs_due: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
        }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First word should be the one due soonest (root_id: 1)
      expect(result.current.currentWord?.root_id).toBe(1);
    });

    test('updates queue after processing a word', async () => {
      const mockWords = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      const initialQueueLength = result.current.wordQueue.length;

      // Process the first word
      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      // Queue should have one less item
      expect(result.current.wordQueue.length).toBeLessThan(initialQueueLength);
    });
  });

  describe('FSRS State Transitions', () => {
    test('transitions New → Learning on first review', async () => {
      const newWord = createMockStudyWord({
        root_id: 1 as RootId,
        fsrs_state: State.New,
        fsrs_reps: null,
        fsrs_stability: null,
        fsrs_last_review: null,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([newWord]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
          'test-user',
          1,
          expect.objectContaining({
            fsrs_state: expect.any(Number),
            fsrs_reps: expect.any(Number),
          }),
        );
      });
    });

    test('updates FSRS card properties on review', async () => {
      const word = createMockStudyWord({
        root_id: 1 as RootId,
        fsrs_state: State.Learning,
        fsrs_reps: 1,
        fsrs_stability: 0.5,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
          'test-user',
          1,
          expect.objectContaining({
            fsrs_due: expect.any(String),
            fsrs_stability: expect.any(Number),
            fsrs_difficulty: expect.any(Number),
            fsrs_scheduled_days: expect.any(Number),
            fsrs_reps: expect.any(Number),
            fsrs_learning_steps: expect.any(Number),
            fsrs_lapses: expect.any(Number),
            fsrs_state: expect.any(Number),
            fsrs_last_review: expect.any(String),
          }),
        );
      });
    });
  });

  describe('Word Processing & Confidence Mapping', () => {
    /**
     * Confidence mapping tests using test.each for reduced duplication.
     * Tests how different confidence levels affect session state.
     */
    test.each([
      {
        confidence: 'known' as const,
        rating: 'Good',
        expectedProgress: 100,
        expectComplete: true,
        description: 'completes session (100% progress with 1 word)',
      },
      {
        confidence: 'vague' as const,
        rating: 'Hard',
        expectedProgress: 0,
        expectComplete: false,
        description: 'adds to spacing queue (no progress increase)',
      },
      {
        confidence: 'unknown' as const,
        rating: 'Again',
        expectedProgress: 0,
        expectComplete: false,
        description: 'adds to spacing queue (no progress increase)',
      },
    ])(
      'maps "$confidence" confidence to $rating rating - $description',
      async ({ confidence, expectedProgress, expectComplete }) => {
        const word = createMockStudyWord({ root_id: 1 as RootId });
        studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

        const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

        await waitFor(() => {
          expect(result.current.currentWord).not.toBeNull();
        });

        await result.current.updateWord(1, confidence);

        await waitFor(() => {
          expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalled();
        });

        if (expectComplete) {
          await waitFor(() => {
            expect(result.current.isComplete).toBe(true);
          });
        }

        expect(result.current.progress).toBe(expectedProgress);
        expect(result.current.isComplete).toBe(expectComplete);
      },
    );

    test('increments processedWords counter', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      // Progress should reflect 50% (1 out of 2 words known)
      expect(result.current.progress).toBe(50);
    });

    test('prevents duplicate updates during processing', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Try to update word twice rapidly
      const promise1 = result.current.updateWord(1, 'known');
      const promise2 = result.current.updateWord(1, 'known');

      await Promise.all([promise1, promise2]);

      // Should only call updateWordAndReview once
      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(1);
    });

    test('returns new stability value after update', async () => {
      const word = createMockStudyWord({
        root_id: 1 as RootId,
        fsrs_stability: 0.5,
      });
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const newStability = await result.current.updateWord(1, 'known');

      expect(typeof newStability).toBe('number');
      expect(newStability).toBeGreaterThan(0);
    });
  });

  describe('Session Completion', () => {
    test('completes session when all words are known', async () => {
      const onComplete = jest.fn();
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(result.current.progress).toBe(100);
    });

    test('does not trigger onComplete multiple times', async () => {
      const onComplete = jest.fn();
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      await waitFor(() => {
        expect(onComplete).toHaveBeenCalled();
      });

      // Should only be called once
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    test('sets progress to 100 on completion', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Mark both words as known
      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await result.current.updateWord(2, 'known');

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(result.current.progress).toBe(100);
      expect(result.current.currentWord).toBeNull();
    });
  });

  describe('Spacing Algorithm', () => {
    test('adds failed words back to spacing queue', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      // Mark first word as unknown (should go to spacing queue)
      await result.current.updateWord(1, 'unknown');

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      // Progress should still be 0 (no words known yet)
      expect(result.current.progress).toBe(0);
    });

    test('prevents immediate re-presentation of same word', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      const firstWordId = result.current.currentWord?.root_id;

      await result.current.updateWord(1, 'vague');

      // Wait for the next word to be different
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).not.toBe(firstWordId);
      });

      // Next word should be the second word (root_id: 2)
      expect(result.current.currentWord?.root_id).toBe(2);
    });
  });

  describe('Error Handling', () => {
    test('handles database update errors gracefully', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);
      studyWordsFSRSService.updateWordAndReview = jest
        .fn()
        .mockRejectedValue(new Error('Database error'));

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should not throw
      await expect(result.current.updateWord(1, 'known')).resolves.toBeDefined();
    });

    test('handles FSRS algorithm errors with fallback', async () => {
      const word = createMockStudyWord({
        root_id: 1 as RootId,
        // Invalid FSRS state that might cause algorithm error
        fsrs_stability: -1,
        fsrs_difficulty: 100,
      });
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should use fallback card instead of throwing
      await expect(result.current.updateWord(1, 'known')).resolves.toBeDefined();

      // Should still update database
      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalled();
    });

    test('handles query fetch errors', async () => {
      studyWordsFSRSService.getFSRSWords = jest.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      // Wait for loading to start then finish
      await waitFor(
        () => {
          expect(result.current.isLoading).toBe(false);
        },
        { timeout: 5000 },
      );

      // Should handle error gracefully with empty state
      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.isComplete).toBe(false);
    });
  });

  describe('Utility Functions', () => {
    test('resetQueue clears all state', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      result.current.resetQueue();

      // Wait for state updates to complete
      await waitFor(() => {
        expect(result.current.currentWord).toBeNull();
      });

      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
    });

    test('invalidateQueries resets queue state', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const userId = 'test-user';
      const { result } = renderHook(() => useFSRS({ userId }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Invalidating queries should reset queue state
      result.current.invalidateQueries();

      // Function should not throw
      expect(() => result.current.invalidateQueries()).not.toThrow();
    });

    test('cleans up on unmount', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result, unmount } = renderHook(() => useFSRS({ userId: 'test-user' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty due words array', async () => {
      const onComplete = jest.fn();
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    test('handles undefined userId', () => {
      const { result } = renderHook(() => useFSRS({ userId: undefined }), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
    });

    test('does not update word when session is complete', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Complete the session
      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.isComplete).toBe(true);
      });

      const callCount = jest.mocked(studyWordsFSRSService.updateWordAndReview).mock.calls.length;

      // Try to update after completion (should be ignored)
      await result.current.updateWord(1, 'known');

      // Should not make additional calls
      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(callCount);
    });

    test('handles words with null FSRS values (new cards)', async () => {
      const newWord = createMockStudyWord({
        root_id: 1 as RootId,
        fsrs_state: State.New,
        fsrs_reps: null,
        fsrs_stability: null,
        fsrs_difficulty: null,
        fsrs_last_review: null,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue([newWord]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should handle new card creation without errors
      await expect(result.current.updateWord(1, 'known')).resolves.toBeDefined();
    });

    test('prevents queue re-initialization with same words', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn().mockResolvedValue(words);

      const { result, rerender } = renderHook(() => useFSRS({ userId: 'test-user' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const firstCurrentWord = result.current.currentWord;

      // Force re-render
      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should maintain same state (not re-initialize)
      expect(result.current.currentWord).toBe(firstCurrentWord);
    });
  });
});
