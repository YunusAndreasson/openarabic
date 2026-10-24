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

import { useEffect, useRef } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { State } from 'ts-fsrs';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import {
  DEFAULT_SESSION_COOLDOWN_HOURS,
  DRILL_LAG_AFTER_CORRECT,
  DRILL_LAG_AFTER_MISS,
} from '@/constants/fsrs';
import { fsrsQueries } from '@/constants/queries';
import { useFSRS } from '@/hooks/vocabulary/useFSRS';
import { FSRS_INSTANCE } from '@/utils/fsrsUtils';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId, UserId } from '@/types/branded.types';
import { LEGACY_NULL_TIMESTAMP } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId, userId } from '@/__tests__/helpers/ids';

// Mock only the service layer (network boundary)
jest.mock('@/services/studyWordsFSRS');
jest.mock('@/utils/errorHandling');

const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');

// Helper to create mock study words
function createMockStudyWord(overrides: Partial<StudyWord> = {}): StudyWord {
  return {
    root_id: rootId(1),
    user_id: userId('test-user'),
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
    studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => []);
    studyWordsFSRSService.updateWordAndReview = jest.fn(async (..._args: unknown[]) => undefined);
  });

  describe('Initialization & Setup', () => {
    test('initializes with empty state when no userId provided', () => {
      const { result } = renderHook(() => useFSRS({ userId: undefined }), { wrapper });

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(result.current.enrichmentBatches).toEqual([]);
      expect(result.current.isEmpty).toBeFalsy();
      expect(result.current.isComplete).toBeFalsy();
      expect(result.current.isLoading).toBeFalsy();
    });

    test('initializes with loading state when fetching due words', async () => {
      studyWordsFSRSService.getFSRSWords = jest
        .fn()
        .mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      expect(result.current.isLoading).toBeTruthy();
      expect(result.current.currentWord).toBeNull();
    });

    test('loads due words and initializes queue', async () => {
      const mockWords = [
        createMockStudyWord({
          root_id: rootId(1),
          fsrs_due: new Date('2024-01-01').toISOString(),
        }),
        createMockStudyWord({
          root_id: rootId(2),
          fsrs_due: new Date('2024-01-02').toISOString(),
        }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(result.current.currentWord).not.toBeNull();
      expect(result.current.wordQueue.length).toBeGreaterThan(0);
      expect(result.current.enrichmentBatches).toHaveLength(1);
      expect(result.current.enrichmentBatches[0]).toHaveLength(2);
      expect(result.current.enrichmentBatches[0]).toContainEqual(result.current.currentWord);
      expect(result.current.sessionWords).toEqual(mockWords);
      expect(result.current.progress).toBe(0);
      expect(result.current.isEmpty).toBeFalsy();
      expect(result.current.isComplete).toBeFalsy();
    });

    test('marks an empty due query without completing the session', async () => {
      const onComplete = jest.fn();
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => []);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isEmpty).toBeTruthy();
      });

      expect(result.current.isComplete).toBeFalsy();
      expect(result.current.enrichmentBatches).toEqual([]);
      expect(onComplete).not.toHaveBeenCalled();
    });

    test('holds a large backlog as a working set without completing', async () => {
      const mockWords = Array.from({ length: 30 }, (_, i) =>
        createMockStudyWord({
          root_id: (i + 1) as RootId,
          fsrs_due: new Date(Date.now() - (i + 1) * 3600 * 1000).toISOString(),
        }),
      );
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      // The heap holds only the top-priority chunk (REVIEW_SESSION_CHUNK_SIZE=20)
      expect(result.current.wordQueue).toHaveLength(20);
      expect(result.current.isComplete).toBeFalsy();
    });

    test('a backlog that fits one chunk is served whole', async () => {
      const mockWords = Array.from({ length: 5 }, (_, i) =>
        createMockStudyWord({ root_id: (i + 1) as RootId }),
      );
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(result.current.wordQueue).toHaveLength(5);
      expect(result.current.isComplete).toBeFalsy();
    });

    // The behaviour the chunking rework exists for: a backlog bigger than one
    // chunk must be served in full, in one session, with no completion in the
    // middle of it. Before, this session ended after 20 words and offered
    // "Review 10 more".
    test('refills from the backlog and only completes once every word is done', async () => {
      const total = 30;
      const mockWords = Array.from({ length: total }, (_, i) =>
        createMockStudyWord({
          root_id: (i + 1) as RootId,
          fsrs_due: new Date(Date.now() - (i + 1) * 3600 * 1000).toISOString(),
        }),
      );
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => mockWords);
      studyWordsFSRSService.updateWordAndReview = jest.fn(async (..._args: unknown[]) => undefined);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const graded = new Set<number>();
      // Bounded well above `total` so a stuck session fails as a timeout rather
      // than hanging: 'known' graduates a word on the first pass, so the drill
      // never re-asks and the loop is expected to take exactly `total` steps.
      for (let i = 0; i < total * 3; i += 1) {
        const word = result.current.currentWord;
        if (!word) break;

        // The session must never declare itself complete while it still has a
        // card up — that is exactly the false "Session complete" being fixed.
        expect(result.current.isComplete).toBeFalsy();
        expect(result.current.progress).toBeLessThan(100);

        graded.add(word.root_id);
        await act(async () => {
          await result.current.updateWord(word.root_id, 'known');
        });
      }

      expect(graded.size).toBe(total);
      expect(result.current.enrichmentBatches).toHaveLength(2);
      expect(result.current.enrichmentBatches[0]).toHaveLength(20);
      expect(result.current.enrichmentBatches[1]).toHaveLength(10);
      // The whole due set, fixed at the start — not the 20-word working chunk,
      // and not shrinking as cards are graded.
      expect(result.current.sessionWords).toHaveLength(total);
      expect(result.current.isComplete).toBeTruthy();
      expect(result.current.progress).toBe(100);
    });

    test('keeps progress below full across a backlog and repeated wrong-answer retries', async () => {
      const words = Array.from({ length: 21 }, (_, i) =>
        createMockStudyWord({ root_id: rootId(i + 1) }),
      );
      studyWordsFSRSService.getFSRSWords = jest.fn(async () => words);
      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });
      await waitFor(() => expect(result.current.currentWord).not.toBeNull());

      // Leave one word to drill after the first 20 have graduated.
      for (let i = 0; i < 20; i += 1) {
        const word = result.current.currentWord!;
        await act(async () => {
          await result.current.updateWord(word.root_id, 'known');
        });
        expect(result.current.progress).toBeLessThan(100);
      }
      expect(result.current.isComplete).toBe(false);
      const lastWord = result.current.currentWord!;
      const beforeMiss = result.current.progress;
      for (const confidence of ['unknown', 'known', 'unknown', 'known'] as const) {
        await act(async () => {
          await result.current.updateWord(lastWord.root_id, confidence);
        });
        expect(result.current.currentWord?.root_id).toBe(lastWord.root_id);
        expect(result.current.isComplete).toBe(false);
        expect(result.current.progress).toBe(beforeMiss);
      }
      await act(async () => {
        await result.current.updateWord(lastWord.root_id, 'known');
      });
      expect(result.current.currentWord).toBeNull();
      expect(result.current.isComplete).toBe(true);
      expect(result.current.progress).toBe(100);
    });

    test('a completed session is not restarted by a post-completion refetch', async () => {
      // After the last grade, the completion-screen mount invalidates FSRS
      // queries and the due query refetches. Words that fell due DURING the
      // session come back in that refetch, and they must NOT re-initialize the
      // queue underneath the completion screen — the session covers what was
      // due when it started; the next one picks these up.
      const initialWord = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [initialWord]);
      studyWordsFSRSService.updateWordAndReview = jest.fn(async (..._args: unknown[]) => undefined);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Grade the only word — session completes
      await act(async () => {
        await result.current.updateWord(1 as RootId, 'known');
      });
      expect(result.current.isComplete).toBeTruthy();

      // Simulate the post-completion refetch delivering a remaining backlog
      const backlog = Array.from({ length: 8 }, (_, i) =>
        createMockStudyWord({ root_id: (i + 10) as RootId }),
      );
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => backlog);
      await act(async () => {
        // The hook subscribes under the cooldown-keyed due entry (the key now
        // encodes the queryFn inputs), so target that exact key.
        await queryClient.refetchQueries({
          queryKey: fsrsQueries.due('test-user', DEFAULT_SESSION_COOLDOWN_HOURS).queryKey,
        });
      });

      // Still complete, and still showing no card — the refetch is inert here.
      expect(result.current.isComplete).toBeTruthy();
      expect(result.current.currentWord).toBeNull();
    });

    test('resetQueue re-arms initialization even when due data has not changed', async () => {
      // React Query's structural sharing can hand back a dueWords array with an
      // unchanged identity, so without the session-epoch dep the init effect
      // would never re-run and a reset queue would stay empty.
      const mockWords = Array.from({ length: 30 }, (_, i) =>
        createMockStudyWord({
          root_id: (i + 1) as RootId,
          fsrs_due: new Date(Date.now() - (i + 1) * 3600 * 1000).toISOString(),
        }),
      );
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.wordQueue).toHaveLength(20);
      });

      await act(async () => {
        result.current.resetQueue();
      });

      // Same dueWords identity, but the queue must be rebuilt (not stay empty)
      await waitFor(() => {
        expect(result.current.wordQueue).toHaveLength(20);
      });
      expect(result.current.currentWord).not.toBeNull();
      expect(result.current.isComplete).toBeFalsy();
    });

    test('respects session cooldown hours', async () => {
      const userId = 'test-user';
      const cooldownHours = 2;

      // Mock last completed timestamp (1 hour ago)
      queryClient.setQueryData(fsrsQueries.lastCompletedAtKey(userId), Date.now() - 60 * 60 * 1000);

      renderHook(() => useFSRS({ userId, sessionCooldownHours: cooldownHours }), { wrapper });

      await waitFor(() => {
        expect(studyWordsFSRSService.getFSRSWords).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ sessionCooldownHours: cooldownHours }),
          expect.objectContaining({ managed: true }),
        );
      });
    });
  });

  describe('Priority Queue Management', () => {
    test('orders learning-step words by due date (earliest first)', async () => {
      const now = new Date();
      const mockWords = [
        createMockStudyWord({
          root_id: rootId(3),
          fsrs_due: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
          fsrs_state: 1,
        }),
        createMockStudyWord({
          root_id: rootId(1),
          fsrs_due: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day
          fsrs_state: 1,
        }),
        createMockStudyWord({
          root_id: rootId(2),
          fsrs_due: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days
          fsrs_state: 1,
        }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => mockWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      // First word should be the one due soonest (root_id: 1)
      expect(result.current.currentWord?.root_id).toBe(1);
    });

    test('updates queue after processing a word', async () => {
      const mockWords = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => mockWords);

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
        root_id: rootId(1),
        fsrs_state: State.New,
        fsrs_reps: null,
        fsrs_stability: null,
        fsrs_last_review: LEGACY_NULL_TIMESTAMP,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [newWord]);

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
          expect.objectContaining({ managed: true }),
        );
      });
    });

    test('updates FSRS card properties on review', async () => {
      const word = createMockStudyWord({
        root_id: rootId(1),
        fsrs_state: State.Learning,
        fsrs_reps: 1,
        fsrs_stability: 0.5,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await result.current.updateWord(1, 'known');

      // A first "Good" grade on a Learning-state card with 2 configured learning
      // steps (['1m', '10m']) advances one step rather than graduating to Review —
      // pinned to the deterministic ts-fsrs output for this exact input so a
      // scheduler regression (e.g. reps not incrementing, state stuck/skipped)
      // fails the test instead of passing any `Number`/`String`.
      await waitFor(() => {
        expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
          'test-user',
          1,
          expect.objectContaining({
            fsrs_due: expect.any(String),
            fsrs_stability: expect.closeTo(0.54987621, 6),
            fsrs_difficulty: expect.closeTo(6.48872837, 6),
            fsrs_scheduled_days: 0,
            fsrs_reps: 2,
            fsrs_learning_steps: 1,
            fsrs_lapses: 0,
            fsrs_state: State.Learning,
            fsrs_last_review: expect.any(String),
          }),
          expect.objectContaining({ managed: true }),
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
        // Deterministic ts-fsrs output for a fresh (State.New) card graded Good
        // under this app's OPTIMIZED_FSRS_CONFIG — see the probe used to derive
        // it in the "updates FSRS card properties on review" test above.
        expectedStability: 2.3065,
        expectedProgress: 100,
        expectComplete: true,
        description: 'completes session (100% progress with 1 word)',
      },
      {
        confidence: 'vague' as const,
        rating: 'Hard',
        expectedStability: 1.2931,
        expectedProgress: 100,
        expectComplete: true,
        description: 'completes session (Hard is a pass — no in-session re-drill)',
      },
      {
        confidence: 'unknown' as const,
        rating: 'Again',
        expectedStability: 0.212,
        expectedProgress: 0,
        expectComplete: false,
        description: 'adds to spacing queue (no progress increase)',
      },
    ])(
      'maps "$confidence" confidence to $rating rating - $description',
      async ({ confidence, expectedStability, expectedProgress, expectComplete }) => {
        const word = createMockStudyWord({ root_id: 1 as RootId });
        studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

        const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

        await waitFor(() => {
          expect(result.current.currentWord).not.toBeNull();
        });

        await result.current.updateWord(1, confidence);

        await waitFor(() => {
          expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalled();
        });

        // The point of this table is "confidence X maps to FSRS rating Y" — a
        // bare toHaveBeenCalled() would pass even if every confidence graded
        // the same rating. Good/Hard/Again each produce a distinct resulting
        // stability from a fresh card, so pinning it catches a broken mapping.
        expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
          'test-user',
          1,
          expect.objectContaining({ fsrs_stability: expect.closeTo(expectedStability, 3) }),
          expect.objectContaining({ managed: true }),
        );

        if (expectComplete) {
          await waitFor(() => {
            expect(result.current.isComplete).toBeTruthy();
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
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

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
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

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
        root_id: rootId(1),
        fsrs_stability: 0.5,
      });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const update = await result.current.updateWord(1, 'known');

      expect(update.status).toBe('committed');
      if (update.status === 'committed') expect(update.stability).toBeGreaterThan(0);
    });
  });

  describe('Session Completion', () => {
    test('completes session when all words are known', async () => {
      const onComplete = jest.fn();
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(result.current.progress).toBe(100);
    });

    test('does not trigger onComplete multiple times', async () => {
      const onComplete = jest.fn();
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
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
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

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
        expect(result.current.isComplete).toBeTruthy();
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
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

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
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

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

  describe('previewIntervals', () => {
    test('returns a non-empty interval label for each grade', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const labels = result.current.previewIntervals(word);
      expect(labels).not.toBeNull();
      if (!labels) throw new Error('Expected interval labels');

      // Reuses the live ts-fsrs scheduler — every ternary grade gets a label.
      expect(typeof labels.unknown).toBe('string');
      expect(typeof labels.vague).toBe('string');
      expect(typeof labels.known).toBe('string');
      expect((labels.unknown ?? '').length).toBeGreaterThan(0);
      expect((labels.vague ?? '').length).toBeGreaterThan(0);
      expect((labels.known ?? '').length).toBeGreaterThan(0);
    });

    test('returns null instead of crashing for invalid scheduler data', () => {
      const word = createMockStudyWord({ root_id: rootId(1) });
      jest.spyOn(FSRS_INSTANCE, 'repeat').mockImplementationOnce(() => {
        throw new Error('Invalid scheduler card');
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      expect(result.current.previewIntervals(word)).toBeNull();
    });
  });

  describe('Error Handling', () => {
    test('handles database update errors gracefully', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);
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

    test('rejects scheduler errors atomically and releases the update lock', async () => {
      const word = createMockStudyWord({ root_id: rootId(1) });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);
      jest.spyOn(FSRS_INSTANCE, 'next').mockImplementationOnce(() => {
        throw new Error('Invalid scheduler card');
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const rejected = await result.current.updateWord(1, 'known');
      expect(rejected).toEqual({ status: 'rejected', reason: 'scheduler-error' });
      expect(result.current.currentWord?.root_id).toBe(1);
      expect(result.current.progress).toBe(0);
      expect(studyWordsFSRSService.updateWordAndReview).not.toHaveBeenCalled();

      const retry = await result.current.updateWord(1, 'known');
      expect(retry.status).toBe('committed');
      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(1);
    });

    test('handles query fetch errors', async () => {
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => {
        throw new Error('Network error');
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      // Wait for loading to start then finish
      await waitFor(
        () => {
          expect(result.current.isLoading).toBeFalsy();
        },
        { timeout: 5000 },
      );

      // Should handle error gracefully with empty state
      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.isComplete).toBeFalsy();
    });
  });

  describe('Utility Functions', () => {
    test('resetQueue clears session state and restarts from current due data', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await act(async () => {
        result.current.resetQueue();
      });

      // resetQueue bumps the session epoch, so the init effect re-runs against
      // the cached due data and a fresh session starts (the "Review N more"
      // restart path) — progress and completion are back to their initial state.
      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBeFalsy();
      expect(result.current.wordQueue).toHaveLength(1);
    });

    // Invalidation refreshes the cache and nothing else. It used to re-arm
    // the init effect as well, so the refetch that follows a close rebuilt a
    // session underneath the dismissing screen. Restarting is resetQueue's job.
    test('invalidateQueries leaves the running session alone', async () => {
      const getFSRSWords = jest.fn(async (..._args: unknown[]) => [
        createMockStudyWord({ root_id: 1 as RootId }),
      ]);
      studyWordsFSRSService.getFSRSWords = getFSRSWords;

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });
      const callsBefore = getFSRSWords.mock.calls.length;

      // The refetch comes back with a different due list entirely.
      getFSRSWords.mockImplementation(async () => [
        createMockStudyWord({ root_id: 7 as RootId }),
        createMockStudyWord({ root_id: 8 as RootId }),
      ]);
      act(() => {
        result.current.invalidateQueries();
      });

      await waitFor(() => {
        expect(getFSRSWords.mock.calls.length).toBeGreaterThan(callsBefore);
      });
      expect(result.current.currentWord?.root_id).toBe(1);
      expect(result.current.wordQueue.map(word => word.root_id)).toEqual([1]);
      expect(result.current.isEmpty).toBeFalsy();
    });

    test('cleans up on unmount', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

      const { result, unmount } = renderHook(() => useFSRS({ userId: 'test-user' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should not throw on unmount
      expect(() => unmount()).not.toThrow();
    });

    test('a grade committed from a later unmount cleanup is still written', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

      // Mirrors useReview: it calls useFSRS first and declares its own unmount
      // cleanup afterwards, so React runs that cleanup after useFSRS's — and
      // the cleanup commits a grade still waiting on the fade/restudy hold.
      let exitGrade: ReturnType<ReturnType<typeof useFSRS>['updateWord']> | undefined;
      const { result, unmount } = renderHook(
        () => {
          const fsrs = useFSRS({ userId: 'test-user' });
          const updateWordRef = useRef(fsrs.updateWord);
          useEffect(() => {
            updateWordRef.current = fsrs.updateWord;
          });
          useEffect(
            () => () => {
              exitGrade = updateWordRef.current(1 as RootId, 'unknown');
            },
            [],
          );
          return fsrs;
        },
        { wrapper },
      );

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      unmount();

      await expect(exitGrade).resolves.toMatchObject({ status: 'committed' });
      await waitFor(() => {
        expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledWith(
          'test-user',
          1,
          expect.any(Object),
          expect.objectContaining({ managed: true }),
        );
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles empty due words array', async () => {
      const onComplete = jest.fn();
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => []);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isEmpty).toBeTruthy());

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.isComplete).toBeFalsy();
      expect(onComplete).not.toHaveBeenCalled();
    });

    test('handles undefined userId', () => {
      const { result } = renderHook(() => useFSRS({ userId: undefined }), { wrapper });

      expect(result.current.isLoading).toBeFalsy();
      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
    });

    test('does not update word when session is complete', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Complete the session
      await result.current.updateWord(1, 'known');

      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
      });

      const callCount = jest.mocked(studyWordsFSRSService.updateWordAndReview).mock.calls.length;

      // Try to update after completion (should be ignored)
      await result.current.updateWord(1, 'known');

      // Should not make additional calls
      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalledTimes(callCount);
    });

    test('handles words with null FSRS values (new cards)', async () => {
      const newWord = createMockStudyWord({
        root_id: rootId(1),
        fsrs_state: State.New,
        fsrs_reps: null,
        fsrs_stability: null,
        fsrs_difficulty: null,
        fsrs_last_review: LEGACY_NULL_TIMESTAMP,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [newWord]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Should handle new card creation without errors
      await expect(result.current.updateWord(1, 'known')).resolves.toBeDefined();
    });

    test('prevents queue re-initialization with same words', async () => {
      const words = [createMockStudyWord({ root_id: 1 as RootId })];
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

      const { result, rerender } = renderHook(() => useFSRS({ userId: 'test-user' }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const firstCurrentWord = result.current.currentWord;

      // Force re-render
      rerender(undefined);

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      // Should maintain same state (not re-initialize)
      expect(result.current.currentWord).toBe(firstCurrentWord);
    });
  });

  describe('Boundary Conditions', () => {
    test('handles large dataset (100+ words)', async () => {
      const manyWords = Array.from({ length: 100 }, (_, i) =>
        createMockStudyWord({
          root_id: (i + 1) as RootId,
          fsrs_due: new Date(Date.now() - i * 1000).toISOString(),
        }),
      );

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => manyWords);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // The heap is a working set, not the session: it holds the top-priority
      // slice and refills from the backlog as it drains.
      expect(result.current.wordQueue.length).toBe(20);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBeFalsy();
    });

    test('handles words with identical due dates (ordering stability)', async () => {
      const sameTime = new Date('2024-01-01T12:00:00Z').toISOString();
      const wordsWithSameDue = [
        createMockStudyWord({ root_id: rootId(1), fsrs_due: sameTime }),
        createMockStudyWord({ root_id: rootId(2), fsrs_due: sameTime }),
        createMockStudyWord({ root_id: rootId(3), fsrs_due: sameTime }),
      ];

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => wordsWithSameDue);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // All words should be in queue regardless of same due date
      expect(result.current.wordQueue.length).toBe(3);
    });

    test('handles very old unpracticed words (past due by 1+ year)', async () => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const oldWord = createMockStudyWord({
        root_id: rootId(1),
        fsrs_due: oneYearAgo.toISOString(),
        fsrs_state: State.Review,
        fsrs_stability: 30,
        fsrs_reps: 5,
      });

      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [oldWord]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Old words should still be processed normally
      await expect(result.current.updateWord(1, 'known')).resolves.toBeDefined();
    });

    test('handles update for wrong root_id gracefully', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const rejected = await result.current.updateWord(999, 'known');

      expect(rejected).toEqual({ status: 'rejected', reason: 'mismatched-root' });
      expect(result.current.currentWord?.root_id).toBe(1);
      expect(result.current.progress).toBe(0);
      expect(studyWordsFSRSService.updateWordAndReview).not.toHaveBeenCalled();
    });

    test('handles service error during update gracefully', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);
      studyWordsFSRSService.updateWordAndReview = jest
        .fn()
        .mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Hook handles errors internally and still returns a value (FSRS calculation)
      const update = await result.current.updateWord(1, 'known');

      expect(update.status).toBe('committed');
      if (update.status === 'committed') expect(update.stability).toBeGreaterThan(0);
    });
  });

  describe('Persistence is off the critical path', () => {
    test('advances the card without waiting for the database write', async () => {
      const words = [
        createMockStudyWord({ root_id: 1 as RootId }),
        createMockStudyWord({ root_id: 2 as RootId }),
      ];
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => words);

      // A write that never settles — if updateWord awaited it, the grade would
      // hang here exactly as it used to hang on a slow network.
      studyWordsFSRSService.updateWordAndReview = jest
        .fn()
        .mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      const firstRootId = result.current.currentWord?.root_id;

      await act(async () => {
        // Resolves despite the pending write
        await result.current.updateWord(firstRootId as RootId, 'known');
      });

      expect(studyWordsFSRSService.updateWordAndReview).toHaveBeenCalled();
      // The next card is already live
      expect(result.current.currentWord?.root_id).not.toBe(firstRootId);
    });

    test('flushPendingWrites settles once in-flight writes finish', async () => {
      const word = createMockStudyWord({ root_id: 1 as RootId });
      studyWordsFSRSService.getFSRSWords = jest.fn(async (..._args: unknown[]) => [word]);

      let resolveWrite: (() => void) | undefined;
      studyWordsFSRSService.updateWordAndReview = jest.fn(
        () =>
          new Promise<void>(resolve => {
            resolveWrite = resolve;
          }),
      );

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await act(async () => {
        await result.current.updateWord(1 as RootId, 'known');
      });

      let flushed = false;
      const flushing = result.current.flushPendingWrites().then(() => {
        flushed = true;
      });

      // Still pending while the write is in flight — this ordering is what stops
      // a post-session refetch overtaking the last grade.
      await Promise.resolve();
      expect(flushed).toBe(false);

      await act(async () => {
        resolveWrite?.();
        await flushing;
      });

      expect(flushed).toBe(true);
    });
  });

  describe('Drill re-ask distance', () => {
    // Counts the cards shown between a grade and the same word coming back.
    async function interveningCardsAfter(
      result: { current: ReturnType<typeof useFSRS> },
      target: RootId,
      limit: number,
    ): Promise<number> {
      let intervening = 0;
      while (result.current.currentWord && result.current.currentWord.root_id !== target) {
        if (intervening > limit) throw new Error('re-ask never came back');
        const word = result.current.currentWord;
        intervening += 1;
        await act(async () => {
          await result.current.updateWord(word.root_id, 'known');
        });
      }
      return intervening;
    }

    test('a missed word returns after DRILL_LAG_AFTER_MISS cards, then DRILL_LAG_AFTER_CORRECT', async () => {
      const words = Array.from({ length: 20 }, (_, i) =>
        createMockStudyWord({ root_id: rootId(i + 1) }),
      );
      studyWordsFSRSService.getFSRSWords = jest.fn(async () => words);
      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });
      await waitFor(() => expect(result.current.currentWord).not.toBeNull());

      const missed = result.current.currentWord!.root_id;
      await act(async () => {
        await result.current.updateWord(missed, 'unknown');
      });
      expect(await interveningCardsAfter(result, missed, 19)).toBe(DRILL_LAG_AFTER_MISS);

      // First correct recall of a drilled word: re-asked once more, further out.
      await act(async () => {
        await result.current.updateWord(missed, 'known');
      });
      expect(await interveningCardsAfter(result, missed, 19)).toBe(DRILL_LAG_AFTER_CORRECT);
    });
  });
});
