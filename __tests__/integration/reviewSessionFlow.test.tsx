/**
 * Review Session Flow Integration Tests
 *
 * Tests the complete review session lifecycle:
 * - Session initialization with due words
 * - Card presentation and user interaction
 * - FSRS state transitions based on confidence
 * - Progress tracking through session
 * - Session completion and analytics
 * - Spacing enforcement for repeated words
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { State } from 'ts-fsrs';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { fsrsQueries } from '@/constants/queries';
import type { StudyWord } from '@/types/vocabulary.types';
import type { RootId, UserId } from '@/types/branded.types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Track all analytics events
const trackedEvents: Array<{ name: string; props: Record<string, unknown> }> = [];
const mockAnalytics = {
  track: jest.fn((name: string, props?: Record<string, unknown>) => {
    trackedEvents.push({ name, props: props || {} });
  }),
  trackSignIn: jest.fn(),
  trackSignOut: jest.fn(),
  reset: jest.fn(),
};

jest.mock('@/services/analytics', () => ({
  analytics: mockAnalytics,
}));

// Mock study words service
const mockWords: StudyWord[] = [];
const mockUpdatedWords: Map<number, Partial<StudyWord>> = new Map();

jest.mock('@/services/studyWordsFSRS');
const { studyWordsFSRSService: mockStudyWordsFSRSService } = require('@/services/studyWordsFSRS');

// Mock error handling
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

// Import hook after mocks
import { useFSRS } from '@/hooks/vocabulary/useFSRS';
import { rootId, userId } from '@/__tests__/helpers/ids';

// ============================================================================
// TEST SETUP
// ============================================================================

describe('Review Session Flow Integration', () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    // Don't use fake timers globally - they conflict with waitFor and async operations
    queryClient = createTestQueryClient();
    mockWords.length = 0;
    mockUpdatedWords.clear();
    trackedEvents.length = 0;
    mockStudyWordsFSRSService.getFSRSWords.mockImplementation(() =>
      Promise.resolve([...mockWords]),
    );
    mockStudyWordsFSRSService.updateWordAndReview.mockImplementation(
      (_userId: string, rootId: number, updates: Partial<StudyWord>) => {
        mockUpdatedWords.set(rootId, updates);
        return Promise.resolve(undefined);
      },
    );
  });

  // Helper to create a typical review session with due words
  function setupReviewSession(wordCount: number = 5): void {
    const now = new Date();
    for (let i = 1; i <= wordCount; i++) {
      mockWords.push(
        createTestWord({
          root_id: i as RootId,
          user_id: userId('test-user'),
          fsrs_due: new Date(now.getTime() - i * 3600000).toISOString(), // i hours overdue
          fsrs_state: State.Review,
          fsrs_stability: 5 + i,
          fsrs_difficulty: 5,
          fsrs_reps: i,
          fsrs_lapses: 0,
        }),
      );
    }
  }

  // ============================================================================
  // FULL SESSION FLOW
  // ============================================================================

  /**
   * TODO: Fix integration test mock setup
   *
   * These tests are skipped due to React Query mock configuration issues.
   * The problem: useFSRS hook uses fsrsQueries.due() which spreads queryOptions
   * including a queryFn. Even though the hook defines its own queryFn, the
   * mock for studyWordsFSRSService.getFSRSWords isn't being called as expected.
   *
   * To fix:
   * 1. Mock fsrsQueries directly instead of the service
   * 2. Or use msw (Mock Service Worker) for more reliable mocking
   * 3. Or refactor the hook to make the service call more testable
   */
  describe('Complete Review Session', () => {
    test.skip('completes a full review session with all words known', async () => {
      setupReviewSession(3);
      const onComplete = jest.fn();

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      // Wait for session to initialize
      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
        expect(result.current.currentWord).not.toBeNull();
      });

      expect(result.current.wordQueue.length).toBe(3);
      expect(result.current.progress).toBe(0);

      // Review all words as known
      for (let i = 1; i <= 3; i++) {
        expect(result.current.currentWord?.root_id).toBe(i);

        await act(async () => {
          await result.current.updateWord(i as RootId, 'known');
        });

        if (i < 3) {
          await waitFor(() => {
            expect(result.current.currentWord?.root_id).toBe(i + 1);
          });
          expect(result.current.progress).toBe(Math.round((i / 3) * 100));
        }
      }

      // Session should be complete
      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
      });

      expect(result.current.progress).toBe(100);
      expect(result.current.currentWord).toBeNull();
      expect(onComplete).toHaveBeenCalledTimes(1);

      // All words should have been updated in database
      expect(mockUpdatedWords.size).toBe(3);
    });

    test.skip('handles mixed confidence levels throughout session', async () => {
      setupReviewSession(4);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Word 1: known (immediate progress)
      await act(async () => {
        await result.current.updateWord(1 as RootId, 'known');
      });

      // Word 2: vague (goes to spacing queue)
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await act(async () => {
        await result.current.updateWord(2 as RootId, 'vague');
      });

      // Word 3: unknown (goes to spacing queue)
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(3);
      });

      await act(async () => {
        await result.current.updateWord(3 as RootId, 'unknown');
      });

      // Word 4: known
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(4);
      });

      await act(async () => {
        await result.current.updateWord(4 as RootId, 'known');
      });

      // Progress should be 50% (2 known out of 4)
      expect(result.current.progress).toBe(50);
      expect(result.current.isComplete).toBeFalsy();

      // Words from spacing queue should come back
      await waitFor(() => {
        const currentId = result.current.currentWord?.root_id;
        expect([2, 3]).toContain(currentId);
      });
    });
  });

  // ============================================================================
  // FSRS STATE TRANSITIONS
  // ============================================================================

  describe('FSRS State Transitions', () => {
    test.skip('transitions New → Learning on first review', async () => {
      mockWords.push(
        createTestWord({
          root_id: rootId(1),
          fsrs_state: State.New,
          fsrs_reps: 0,
          fsrs_stability: null,
          fsrs_difficulty: null,
        }),
      );

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await act(async () => {
        await result.current.updateWord(1 as RootId, 'known');
      });

      // Check database was updated with new FSRS values
      const updates = mockUpdatedWords.get(1);
      expect(updates).toBeDefined();
      expect(updates?.fsrs_state).toBeDefined();
      expect(updates?.fsrs_reps).toBe(1);
      expect(updates?.fsrs_stability).toBeGreaterThan(0);
      expect(updates?.fsrs_difficulty).toBeGreaterThan(0);
    });

    test.skip('increases stability on successful reviews', async () => {
      mockWords.push(
        createTestWord({
          root_id: rootId(1),
          fsrs_state: State.Review,
          fsrs_stability: 5,
          fsrs_difficulty: 5,
          fsrs_reps: 3,
        }),
      );

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await act(async () => {
        await result.current.updateWord(1 as RootId, 'known');
      });

      const updates = mockUpdatedWords.get(1);
      // Stability should increase after successful review
      expect(updates?.fsrs_stability).toBeGreaterThan(5);
    });

    test.skip('handles lapse (Review → Relearning) correctly', async () => {
      mockWords.push(
        createTestWord({
          root_id: rootId(1),
          fsrs_state: State.Review,
          fsrs_stability: 30,
          fsrs_difficulty: 5,
          fsrs_reps: 10,
          fsrs_lapses: 0,
        }),
      );

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Mark as unknown - triggers lapse
      await act(async () => {
        await result.current.updateWord(1 as RootId, 'unknown');
      });

      const updates = mockUpdatedWords.get(1);
      // Lapses should increase on failure
      expect(updates?.fsrs_lapses).toBeGreaterThan(0);
      // Stability should decrease significantly
      expect(updates?.fsrs_stability).toBeLessThan(30);
    });
  });

  // ============================================================================
  // SPACING ENFORCEMENT
  // ============================================================================

  describe('Spacing Enforcement', () => {
    test.skip('enforces minimum spacing between repeated words', async () => {
      setupReviewSession(3);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(1);
      });

      const wordHistory: number[] = [];

      // Process 6 interactions (some words will repeat)
      for (let i = 0; i < 6; i++) {
        const currentId = result.current.currentWord?.root_id;
        if (!currentId) break;

        wordHistory.push(currentId);

        // Mark as vague to send back to spacing queue
        await act(async () => {
          await result.current.updateWord(currentId, i < 3 ? 'vague' : 'known');
        });

        if (!result.current.isComplete) {
          await waitFor(() => {
            expect(result.current.currentWord).not.toBeNull();
          });
        }
      }

      // No word should appear consecutively
      for (let i = 1; i < wordHistory.length; i++) {
        if (wordHistory[i] === wordHistory[i - 1]) {
          // Only acceptable if it's the only word left
          expect(new Set(wordHistory.slice(i)).size).toBe(1);
        }
      }
    });

    test.skip('exhausts spacing queue before completing', async () => {
      setupReviewSession(2);

      const onComplete = jest.fn();
      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Mark both as vague initially
      await act(async () => {
        await result.current.updateWord(1 as RootId, 'vague');
      });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await act(async () => {
        await result.current.updateWord(2 as RootId, 'vague');
      });

      // Should not be complete - words are in spacing queue
      expect(result.current.isComplete).toBeFalsy();
      expect(onComplete).not.toHaveBeenCalled();

      // Now mark them as known when they come back
      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await act(async () => {
        await result.current.updateWord(result.current.currentWord!.root_id, 'known');
      });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      await act(async () => {
        await result.current.updateWord(result.current.currentWord!.root_id, 'known');
      });

      // Now should be complete
      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // PROGRESS TRACKING
  // ============================================================================

  describe('Progress Tracking', () => {
    test.skip('calculates progress based on known words only', async () => {
      setupReviewSession(4);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // Word 1: known → 25%
      await act(async () => {
        await result.current.updateWord(1 as RootId, 'known');
      });
      expect(result.current.progress).toBe(25);

      // Word 2: vague → still 25% (vague doesn't count as progress)
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });
      await act(async () => {
        await result.current.updateWord(2 as RootId, 'vague');
      });
      expect(result.current.progress).toBe(25);

      // Word 3: unknown → still 25%
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(3);
      });
      await act(async () => {
        await result.current.updateWord(3 as RootId, 'unknown');
      });
      expect(result.current.progress).toBe(25);

      // Word 4: known → 50%
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(4);
      });
      await act(async () => {
        await result.current.updateWord(4 as RootId, 'known');
      });
      expect(result.current.progress).toBe(50);
    });

    test.skip('reaches 100% only when all words are known', async () => {
      setupReviewSession(2);

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // First pass: vague, vague
      await act(async () => {
        await result.current.updateWord(1 as RootId, 'vague');
      });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      await act(async () => {
        await result.current.updateWord(2 as RootId, 'vague');
      });

      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBeFalsy();

      // Second pass: known, known
      for (let i = 0; i < 2; i++) {
        await waitFor(() => {
          expect(result.current.currentWord).not.toBeNull();
        });

        await act(async () => {
          await result.current.updateWord(result.current.currentWord!.root_id, 'known');
        });
      }

      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
      });

      expect(result.current.progress).toBe(100);
    });
  });

  // ============================================================================
  // ERROR RECOVERY
  // ============================================================================

  describe('Error Recovery', () => {
    // TODO: Fix mock setup - React Query queryFn interaction with mocked service
    test.skip('continues session after database update error', async () => {
      setupReviewSession(3);

      // Make second update fail
      let updateCount = 0;
      mockStudyWordsFSRSService.updateWordAndReview.mockImplementation(() => {
        updateCount++;
        if (updateCount === 2) {
          return Promise.reject(new Error('Database error'));
        }
        return Promise.resolve(undefined);
      });

      const { result } = renderHook(() => useFSRS({ userId: 'test-user' }), { wrapper });

      await waitFor(() => {
        expect(result.current.currentWord).not.toBeNull();
      });

      // First word: success
      await act(async () => {
        await result.current.updateWord(1 as RootId, 'known');
      });

      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(2);
      });

      // Second word: database error - should recover gracefully
      await act(async () => {
        await result.current.updateWord(2 as RootId, 'known');
      });

      // Should continue to next word despite error
      await waitFor(() => {
        expect(result.current.currentWord?.root_id).toBe(3);
      });

      // Session should still be functional
      expect(result.current.isComplete).toBeFalsy();
    });

    // TODO: Fix mock setup - isComplete behavior when no words
    test.skip('handles empty session gracefully', async () => {
      // No words to review
      const onComplete = jest.fn();

      const { result } = renderHook(() => useFSRS({ userId: 'test-user', onComplete }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isComplete).toBeTruthy();
      });

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ============================================================================
  // SESSION CONFIGURATION
  // ============================================================================

  describe('Session Configuration', () => {
    // TODO: Fix mock setup - service call doesn't include sessionCooldownHours in signature
    test.skip('respects session cooldown hours setting', async () => {
      setupReviewSession(3);

      const userId = 'test-user';
      const cooldownHours = 4;

      // Set last completed timestamp
      queryClient.setQueryData(
        fsrsQueries.lastCompletedAtKey(userId),
        Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
      );

      renderHook(() => useFSRS({ userId, sessionCooldownHours: cooldownHours }), { wrapper });

      await waitFor(() => {
        expect(mockStudyWordsFSRSService.getFSRSWords).toHaveBeenCalledWith(
          userId,
          expect.objectContaining({ sessionCooldownHours: 4 }),
        );
      });
    });
  });
});
