/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * useReview Hook Tests - Grading
 *
 * Tests the grade path end to end: reveal → grade → restudy hold → advance.
 * Every test drives the hook's own callbacks; there is no input layer here.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { VERDICT } from '@/constants/animation';
import { useReview } from '@/hooks/review/useReview';
import {
  createMockWord,
  createWrapper,
  fsrsState,
  setupUseReviewMocks,
  type UseReviewMockRefs,
} from './review/useReviewTestSetup';

// Mock dependencies
jest.mock('@/hooks/auth', () => ({
  useAuth: jest.fn((..._args: unknown[]) => ({ user: { id: 'test-user-123' } })),
}));

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    play: jest.fn(),
    stop: jest.fn(),
    preconfigureAudioSession: jest.fn(),
    subscribe: jest.fn((..._args: unknown[]) => jest.fn()),
    getStatus: jest.fn((..._args: unknown[]) => ({})),
  },
}));

jest.mock('@/hooks/review/useSessionMetrics', () => ({
  useSessionMetrics: jest.fn(),
}));

jest.mock('@/hooks/review/useAudioPreloader', () => ({
  useAudioPreloader: jest.fn(),
}));

jest.mock('@/hooks/vocabulary', () => ({
  useFSRS: jest.fn(),
  useWordSizing: jest.fn((..._args: unknown[]) => 80),
}));

jest.mock('@/hooks/utils/useTimerCleanup', () => ({
  useTimerCleanup: jest.fn(),
}));

jest.mock('@/hooks/animations/useOpacityAnimation', () => ({
  useOpacityAnimation: jest.fn(),
}));

// Note: getAudio returns synchronously to avoid async timing issues in tests
jest.mock('@/services/audioCache', () =>
  require('@/__tests__/helpers/reviewMocks').createReviewAudioCacheMock(),
);

jest.mock('@/utils/storageUtils', () =>
  require('@/__tests__/helpers/reviewMocks').createReviewStorageUtilsMock(),
);

jest.mock('@/services/supabase', () =>
  require('@/__tests__/helpers/reviewMocks').createReviewSupabaseMock(),
);

// Get mocked hooks for direct manipulation in tests
const { useFSRS } = require('@/hooks/vocabulary');

