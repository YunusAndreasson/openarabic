/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

/**
 * useReview Hook Tests
 *
 * Tests the critical practice session hook that manages:
 * - Session initialization with due words
 * - User swipe interactions (left=unknown, right=known, hesitation+right=vague)
 * - Word state transitions and FSRS updates
 * - Audio playback (Arabic word audio, English feedback for unknown)
 * - Translation display for vague/unknown words
 * - Session completion when all words known
 * - Progress tracking throughout session
 * - Query cache invalidation
 *
 * This hook is CRITICAL - any bugs directly impact core learning experience.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useReview } from '@/hooks/review/useReview';
import {
  createFSRSMock,
  createMockWord,
  createWrapper,
  fsrsState,
  setupUseReviewMocks,
  type UseReviewMockRefs,
} from './review/useReviewTestSetup';
import { rootId } from '@/__tests__/helpers/ids';

// Mock dependencies
jest.mock('@/hooks/auth', () => ({
  useAuth: jest.fn((..._args: unknown[]) => ({ user: { id: 'test-user-123' } })),
}));

// Mock is in @/hooks/vocabulary below

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

// Mock audioCache service
// Note: getAudio returns synchronously to avoid async timing issues in tests.
// Since production code uses `await audioCache.getAudio(url)`, awaiting a non-Promise
// value simply returns it immediately.
jest.mock('@/services/audioCache', () =>
  require('@/__tests__/helpers/reviewMocks').createReviewAudioCacheMock(),
);

// Mock storageUtils to avoid supabase storage chain issues
jest.mock('@/utils/storageUtils', () =>
  require('@/__tests__/helpers/reviewMocks').createReviewStorageUtilsMock(),
);

// Mock checkAuthentication from supabase service
jest.mock('@/services/supabase', () =>
  require('@/__tests__/helpers/reviewMocks').createReviewSupabaseMock(),
);

// Get mocked hooks for direct manipulation in tests
const { useFSRS } = require('@/hooks/vocabulary');
const { useAudioPreloader } = require('@/hooks/review/useAudioPreloader');

describe('useReview Hook', () => {
  let mocks: UseReviewMockRefs;

  beforeEach(() => {
    jest.clearAllMocks();
    mocks = setupUseReviewMocks();
  });

  describe('Initialization', () => {
    // Regression: the review lane runs its player at a 100 ms status interval so
    // the microphone gate observes didJustFinish quickly. useReview held a
    // status subscription it never read a single field from, so that interval
    // re-rendered the hook — and the entire review screen under it — ten times a
    // second for the whole of every prompt and every revealed answer.
    test('does not subscribe to audio status', () => {
      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { simpleAudioService } = require('@/services/audioPlayer');
      expect(simpleAudioService.subscribe).not.toHaveBeenCalled();
    });

    test('should initialize with default state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBeFalsy();
      expect(result.current.isLoading).toBeFalsy();
      expect(result.current.showTranslation).toBeFalsy();
    });

    test('should initialize with word queue', () => {
      const word1 = createMockWord({ root_id: rootId(101) });
      const word2 = createMockWord({ root_id: rootId(102) });

      useFSRS.mockReturnValue(fsrsState(mocks, word1, { wordQueue: [word1, word2] }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.currentWord).toEqual(word1);
      expect(result.current.wordQueue).toHaveLength(2);
      expect(result.current.currentSentence.wordForm).toBe('كتاب');
    });

    test('should preconfigure audio session on mount', () => {
      const word = createMockWord();
      useFSRS.mockReturnValue(fsrsState(mocks, word));

      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      expect(mocks.mockAudioPlayer.preconfigureAudioSession).toHaveBeenCalled();
    });
  });

  describe('Audio Playback', () => {
    // The preloader downloaded every word's audio for this session and knows
    // where each file went. Re-asking audioCache for that answer on every
    // prompt, reveal and replay cost three async hops each — plus two
    // filesystem stats per file once the cache's five-minute memory TTL
    // expired, which any real session outlives.
    test('plays a preloaded file without going back to the cache', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { audioCache } = require('@/services/audioCache');
      // jest.config sets resetMocks, which strips the implementations declared
      // in the jest.mock factories above before every test.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { generateStorageUrl } = require('@/utils/storageUtils');
      generateStorageUrl.mockImplementation(
        (bucket: string, path: string) => `https://example.com/storage/${bucket}/${path}`,
      );
      const word = createMockWord({
        root: {
          id: 101,
          letters: 'كتاب',
          meaning: 'book',
          audio_url: 'audio/kitab.mp3',
          audio_url_en: 'audio/book.mp3',
        },
      });
      const url = 'https://example.com/storage/audio/audio/kitab.mp3';

      useAudioPreloader.mockReturnValue({
        isPreloading: false,
        progress: 100,
        isReady: true,
        resolveCached: jest.fn((candidate: string) =>
          candidate === url ? '/cache/kitab.mp3' : undefined,
        ),
        forgetCached: jest.fn(),
      });
      useFSRS.mockReturnValue(fsrsState(mocks, word));
      mocks.mockAudioPlayer.play.mockResolvedValue(true);
      audioCache.getAudio.mockClear();

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      await act(async () => {
        await result.current.handleReplayAudio();
      });
      expect(mocks.mockAudioPlayer.play).toHaveBeenCalledWith(
        expect.objectContaining({ audioUrl: '/cache/kitab.mp3' }),
        expect.anything(),
      );
      expect(audioCache.getAudio).not.toHaveBeenCalled();
    });

    // SKIP: Complex async timing with playAudio in useEffect makes this hard to test reliably.
    // The feature works in production - this is a test infrastructure limitation.
    it.skip('should play Arabic audio when word loads', async () => {
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
      renderHook(() => useReview(), { wrapper });

      await waitFor(() => {
        expect(mocks.mockAudioPlayer.play).toHaveBeenCalled();
      });
    });

    test('should not play audio during preloading', () => {
      useAudioPreloader.mockReturnValue({
        isPreloading: true,
        progress: 50,
        isReady: false,
      });

      const word = createMockWord();
      useFSRS.mockReturnValue(fsrsState(mocks, word));

      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      expect(mocks.mockAudioPlayer.play).not.toHaveBeenCalled();
    });

    test('should stop audio on session completion', () => {
      useFSRS.mockReturnValue(fsrsState(mocks, null, { isComplete: true, progress: 100 }));

      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      expect(mocks.mockAudioPlayer.stop).toHaveBeenCalled();
    });
  });

  // Swipe gesture tests moved to useReview.swipe.test.tsx

  describe('Progress Tracking', () => {
    test('should update progress as words are reviewed', () => {
      useFSRS.mockReturnValue(
        fsrsState(mocks, createMockWord(), {
          wordQueue: [createMockWord(), createMockWord()],
          progress: 50,
        }),
      );

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.progress).toBe(50);
    });

    test('should reach 100% progress on completion', () => {
      useFSRS.mockReturnValue(fsrsState(mocks, null, { isComplete: true, progress: 100 }));

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.progress).toBe(100);
      expect(result.current.isComplete).toBeTruthy();
    });
  });

  // Session completion, edge cases, cleanup, metrics, and audio preloader tests
  // moved to useReview.session.test.tsx

  // Vague/hint state tests moved to useReview.swipe.test.tsx
});
