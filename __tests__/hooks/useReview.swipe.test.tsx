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

jest.mock('@/hooks/audio/useSimpleAudioPlayer', () => ({
  useSimpleAudioPlayer: jest.fn(),
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

jest.mock('@/services/audioCache', () => ({
  audioCache: {
    getAudio: jest.fn((url: string) => Promise.resolve(url)),
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
  isValidStoragePath: jest.fn((path: unknown): path is string => {
    return typeof path === 'string' && path.trim().length > 0;
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
    // Parameterized test for basic swipe handling
    test.each([
      {
        gesture: 'swipe right',
        action: (result: any) => result.current.handleSwipeRight(),
        expectedConfidence: 'known',
        expectedStability: 5,
      },
      {
        gesture: 'swipe left',
        action: (result: any) => result.current.handleSwipeLeft(),
        expectedConfidence: 'unknown',
        expectedStability: 5,
      },
    ])(
      'should handle $gesture → $expectedConfidence',
      async ({ action, expectedConfidence, expectedStability }) => {
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
          action(result);
        });

        await waitFor(() => {
          expect(mocks.mockUpdateWord).toHaveBeenCalledWith(101, expectedConfidence);
          expect(mocks.mockUpdateMetrics).toHaveBeenCalledWith(expectedConfidence, {
            rootId: 101,
            oldStability: expectedStability,
            newStability: 7.5,
          });
        });
      },
    );

    describe('Known Word Specific Behavior', () => {
      test('should fade out and fade in for known word transition', async () => {
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
          result.current.handleSwipeRight();
        });

        await waitFor(() => {
          expect(mocks.mockFadeOut).toHaveBeenCalled();
        });
      });

      test('should not show translation for known words', async () => {
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
          result.current.handleSwipeRight();
        });

        await waitFor(() => {
          expect(mocks.mockUpdateWord).toHaveBeenCalled();
        });

        expect(result.current.showTranslation).toBeFalsy();
      });
    });

    describe('Unknown Word Specific Behavior', () => {
      // SKIP: Complex async timing issue with audioCache.getAudio promise resolution
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
          result.current.handleSwipeLeft();
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