describe('useReview Hook - Grading', () => {
  let mocks: UseReviewMockRefs;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = setupUseReviewMocks();
  });

  describe('Grading', () => {
    // Parameterized test for basic grading: reveal the answer first, then grade.
    test.each([
      { grade: 'Knew it', confidence: 'known' as const, expectedStability: 5 },
      { grade: 'Forgot', confidence: 'unknown' as const, expectedStability: 5 },
    ])('should handle $grade → $confidence', async ({ confidence, expectedStability }) => {
      const word = createMockWord();
      useFSRS.mockReturnValue(fsrsState(mocks, word));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      act(() => {
        result.current.revealAnswer();
      });

      act(() => {
        result.current.grade(confidence);
      });

      // "Forgot" no longer advances straight away: it holds the card on its
      // answer face for a restudy beat and waits for a tap. The FSRS write is
      // deferred to that tap, not skipped — the grade is identical, only its
      // timing moved. "Knew it" still commits immediately.
      if (confidence === 'unknown') {
        expect(result.current.restudying).toBe(true);
        expect(mocks.mockUpdateWord).not.toHaveBeenCalled();

        act(() => {
          result.current.continueFromRestudy();
        });

        // The hold's UI flag deliberately outlives the tap — it clears when the
        // next card arrives, not here. `revealed` is still true for this card,
        // and the bottom band picks restudy → voice → revealed → reveal, so
        // dropping `restudying` now swapped "Continue" for the grade bar for
        // the whole exit fade. Re-entry is guarded by a ref instead; the
        // "commits only once" test below covers that.
        expect(result.current.restudying).toBe(true);
        expect(result.current.revealed).toBe(true);
      }

      await waitFor(() => {
        expect(mocks.mockUpdateWord).toHaveBeenCalledWith(101, confidence);
        expect(mocks.mockUpdateMetrics).toHaveBeenCalledWith(confidence, {
          rootId: 101,
          oldStability: expectedStability,
          newStability: 7.5,
        });
      });
    });

    test('a forgotten card commits only once, on the tap that leaves the hold', async () => {
      const word = createMockWord();
      useFSRS.mockReturnValue(fsrsState(mocks, word));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      act(() => {
        result.current.revealAnswer();
      });
      act(() => {
        result.current.grade('unknown');
      });
      // A second "Forgot" while already holding must not stack another hold or
      // double-write — grade() re-entering is exactly what the ref guards.
      act(() => {
        result.current.grade('unknown');
      });
      act(() => {
        result.current.continueFromRestudy();
      });
      // And a stray continue after the hold is over is a no-op.
      act(() => {
        result.current.continueFromRestudy();
      });

      await waitFor(() => {
        expect(mocks.mockUpdateWord).toHaveBeenCalledTimes(1);
      });
    });

    test('a repeated root starts a fresh restudy hold under its new card key', async () => {
      const first = createMockWord({
        fsrs_last_review: '2026-08-01T00:00:00.000Z',
        fsrs_reps: 2,
      });
      useFSRS.mockReturnValue(fsrsState(mocks, first));

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useReview(), { wrapper });

      act(() => result.current.revealAnswer());
      act(() => result.current.grade('unknown'));
      act(() => result.current.continueFromRestudy());
      await waitFor(() => expect(result.current.isUpdating).toBe(false));

      const repeated = createMockWord({
        fsrs_last_review: '2026-08-02T00:00:00.000Z',
        fsrs_reps: 3,
      });
      useFSRS.mockReturnValue(fsrsState(mocks, repeated));
      rerender(undefined);

      act(() => result.current.revealAnswer());
      act(() => result.current.grade('unknown'));

      expect(result.current.currentWordKey).not.toContain('2026-08-01');
      expect(result.current.restudying).toBe(true);
    });

    test('a rejected known grade restores the revealed card and permits retry', async () => {
      const word = createMockWord();
      mocks.mockUpdateWord
        .mockResolvedValueOnce({ status: 'rejected', reason: 'scheduler-error' })
        .mockResolvedValueOnce({ status: 'committed', stability: 7.5 });
      useFSRS.mockReturnValue(fsrsState(mocks, word));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      act(() => result.current.revealAnswer());
      act(() => result.current.grade('known'));

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.gradeRecoveryEpoch).toBe(1);
      });
      expect(result.current.revealed).toBe(true);
      expect(result.current.showTranslation).toBe(true);
      expect(result.current.restudying).toBe(false);
      expect(mocks.mockUpdateMetrics).not.toHaveBeenCalled();

      act(() => result.current.grade('known'));
      await waitFor(() => expect(mocks.mockUpdateMetrics).toHaveBeenCalledTimes(1));
      expect(mocks.mockUpdateWord).toHaveBeenCalledTimes(2);
    });

    test('a rejected restudy continue returns to the grade choices', async () => {
      const word = createMockWord();
      mocks.mockUpdateWord.mockResolvedValueOnce({
        status: 'rejected',
        reason: 'scheduler-error',
      });
      useFSRS.mockReturnValue(fsrsState(mocks, word));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      act(() => result.current.revealAnswer());
      act(() => result.current.grade('unknown'));
      expect(result.current.restudying).toBe(true);
      act(() => result.current.continueFromRestudy());

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
        expect(result.current.restudying).toBe(false);
        expect(result.current.gradeRecoveryEpoch).toBe(1);
      });
      expect(result.current.revealed).toBe(true);
      expect(mocks.mockUpdateMetrics).not.toHaveBeenCalled();
    });

    describe('Grade Behavior', () => {
      test('should fade out on grade (card advance)', async () => {
        const word = createMockWord();
        useFSRS.mockReturnValue(fsrsState(mocks, word));

        const wrapper = createWrapper();
        const { result } = renderHook(() => useReview(), { wrapper });

        act(() => {
          result.current.revealAnswer();
        });

        act(() => {
          result.current.grade('known');
        });

        await waitFor(() => {
          expect(mocks.mockFadeOut).toHaveBeenCalled();
        });
      });

      // The card holds its verdict at full strength before dissolving, because
      // the dissolve is Easing.out — a confirmation painted at grade time was
      // under a third of its opacity within three frames and never read.
      test('the dissolve waits for the verdict beat', () => {
        const word = createMockWord();
        useFSRS.mockReturnValue(fsrsState(mocks, word));

        const wrapper = createWrapper();
        const { result } = renderHook(() => useReview(), { wrapper });

        act(() => {
          result.current.revealAnswer();
        });
        act(() => {
          result.current.grade('known');
        });

        expect(mocks.mockFadeOut).toHaveBeenCalledWith(expect.any(Function), VERDICT.BEAT);
      });

      // The restudy continue is exempt: its verdict has been on the card for the
      // whole hold, and the screen starts the card's left exit on the same tap,
      // so beating again would only desync the fade from the throw.
      test('a grade that already had its moment skips the beat', () => {
        const word = createMockWord();
        useFSRS.mockReturnValue(fsrsState(mocks, word));

        const wrapper = createWrapper();
        const { result } = renderHook(() => useReview(), { wrapper });

        act(() => {
          result.current.revealAnswer();
        });
        act(() => {
          result.current.grade('known', { skipBeat: true });
        });

        expect(mocks.mockFadeOut).toHaveBeenCalledWith(expect.any(Function), 0);
      });

      // The screen plays the card's verdict only for a grade that landed. Every
      // guard that silently drops one has to be reportable, or the card
      // confirms an outcome that was never written.
      test('grade reports whether it acted', () => {
        const word = createMockWord();
        useFSRS.mockReturnValue(fsrsState(mocks, word));

        const wrapper = createWrapper();
        const { result } = renderHook(() => useReview(), { wrapper });

        // Unrevealed and not from voice — the recall was never tested.
        let acted: boolean | undefined;
        act(() => {
          acted = result.current.grade('known');
        });
        expect(acted).toBe(false);

        act(() => {
          result.current.revealAnswer();
        });
        act(() => {
          acted = result.current.grade('unknown');
        });
        expect(acted).toBe(true);

        // A second grade arriving during the restudy hold is dropped: the
        // outcome is already decided and only the continue tap may commit it.
        act(() => {
          acted = result.current.grade('known');
        });
        expect(acted).toBe(false);
      });

      test('reveals the answer (shows the translation) before grading', () => {
        const word = createMockWord();
        useFSRS.mockReturnValue(fsrsState(mocks, word));

        const wrapper = createWrapper();
        const { result } = renderHook(() => useReview(), { wrapper });

        // Question face first — the answer is hidden until revealed.
        expect(result.current.showTranslation).toBeFalsy();
        expect(result.current.revealed).toBeFalsy();

        act(() => {
          result.current.revealAnswer();
        });

        expect(result.current.revealed).toBeTruthy();
        expect(result.current.showTranslation).toBeTruthy();
        expect(result.current.currentMeaning).toBe('book');
      });
    });

    describe('Unknown Word Specific Behavior', () => {
      it('should play English audio for unknown words', async () => {
        const word = createMockWord({
          root: {
            id: 101,
            letters: 'كتاب',
            meaning: 'book',
            audio_url: 'audio/kitab.mp3',
            audio_url_en: 'audio/book.mp3',
          },
        });

        useFSRS.mockReturnValue(fsrsState(mocks, word));

        const wrapper = createWrapper();
        const { result } = renderHook(() => useReview(), { wrapper });

        await act(async () => {
          result.current.revealAnswer();
          result.current.grade('unknown');
          await Promise.resolve();
          await Promise.resolve();
        });

        await waitFor(() => {
          expect(mocks.mockAudioPlayer.play).toHaveBeenCalledWith(
            expect.objectContaining({
              audioUrl: expect.stringContaining('book.mp3'),
            }),
            expect.objectContaining({ keepAudioSessionActive: true }),
          );
        });
      });
    });
  });

  describe('Closing', () => {
    // Not a jest.fn: `resetMocks` strips implementations between tests, and a
    // flush that returns undefined turns the whole exit into a caught TypeError.
    const flushPendingWrites = async (): Promise<void> => undefined;

    test('committing a held "Forgot" on close does not start the next card', async () => {
      const word = createMockWord();
      useFSRS.mockReturnValue({ ...fsrsState(mocks, word), flushPendingWrites });

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(() => useReview(), { wrapper });
      await waitFor(() => expect(mocks.mockAudioPlayer.play).toHaveBeenCalledTimes(1));

      act(() => result.current.revealAnswer());
      act(() => result.current.grade('unknown'));
      expect(result.current.restudying).toBe(true);
      // The hold replays the Arabic; let it land so it is not mistaken for the
      // next card's prompt below.
      await waitFor(() => expect(mocks.mockAudioPlayer.play).toHaveBeenCalledTimes(2));

      mocks.mockAudioPlayer.play.mockClear();
      mocks.mockFadeIn.mockClear();
      await act(async () => {
        result.current.handleClose();
        await Promise.resolve();
      });

      // The grade the learner was shown is still written...
      expect(mocks.mockUpdateWord).toHaveBeenCalledWith(101, 'unknown');

      // ...but the queue advancing underneath a closing screen must stay
      // silent and out of sight.
      const next = createMockWord({
        root_id: 202 as never,
        root: {
          id: 202,
          letters: 'قلم',
          meaning: 'pen',
          audio_url: 'audio/qalam.mp3',
          audio_url_en: 'audio/pen.mp3',
        },
      });
      useFSRS.mockReturnValue({ ...fsrsState(mocks, next), flushPendingWrites });
      await act(async () => {
        rerender({});
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(result.current.currentWord?.root_id).toBe(202);
      expect(mocks.mockAudioPlayer.play).not.toHaveBeenCalled();
      expect(mocks.mockFadeIn).not.toHaveBeenCalled();
    });

    test('a session with nothing beneath it closes to the Practice tab', async () => {
      const { router } = require('expo-router');
      const { ROUTE_PATHS } = require('@/constants/routes');
      // Opened from a reminder or a link while the app was closed: the session
      // is the whole stack, and `dismiss()` there does nothing at all.
      const canDismiss = jest.spyOn(router, 'canDismiss').mockReturnValue(false);
      useFSRS.mockReturnValue({ ...fsrsState(mocks, createMockWord()), flushPendingWrites });

      const { result } = renderHook(() => useReview(), { wrapper: createWrapper() });
      await act(async () => {
        result.current.handleClose();
        await Promise.resolve();
      });

      await waitFor(() => expect(router.replace).toHaveBeenCalledWith(ROUTE_PATHS.PRACTICE_TAB));
      expect(router.dismiss).not.toHaveBeenCalled();
      canDismiss.mockRestore();
    });

    test('leaving without grading does not stamp a completed session', async () => {
      const { fsrsQueries } = require('@/constants/queries');
      const { wrapper, queryClient } = createHookTestWrapper();
      const setQueryData = jest.spyOn(queryClient, 'setQueryData');
      const key = fsrsQueries.lastCompletedAtKey('test-user-123');

      useFSRS.mockReturnValue({ ...fsrsState(mocks, createMockWord()), flushPendingWrites });
      const first = renderHook(() => useReview(), { wrapper });
      act(() => first.unmount());
      // The exit still settles its writes; only the stamp is withheld.
      await waitFor(() => expect(mocks.mockInvalidateQueries).toHaveBeenCalled());
      expect(setQueryData).not.toHaveBeenCalled();

      // The same exit after a grade does.
      const second = renderHook(() => useReview(), { wrapper });
      act(() => second.result.current.revealAnswer());
      act(() => {
        second.result.current.grade('known');
      });
      await waitFor(() => expect(mocks.mockUpdateMetrics).toHaveBeenCalled());
      act(() => second.unmount());
      await waitFor(() => expect(setQueryData).toHaveBeenCalledWith(key, expect.any(Number)));
    });

    // The completion screen shows a streak, and the streak query does not
    // refetch on mount — so a session that runs out of cards is finalized when
    // that screen appears, not when the learner leaves it. Once: the Continue
    // that follows used to repeat every refresh the screen had already made.
    test('a session that runs out of cards is finalized once, after its writes settle', async () => {
      const { fsrsQueries } = require('@/constants/queries');
      const { wrapper, queryClient } = createHookTestWrapper();
      const setQueryData = jest.spyOn(queryClient, 'setQueryData');
      const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
      let settleWrites!: () => void;
      const heldFlush = jest.fn(
        () =>
          new Promise<void>(resolve => {
            settleWrites = resolve;
          }),
      );
      const streakRefreshes = () =>
        invalidateQueries.mock.calls.filter(
          ([filters]: unknown[]) =>
            (filters as { queryKey?: unknown[] }).queryKey?.[0] === 'study-streak',
        ).length;
      const word = createMockWord();
      useFSRS.mockReturnValue({ ...fsrsState(mocks, word), flushPendingWrites: heldFlush });

      const { result, rerender } = renderHook(() => useReview(), { wrapper });
      act(() => result.current.revealAnswer());
      act(() => {
        result.current.grade('known');
      });
      await waitFor(() => expect(mocks.mockUpdateMetrics).toHaveBeenCalled());

      // The last card's grade emptied the session.
      useFSRS.mockReturnValue({
        ...fsrsState(mocks, null, { isComplete: true }),
        flushPendingWrites: heldFlush,
      });
      rerender({});
      await waitFor(() => expect(heldFlush).toHaveBeenCalledTimes(1));
      // Nothing is refreshed while a write is still in flight.
      expect(setQueryData).not.toHaveBeenCalled();
      expect(streakRefreshes()).toBe(0);
      expect(mocks.mockInvalidateQueries).not.toHaveBeenCalled();

      await act(async () => settleWrites());
      await waitFor(() =>
        expect(setQueryData).toHaveBeenCalledWith(
          fsrsQueries.lastCompletedAtKey('test-user-123'),
          expect.any(Number),
        ),
      );
      expect(streakRefreshes()).toBe(1);
      expect(mocks.mockInvalidateQueries).toHaveBeenCalledTimes(1);

      // Continue: the session is already finalized, so nothing runs again.
      act(() => result.current.handleClose());
      // The close defers its finalize to an idle callback; let it run.
      await act(async () => {
        await jest.runOnlyPendingTimersAsync();
      });
      expect(heldFlush).toHaveBeenCalledTimes(1);
      expect(setQueryData).toHaveBeenCalledTimes(1);
      expect(streakRefreshes()).toBe(1);
      expect(mocks.mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });
  });
});
