/**
 * Integration Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: test.concurrent() used where tests are independent
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * Integration test for the query-cache state that drives the study-list button.
 *
 * BUG REPRODUCTION:
 * When a user adds a word to the study list multiple times (add → remove → add),
 * the button gets stuck showing "Remove from Study List" even after the word
 * has been removed from the study list.
 *
 * This suite deliberately uses the real mutation hook and a real QueryClient.
 * Only the network/service boundary is mocked. Assertions must inspect state
 * written by the hook itself; manually writing the expected cache value in a
 * test would merely test QueryClient and could not catch a broken mutation.
 */

// Unmock React Query to use real QueryClient for integration testing
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { fsrsQueries } from '@/constants/queries';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { rootId, userId } from '@/__tests__/helpers/ids';

// Mock dependencies
jest.mock('@/services/studyWordsFSRS');
// Keep inline for hoisting
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
    },
    from: jest.fn(),
  },
  checkAuthentication: jest.fn(),
}));
jest.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));
jest.mock('@/store/hooks', () => ({
  useAppSelector: jest.fn((..._args: unknown[]) => 'arabic'),
}));
jest.mock('@/hooks/vocabulary', () => ({
  useDailyWordLimit: () => ({
    dailyWordLimit: 50,
    canAddWord: jest.fn(async (..._args: unknown[]) => true),
    incrementDailyWordCount: jest.fn(async (..._args: unknown[]) => true),
    decrementDailyWordCount: jest.fn(async (..._args: unknown[]) => undefined),
    decrementIfAddedToday: jest.fn(async (..._args: unknown[]) => undefined),
  }),
}));

const { supabase } = require('@/services/supabase');

