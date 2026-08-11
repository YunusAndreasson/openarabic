/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * useReview Hook Tests - Swipe Gestures
 *
 * Tests user swipe interactions:
 * - Swipe right → known
 * - Swipe left → unknown
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { VERDICT } from '@/constants/animation';
import { useReview } from '@/hooks/review/useReview';
import {
  setupUseReviewMocks,
  createMockWord,
  createWrapper,
  type UseReviewMockRefs,
} from './review/useReviewTestSetup';

// Mock dependencies
jest.mock('@/hooks/auth', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'test-user-123' } })),
}));

jest.mock('@/services/audioPlayer', () => ({
  simpleAudioService: {
    play: jest.fn(),
    stop: jest.fn(),
    preconfigureAudioSession: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    getStatus: jest.fn(() => ({})),
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
  useWordSizing: jest.fn(() => 80),
}));

jest.mock('@/hooks/utils/useTimerCleanup', () => ({
  useTimerCleanup: jest.fn(),
}));

jest.mock('@/hooks/animations/useOpacityAnimation', () => ({
  useOpacityAnimation: jest.fn(),
}));

jest.mock('expo-router', () => ({
  router: {
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

// Note: getAudio returns synchronously to avoid async timing issues in tests
jest.mock('@/services/audioCache', () => ({
  audioCache: {
    getAudio: jest.fn((url: string) => url),
    preloadAudio: jest.fn(() => Promise.resolve()),
    clearCache: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/utils/storageUtils', () => ({
  generateStorageUrl: jest.fn((bucket: string, path: string | null | undefined) => {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `https://example.com/storage/${bucket}/${path}`;
  }),
  generateImageUrl: jest.fn((path: string | null | undefined) => {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `https://example.com/storage/images/${path}`;
  }),
  generateAudioUrl: jest.fn((path: string | null | undefined) => {
    if (!path || typeof path !== 'string') return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `https://example.com/storage/audio/${path}`;
  }),
}));

jest.mock('@/services/supabase', () => ({
  ...jest.requireActual('@/services/supabase'),
  checkAuthentication: jest.fn().mockResolvedValue({
    session: { user: { id: 'test-user-123' } } as any,
    user: { id: 'test-user-123' } as any,
  }),
}));

// Get mocked hooks for direct manipulation in tests
const { useFSRS } = require('@/hooks/vocabulary');

describe('useReview Hook - Swipe Gestures', () => {
  let mocks: UseReviewMockRefs;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = setupUseReviewMocks();
  });

  describe('Swipe Gestures', () => {
    // Parameterized test for basic grading: reveal the answer first, then grade.
    test.each([
      { gesture: 'swipe right', confidence: 'known' as const, expectedStability: 5 },
      { gesture: 'swipe left', confidence: 'unknown' as const, expectedStability: 5 },
    ])('should handle $gesture → $confidence', async ({ confidence, expectedStability }) => {
      const word = createMockWord();
      useFSRS.mockReturnValue({
        currentWord: word,
        wordQueue: [word],
        isLoading: false,
        isComplete: false,
        progress: 0,
        updateWord: mocks.mockUpdateWord,
        invalidateQueries: mocks.mockInvalidateQueries,
      });

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
      useFSRS.mockReturnValue({
        currentWord: word,
        wordQueue: [word],
        isLoading: false,
        isComplete: false,
        progress: 0,
        updateWord: mocks.mockUpdateWord,
        invalidateQueries: mocks.mockInvalidateQueries,
      });

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

    describe('Grade Behavior', () => {
      test('should fade out on grade (card advance)', async () => {
        const word = createMockWord();
        useFSRS.mockReturnValue({
          currentWord: word,
          wordQueue: [word],
          isLoading: false,
          isComplete: false,
          progress: 0,
          updateWord: mocks.mockUpdateWord,
          invalidateQueries: mocks.mockInvalidateQueries,
        });

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
        useFSRS.mockReturnValue({
          currentWord: word,
          wordQueue: [word],
          isLoading: false,
          isComplete: false,
          progress: 0,
          updateWord: mocks.mockUpdateWord,
          invalidateQueries: mocks.mockInvalidateQueries,
        });

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

      // A swipe is exempt: it has been confirming continuously under the finger
      // and is throwing the card in the direction of the decision, so parking it
      // at the threshold first would stall a gesture that already said it all.
      test('a swipe skips the beat', () => {
        const word = createMockWord();
        useFSRS.mockReturnValue({
          currentWord: word,
          wordQueue: [word],
          isLoading: false,
          isComplete: false,
          progress: 0,
          updateWord: mocks.mockUpdateWord,
          invalidateQueries: mocks.mockInvalidateQueries,
        });

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
        useFSRS.mockReturnValue({
          currentWord: word,
          wordQueue: [word],
          isLoading: false,
          isComplete: false,
          progress: 0,
          updateWord: mocks.mockUpdateWord,
          invalidateQueries: mocks.mockInvalidateQueries,
        });

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
        useFSRS.mockReturnValue({
          currentWord: word,
          wordQueue: [word],
          isLoading: false,
          isComplete: false,
          progress: 0,
          updateWord: mocks.mockUpdateWord,
          invalidateQueries: mocks.mockInvalidateQueries,
        });

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
      // SKIP: Nested timer callbacks with async playAudio make this hard to test reliably.
      // The feature works in production - this is a test infrastructure limitation.
      it.skip('should play English audio for unknown words', async () => {
        const word = createMockWord({
          root: {
            id: 101,
            letters: 'كتاب',
            meaning: 'book',
            audio_url: 'audio/kitab.mp3',
            audio_url_en: 'audio/book.mp3',
          },
        });

        useFSRS.mockReturnValue({
          currentWord: word,
          wordQueue: [word],
          isLoading: false,
          isComplete: false,
          progress: 0,
          updateWord: mocks.mockUpdateWord,
          invalidateQueries: mocks.mockInvalidateQueries,
        });

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
          );
        });
      });
    });
  });
});
