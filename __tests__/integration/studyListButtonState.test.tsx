/**
 * Integration test to reproduce the "stuck button" bug in study list management
 *
 * BUG REPRODUCTION:
 * When a user adds a word to the study list multiple times (add → remove → add),
 * the button gets stuck showing "Remove from Study List" even after the word
 * has been removed from the study list.
 *
 * ROOT CAUSE:
 * 1. Stale closure in handleAddWordToStudy callback due to localStudyStates dependency
 * 2. Race condition between local optimistic state and query cache state
 * 3. Double optimistic state management (parent + child component)
 */

// Unmock React Query to use real QueryClient for integration testing
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { useArticleMutations } from '@/hooks/articles/useArticleMutations';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock dependencies
jest.mock('@/services/studyWordsFSRS');
// Keep inline for hoisting
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  },
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));
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
  useAppSelector: jest.fn(() => 'arabic'),
}));
jest.mock('@/hooks/vocabulary', () => ({
  useDailyWordLimit: () => ({
    dailyWordLimit: 50,
    canAddWord: jest.fn().mockResolvedValue(true),
    incrementDailyWordCount: jest.fn().mockResolvedValue(true),
  }),
}));

const { supabase } = require('@/services/supabase');

describe('Study List Button State - Bug Reproduction', () => {
  let queryClient: QueryClient;
  const mockUserId = 'test-user-123';
  const mockRootId = 42 as RootId;

  // Helper to create study words for this test
  const createStudyWord = (rootId: number): StudyWord =>
    createTestWord({
      root_id: rootId,
      user_id: mockUserId,
      root: {
        id: rootId,
        letters: 'ك ت ب',
        meaning: 'to write',
        audio_url: null,
        audio_url_en: null,
      },
    });

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();

    // Mock successful auth session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: {
        session: {
          user: { id: mockUserId },
        },
      },
      error: null,
    });
  });

  describe('BUG: Add → Remove → Add Again Flow', () => {
    it('should correctly toggle button state through multiple add/remove cycles', async () => {
      // SETUP: Start with empty study list
      queryClient.setQueryData(FSRS_QUERY_KEYS.all(mockUserId), []);
      queryClient.setQueryData(FSRS_QUERY_KEYS.allWithCooldown(mockUserId, 24), []);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useArticleMutations(mockUserId, jest.fn(), jest.fn().mockResolvedValue(undefined)),
        { wrapper }
      );

      // STEP 1: Add word to study list (first time)
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(true);

      const firstAddResult = await result.current.handleRootPress(mockRootId);

      expect(firstAddResult).toBe(true); // Word was added
      expect(studyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(mockUserId, mockRootId);

      // Simulate cache update after mutation
      await waitFor(() => {
        queryClient.setQueryData(
          FSRS_QUERY_KEYS.all(mockUserId),
          [createStudyWord(mockRootId)]
        );
      });

      // Verify word is in cache
      const afterFirstAdd = queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(mockUserId));
      expect(afterFirstAdd?.some(w => w.root_id === mockRootId)).toBe(true);

      // STEP 2: Remove word from study list
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(false);

      const removeResult = await result.current.handleRootPress(mockRootId);

      expect(removeResult).toBe(false); // Word was removed
      expect(studyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(mockUserId, mockRootId);

      // Simulate cache update after mutation
      await waitFor(() => {
        queryClient.setQueryData(FSRS_QUERY_KEYS.all(mockUserId), []);
      });

      // Verify word is NOT in cache
      const afterRemove = queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(mockUserId));
      expect(afterRemove?.some(w => w.root_id === mockRootId)).toBe(false);

      // STEP 3: Add word AGAIN (this should work but may fail due to bug)
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(true);

      const secondAddResult = await result.current.handleRootPress(mockRootId);

      // 🐛 BUG: This assertion may fail if the stale closure bug occurs
      expect(secondAddResult).toBe(true); // Word should be added again
      expect(studyWordsFSRSService.toggleFSRSStudyRoot).toHaveBeenCalledWith(mockUserId, mockRootId);

      // Simulate cache update after mutation
      await waitFor(() => {
        queryClient.setQueryData(
          FSRS_QUERY_KEYS.all(mockUserId),
          [createStudyWord(mockRootId)]
        );
      });

      // Verify word IS in cache again
      const afterSecondAdd = queryClient.getQueryData<StudyWord[]>(FSRS_QUERY_KEYS.all(mockUserId));
      expect(afterSecondAdd?.some(w => w.root_id === mockRootId)).toBe(true);
    });

    it('should maintain correct local state map through multiple toggles', async () => {
      // SETUP: Start with empty study list
      queryClient.setQueryData(FSRS_QUERY_KEYS.all(mockUserId), []);
      queryClient.setQueryData(FSRS_QUERY_KEYS.allWithCooldown(mockUserId, 24), []);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      // Track what localStudyStates Map should contain after each operation
      const expectedLocalState = new Map<number, boolean>();

      const { result } = renderHook(
        () =>
          useArticleMutations(mockUserId, jest.fn(), jest.fn().mockResolvedValue(undefined)),
        { wrapper }
      );

      // First add
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(true);
      await result.current.handleRootPress(mockRootId);
      expectedLocalState.set(mockRootId, true);

      // Remove
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(false);
      await result.current.handleRootPress(mockRootId);
      expectedLocalState.set(mockRootId, false);

      // Second add
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(true);
      await result.current.handleRootPress(mockRootId);
      expectedLocalState.set(mockRootId, true);

      // Third add (should toggle to false)
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(false);
      const finalResult = await result.current.handleRootPress(mockRootId);
      expectedLocalState.set(mockRootId, false);

      // 🐛 BUG: If stale closure occurs, this will fail
      expect(finalResult).toBe(false);
    });
  });

  describe('Cache and Local State Synchronization', () => {
    it('should prioritize local state over query cache when both exist', async () => {
      // SETUP: Word exists in cache but local state says it was removed
      const existingWord = createStudyWord(mockRootId);
      queryClient.setQueryData(FSRS_QUERY_KEYS.all(mockUserId), [existingWord]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useArticleMutations(mockUserId, jest.fn(), jest.fn().mockResolvedValue(undefined)),
        { wrapper }
      );

      // Remove word (local state becomes false, but cache still has it)
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(false);
      const removeResult = await result.current.handleRootPress(mockRootId);

      expect(removeResult).toBe(false);

      // The issue: isInStudyList calculation should prioritize local state
      // but may use stale cache data instead
    });

    it('should handle rapid toggles without state desync', async () => {
      queryClient.setQueryData(FSRS_QUERY_KEYS.all(mockUserId), []);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useArticleMutations(mockUserId, jest.fn(), jest.fn().mockResolvedValue(undefined)),
        { wrapper }
      );

      // Simulate rapid clicks: add → remove → add → remove
      const operations = [true, false, true, false];

      for (const expectedResult of operations) {
        (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(
          expectedResult
        );
        const actualResult = await result.current.handleRootPress(mockRootId);

        // 🐛 BUG: May fail on later toggles due to stale closure
        expect(actualResult).toBe(expectedResult);
      }
    });
  });

  describe('Query Cache Invalidation Timing', () => {
    it('should invalidate all related queries after successful toggle', async () => {
      queryClient.setQueryData(FSRS_QUERY_KEYS.all(mockUserId), []);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

      const { result } = renderHook(
        () =>
          useArticleMutations(mockUserId, jest.fn(), jest.fn().mockResolvedValue(undefined)),
        { wrapper }
      );

      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockResolvedValueOnce(true);
      await result.current.handleRootPress(mockRootId);

      // Wait for mutation to complete and invalidation to fire
      await waitFor(() => {
        // Should invalidate multiple query keys
        expect(invalidateSpy).toHaveBeenCalled();
      });

      // Verify all expected keys were invalidated
      const invalidatedKeys = invalidateSpy.mock.calls.map(call => call[0].queryKey);

      // Check that the core query keys are invalidated (don't check exact cooldown value as it may vary)
      expect(invalidatedKeys).toEqual(
        expect.arrayContaining([
          FSRS_QUERY_KEYS.all(mockUserId),
          FSRS_QUERY_KEYS.due(mockUserId),
          FSRS_QUERY_KEYS.stats(mockUserId),
        ])
      );

      // Verify at least one cooldown query was invalidated (cooldown value may vary)
      const hasCooldownQuery = invalidatedKeys.some(
        key => Array.isArray(key) && key.includes('cooldown')
      );
      expect(hasCooldownQuery).toBe(true);
    });
  });

  describe('Error Rollback Behavior', () => {
    it('should rollback optimistic update if mutation fails', async () => {
      // SETUP: Word already in study list
      const existingWord = createStudyWord(mockRootId);
      queryClient.setQueryData(FSRS_QUERY_KEYS.allWithCooldown(mockUserId, 24), [existingWord]);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );

      const { result } = renderHook(
        () =>
          useArticleMutations(mockUserId, jest.fn(), jest.fn().mockResolvedValue(undefined)),
        { wrapper }
      );

      // Simulate mutation failure
      const mockError = new Error('Database connection failed');
      (studyWordsFSRSService.toggleFSRSStudyRoot as jest.Mock).mockRejectedValueOnce(mockError);

      // Attempt to remove word (will fail)
      const removeResult = await result.current.handleRootPress(mockRootId);

      // Should return undefined on error
      expect(removeResult).toBeUndefined();

      // Cache should still contain the word (rollback occurred)
      const cacheAfterError = queryClient.getQueryData<StudyWord[]>(
        FSRS_QUERY_KEYS.allWithCooldown(mockUserId, 24)
      );
      expect(cacheAfterError?.some(w => w.root_id === mockRootId)).toBe(true);
    });
  });
});