describe('Study List Button State - Bug Reproduction', () => {
  let queryClient: QueryClient;
  const mockUserId = userId('test-user-123');
  const mockRootId = rootId(42);

  // Helper to create study words for this test
  const createStudyWord = (id: number): StudyWord =>
    createTestWord({
      root_id: rootId(id),
      user_id: mockUserId,
      root: {
        id,
        letters: 'ك ت ب',
        meaning: 'to write',
        audio_url: '',
        audio_url_en: '',
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Mock successful auth session (legacy)
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: mockUserId },
        },
      },
      error: null,
    });

    // Mock checkAuthentication (new centralized auth)
    const { checkAuthentication } = require('@/services/supabase');
    (checkAuthentication as jest.Mock).mockResolvedValue({
      session: { user: { id: mockUserId } },
      user: { id: mockUserId },
    });
  });

  // Shared wrapper for all tests - uses queryClient from beforeEach
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('BUG: Add → Remove → Add Again Flow', () => {
    test('should correctly toggle button state through multiple add/remove cycles', async () => {
      // SETUP: Start with empty study list
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, []);
      queryClient.setQueryData(fsrsQueries.allWithCooldown(mockUserId, 24).queryKey, []);

      const { result } = renderHook(
        () => useStudyWordMutations(jest.fn(async (..._args: unknown[]) => undefined)),
        { wrapper },
      );

      // STEP 1: Add word to study list (first time)
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: true,
        changed: true,
      });

      const firstAddResult = await result.current.handleRootPress(mockRootId);

      expect(firstAddResult).toBeTruthy(); // Word was added
      expect(studyWordsFSRSService.setFSRSStudyRoot).toHaveBeenCalledWith(
        mockUserId,
        mockRootId,
        undefined,
      );

      // The hook's optimistic mutation itself must put the word in the cache.
      const afterFirstAdd = queryClient.getQueryData<StudyWord[]>(
        fsrsQueries.all(mockUserId).queryKey,
      );
      expect(afterFirstAdd?.some(w => w.root_id === mockRootId)).toBeTruthy();

      // STEP 2: Remove word from study list
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: false,
        changed: true,
      });

      const removeResult = await result.current.handleRootPress(mockRootId);

      expect(removeResult).toBeFalsy(); // Word was removed
      expect(studyWordsFSRSService.setFSRSStudyRoot).toHaveBeenCalledWith(
        mockUserId,
        mockRootId,
        undefined,
      );

      // The hook's optimistic mutation itself must remove the word.
      const afterRemove = queryClient.getQueryData<StudyWord[]>(
        fsrsQueries.all(mockUserId).queryKey,
      );
      expect(afterRemove?.some(w => w.root_id === mockRootId)).toBeFalsy();

      // STEP 3: Add word AGAIN (this should work but may fail due to bug)
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: true,
        changed: true,
      });

      const secondAddResult = await result.current.handleRootPress(mockRootId);

      // 🐛 BUG: This assertion may fail if the stale closure bug occurs
      expect(secondAddResult).toBeTruthy(); // Word should be added again
      expect(studyWordsFSRSService.setFSRSStudyRoot).toHaveBeenCalledWith(
        mockUserId,
        mockRootId,
        undefined,
      );

      // A later add must not be affected by a stale result from the removal.
      const afterSecondAdd = queryClient.getQueryData<StudyWord[]>(
        fsrsQueries.all(mockUserId).queryKey,
      );
      expect(afterSecondAdd?.some(w => w.root_id === mockRootId)).toBeTruthy();
    });

    test('should maintain the shared query cache through multiple toggles', async () => {
      // SETUP: Start with empty study list
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, []);
      queryClient.setQueryData(fsrsQueries.allWithCooldown(mockUserId, 24).queryKey, []);

      const { result } = renderHook(
        () => useStudyWordMutations(jest.fn(async (..._args: unknown[]) => undefined)),
        { wrapper },
      );

      // First add
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: true,
        changed: true,
      });
      await result.current.handleRootPress(mockRootId);
      expect(
        queryClient
          .getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey)
          ?.some(word => word.root_id === mockRootId),
      ).toBe(true);

      // Remove
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: false,
        changed: true,
      });
      await result.current.handleRootPress(mockRootId);
      expect(
        queryClient
          .getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey)
          ?.some(word => word.root_id === mockRootId),
      ).toBe(false);

      // Second add
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: true,
        changed: true,
      });
      await result.current.handleRootPress(mockRootId);
      expect(
        queryClient
          .getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey)
          ?.some(word => word.root_id === mockRootId),
      ).toBe(true);

      // Third add (should toggle to false)
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: false,
        changed: true,
      });
      const finalResult = await result.current.handleRootPress(mockRootId);

      expect(finalResult).toBeFalsy();
      expect(
        queryClient
          .getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey)
          ?.some(word => word.root_id === mockRootId),
      ).toBe(false);
    });
  });

  describe('Cache and Local State Synchronization', () => {
    test('should update the same query cache consumed by the button', async () => {
      const existingWord = createStudyWord(mockRootId);
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, [existingWord]);

      const { result } = renderHook(
        () => useStudyWordMutations(jest.fn(async (..._args: unknown[]) => undefined)),
        { wrapper },
      );

      // Remove word (local state becomes false, but cache still has it)
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: false,
        changed: true,
      });
      const removeResult = await result.current.handleRootPress(mockRootId);

      expect(removeResult).toBeFalsy();

      expect(
        queryClient
          .getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey)
          ?.some(word => word.root_id === mockRootId),
      ).toBe(false);
    });

    test('should handle rapid toggles without state desync', async () => {
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, []);

      const { result } = renderHook(
        () => useStudyWordMutations(jest.fn(async (..._args: unknown[]) => undefined)),
        { wrapper },
      );

      // Simulate rapid clicks: add → remove → add → remove
      const operations = [true, false, true, false];

      for (const expectedResult of operations) {
        (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
          inStudyList: expectedResult,
          changed: true,
        });
        const actualResult = await result.current.handleRootPress(mockRootId);

        expect(actualResult).toBe(expectedResult);
        expect(
          queryClient
            .getQueryData<StudyWord[]>(fsrsQueries.all(mockUserId).queryKey)
            ?.some(word => word.root_id === mockRootId),
        ).toBe(expectedResult);
      }
    });
  });

  describe('Query Cache Invalidation Timing', () => {
    test('should invalidate all related queries after successful toggle', async () => {
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, []);

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () => useStudyWordMutations(jest.fn(async (..._args: unknown[]) => undefined)),
        { wrapper },
      );

      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockResolvedValueOnce({
        inStudyList: true,
        changed: true,
      });
      await result.current.handleRootPress(mockRootId);

      // Wait for mutation to complete and invalidation to fire
      await waitFor(() => {
        // Should invalidate multiple query keys
        expect(invalidateSpy).toHaveBeenCalled();
      });

      // Verify prefix-based invalidation covers all FSRS queries for this user
      const invalidatedKeys = invalidateSpy.mock.calls.map(call => call[0]?.queryKey);

      // invalidateAll uses prefix-based invalidation: ['fsrs-words', testUserId]
      // This single call covers all, due, stats, and cooldown queries
      expect(invalidatedKeys).toEqual(expect.arrayContaining([['fsrs-words', mockUserId]]));
    });
  });

  describe('Error Rollback Behavior', () => {
    test('should rollback optimistic update if mutation fails', async () => {
      // SETUP: Word already in study list
      const existingWord = createStudyWord(mockRootId);
      queryClient.setQueryData(fsrsQueries.all(mockUserId).queryKey, [existingWord]);

      const { result } = renderHook(
        () => useStudyWordMutations(jest.fn(async (..._args: unknown[]) => undefined)),
        { wrapper },
      );

      // Simulate mutation failure
      const mockError = new Error('Database connection failed');
      (studyWordsFSRSService.setFSRSStudyRoot as jest.Mock).mockRejectedValueOnce(mockError);

      // Attempt to remove word (will fail)
      const removeResult = await result.current.handleRootPress(mockRootId);

      // Should return undefined on error
      expect(removeResult).toBeUndefined();

      // Cache should still contain the word (rollback occurred)
      const cacheAfterError = queryClient.getQueryData<StudyWord[]>(
        fsrsQueries.all(mockUserId).queryKey,
      );
      expect(cacheAfterError?.some(w => w.root_id === mockRootId)).toBeTruthy();
    });
  });
});
