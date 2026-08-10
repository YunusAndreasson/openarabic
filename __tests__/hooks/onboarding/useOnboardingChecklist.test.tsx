/**
 * useOnboardingChecklist — the eligibility heuristic and the per-step
 * `local flag || server signal` derivations.
 *
 * This hook decides, once and permanently, whether an account ever sees the
 * first-run intro and checklist. It had no test coverage; the storage blob
 * underneath it did.
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { OnboardingStep } from '@/constants/onboarding';
import type { Article } from '@/types/articles.types';
import type { StudyWord } from '@/types/vocabulary.types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// --- Mutable mock state, re-applied per test (jest config sets resetMocks) ---
let mockUser: { id: string; created_at?: string } | null = null;
let mockStudyWords: Partial<StudyWord>[] = [];
let mockFSRSLoading = false;
let mockFSRSError: Error | null = null;
let mockProgressMap: Map<number, unknown> | undefined = new Map();
let mockProgressLoading = false;
const mockCompleteTutorial = jest.fn();

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

jest.mock('@/components/providers/FSRSDataProvider', () => ({
  useFSRSData: () => ({
    studyWords: mockStudyWords,
    isLoading: mockFSRSLoading,
    error: mockFSRSError,
  }),
}));

jest.mock('@/hooks/articles/useReadingProgress', () => ({
  useBulkReadingProgress: () => ({
    data: mockProgressMap,
    isLoading: mockProgressLoading,
  }),
}));

jest.mock('@/components/providers', () => ({
  useTutorialContext: () => ({ completeTutorial: mockCompleteTutorial }),
}));

jest.mock('@/services/analytics', () => ({
  analytics: { track: jest.fn() },
}));

import { useOnboardingChecklist } from '@/hooks/onboarding/useOnboardingChecklist';
import {
  loadOnboardingState,
  markOnboardingStep,
  setOnboardingStorageUser,
} from '@/utils/onboardingStorage';

const ARTICLES = [{ id: 1 }] as unknown as Article[];

const daysAgo = (days: number): string => new Date(Date.now() - days * MS_PER_DAY).toISOString();

describe('useOnboardingChecklist', () => {
  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.clear();
    // Drops the module-level cache: the hook re-scopes it to the user on mount,
    // and setOnboardingStorageUser clears whenever the active id changes.
    setOnboardingStorageUser(null);

    mockUser = { id: 'user-1', created_at: daysAgo(1) };
    mockStudyWords = [];
    mockFSRSLoading = false;
    mockFSRSError = null;
    mockProgressMap = new Map();
    mockProgressLoading = false;
  });

  describe('eligibility', () => {
    it('shows both surfaces to a fresh account', async () => {
      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.isEligible).toBe(true));
      expect(result.current.isChecklistVisible).toBe(true);
      expect(mockCompleteTutorial).not.toHaveBeenCalled();
    });

    it('suppresses an account older than the established-age threshold', async () => {
      mockUser = { id: 'user-1', created_at: daysAgo(30) };

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(mockCompleteTutorial).toHaveBeenCalled());
      expect(result.current.isEligible).toBe(false);
      expect(result.current.isChecklistVisible).toBe(false);
    });

    it('suppresses a young account that already has BOTH words and reading history', async () => {
      mockStudyWords = [{ root_id: 1 } as Partial<StudyWord>];
      mockProgressMap = new Map([[1, { progress: 50 }]]);

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(mockCompleteTutorial).toHaveBeenCalled());
      expect(result.current.isEligible).toBe(false);
    });

    it('still shows for a young account with words but no reading history', async () => {
      mockStudyWords = [{ root_id: 1 } as Partial<StudyWord>];
      mockProgressMap = new Map();

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.isEligible).toBe(true));
      expect(mockCompleteTutorial).not.toHaveBeenCalled();
    });

    it('writes no decision while the signals are still loading', async () => {
      mockFSRSLoading = true;

      renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(loadOnboardingState()).resolves.toBeDefined());
      const state = await loadOnboardingState();
      expect(state.initializedAt).toBeUndefined();
    });

    it('writes no decision when the FSRS query errored — retried next launch', async () => {
      mockFSRSError = new Error('network');

      renderHook(() => useOnboardingChecklist(ARTICLES));

      const state = await loadOnboardingState();
      expect(state.initializedAt).toBeUndefined();
    });

    it('writes no decision before the article catalog has loaded', async () => {
      renderHook(() => useOnboardingChecklist([]));

      const state = await loadOnboardingState();
      expect(state.initializedAt).toBeUndefined();
    });
  });

  describe('step derivation', () => {
    const stepDone = (
      items: { step: string; done: boolean }[],
      step: string,
    ): boolean | undefined => items.find(i => i.step === step)?.done;

    it('has four steps', async () => {
      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.isEligible).toBe(true));
      expect(result.current.items).toHaveLength(4);
    });

    it('derives read from server reading progress', async () => {
      mockProgressMap = new Map([[1, { progress: 10 }]]);

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.isEligible).toBe(true));
      expect(stepDone(result.current.items, OnboardingStep.READ_TEXT)).toBe(true);
    });

    it('derives save from the presence of study words', async () => {
      mockStudyWords = [{ root_id: 1, fsrs_reps: 0 } as Partial<StudyWord>];

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.isEligible).toBe(true));
      expect(stepDone(result.current.items, OnboardingStep.SAVE_WORD)).toBe(true);
    });

    // fsrs_last_review is stamped at word creation with reps 0, so only reps can
    // tell a saved word apart from a reviewed one.
    it('does NOT count a saved-but-never-reviewed word as practised', async () => {
      mockStudyWords = [
        {
          root_id: 1,
          fsrs_reps: 0,
          fsrs_last_review: new Date().toISOString(),
        } as Partial<StudyWord>,
      ];

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.isEligible).toBe(true));
      expect(stepDone(result.current.items, OnboardingStep.PRACTICE_WORD)).toBe(false);
    });

    it('counts a word with fsrs_reps > 0 as practised', async () => {
      mockStudyWords = [{ root_id: 1, fsrs_reps: 1 } as Partial<StudyWord>];

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() =>
        expect(stepDone(result.current.items, OnboardingStep.PRACTICE_WORD)).toBe(true),
      );
    });

    it('listening is local-only — no server signal exists for it', async () => {
      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.isEligible).toBe(true));
      expect(stepDone(result.current.items, OnboardingStep.LISTEN_AUDIO)).toBe(false);

      await markOnboardingStep(OnboardingStep.LISTEN_AUDIO);

      await waitFor(() =>
        expect(stepDone(result.current.items, OnboardingStep.LISTEN_AUDIO)).toBe(true),
      );
    });

    it('reports allDone only once every step is complete', async () => {
      mockProgressMap = new Map([[1, { progress: 10 }]]);
      mockStudyWords = [{ root_id: 1, fsrs_reps: 3 } as Partial<StudyWord>];

      const { result } = renderHook(() => useOnboardingChecklist(ARTICLES));

      await waitFor(() => expect(result.current.doneCount).toBe(3));
      expect(result.current.allDone).toBe(false);

      await markOnboardingStep(OnboardingStep.LISTEN_AUDIO);

      await waitFor(() => expect(result.current.allDone).toBe(true));
      expect(result.current.doneCount).toBe(4);
    });
  });
});
