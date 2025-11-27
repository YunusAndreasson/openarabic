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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { ReactNode } from 'react';

import { useReview } from '@/hooks/review/useReview';
import type { StudyWord } from '@/types/vocabulary.types';
import {
  createAuthMock,
  createAudioPlayerMock,
  createFSRSMock,
  createSessionMetricsMock,
  createAudioPreloaderMock,
  createTimerCleanupMock,
  createOpacityAnimationMock,
  setupInteractionManagerMock,
} from '@/__tests__/helpers/hookMocks';

// Mock dependencies
jest.mock('@/hooks/auth', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'test-user-123' } })),
}));

// Mock is in @/hooks/vocabulary below

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

// Mock audioCache service
jest.mock('@/services/audioCache', () => ({
  audioCache: {
    getAudio: jest.fn((url: string) => Promise.resolve(url)),
    preloadAudio: jest.fn(() => Promise.resolve()),
    clearCache: jest.fn(() => Promise.resolve()),
  },
}));

// Mock storageUtils to avoid supabase storage chain issues
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

// imageUtils uses same pattern as storageUtils - reuse the mock
jest.mock('@/utils/imageUtils', () => require('@/utils/storageUtils'));

// Mock checkAuthentication from supabase service
jest.mock('@/services/supabase', () => ({
  ...jest.requireActual('@/services/supabase'),
  checkAuthentication: jest.fn().mockResolvedValue({
    session: { user: { id: 'test-user-123' } } as any,
    user: { id: 'test-user-123' } as any,
  }),
}));

const { useAuth } = require('@/hooks/auth');
const { useFSRS } = require('@/hooks/vocabulary');
const { useSimpleAudioPlayer } = require('@/hooks/audio/useSimpleAudioPlayer');
const { useSessionMetrics } = require('@/hooks/review/useSessionMetrics');
const { useAudioPreloader } = require('@/hooks/review/useAudioPreloader');
const { useTimerCleanup } = require('@/hooks/utils/useTimerCleanup');
const { useOpacityAnimation } = require('@/hooks/animations/useOpacityAnimation');

// Test helper: Create mock word
const createMockWord = (overrides: Partial<StudyWord> = {}): StudyWord => ({
  id: 1,
  user_id: 'test-user-123',
  root_id: 101,
  fsrs_due: new Date(Date.now() - 1000).toISOString(),
  fsrs_stability: 5,
  fsrs_difficulty: 5,
  fsrs_scheduled_days: 1,
  fsrs_reps: 2,
  fsrs_lapses: 0,
  fsrs_state: 2,
  fsrs_last_review: new Date().toISOString(),
  created_at: new Date().toISOString(),
  root: {
    id: 101,
    letters: 'كتاب',
    meaning: 'book',
    audio_url: 'audio/kitab.mp3',
    audio_url_en: 'audio/book.mp3',
  },
  ...overrides,
});

// Test wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useReview Hook', () => {
  let mockAudioPlayer: ReturnType<typeof createAudioPlayerMock>;
  let mockUpdateWord: jest.Mock;
  let mockInvalidateQueries: jest.Mock;
  let mockUpdateMetrics: jest.Mock;
  let mockSetTimer: jest.Mock;
  let mockClearTimer: jest.Mock;
  let mockClearAllTimers: jest.Mock;
  let mockFadeIn: jest.Mock;
  let mockFadeOut: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup InteractionManager mock
    setupInteractionManagerMock();

    // Mock auth - use factory
    useAuth.mockReturnValue(createAuthMock());

    // Mock audio player - use factory, extract mock functions for assertions
    mockAudioPlayer = createAudioPlayerMock();
    useSimpleAudioPlayer.mockReturnValue(mockAudioPlayer);

    // Mock FSRS hook - use factory, extract mock functions for assertions
    mockUpdateWord = jest.fn().mockResolvedValue(7.5);
    mockInvalidateQueries = jest.fn();
    useFSRS.mockReturnValue(
      createFSRSMock({
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      }),
    );

    // Mock session metrics - use factory, extract mock function for assertions
    mockUpdateMetrics = jest.fn();
    useSessionMetrics.mockReturnValue(
      createSessionMetricsMock({
        updateMetrics: mockUpdateMetrics,
      }),
    );

    // Mock audio preloader - use factory
    useAudioPreloader.mockReturnValue(
      createAudioPreloaderMock({
        isPreloading: false,
        progress: 100,
      }),
    );

    // Mock timer cleanup - use factory with custom setTimer behavior
    mockSetTimer = jest.fn((_name, callback) => {
      callback(); // Execute callback synchronously for testing
    });
    mockClearTimer = jest.fn();
    mockClearAllTimers = jest.fn();
    useTimerCleanup.mockReturnValue(
      createTimerCleanupMock({
        setTimer: mockSetTimer,
        clearTimer: mockClearTimer,
        clearAllTimers: mockClearAllTimers,
      }),
    );

    // Mock opacity animation - use factory, extract mock functions for assertions
    mockFadeIn = jest.fn();
    mockFadeOut = jest.fn();
    useOpacityAnimation.mockReturnValue(
      createOpacityAnimationMock({
        fadeIn: mockFadeIn,
        fadeOut: mockFadeOut,
      }),
    );
  });

  describe('Initialization', () => {
    test('should initialize with default state', () => {
      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.currentWord).toBeNull();
      expect(result.current.wordQueue).toEqual([]);
      expect(result.current.progress).toBe(0);
      expect(result.current.isComplete).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.showTranslation).toBe(false);
    });

    test('should initialize with word queue', () => {
      const word1 = createMockWord({ id: 1, root_id: 101 });
      const word2 = createMockWord({ id: 2, root_id: 102 });

      useFSRS.mockReturnValue({
        currentWord: word1,
        wordQueue: [word1, word2],
        isLoading: false,
        isComplete: false,
        progress: 0,
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.currentWord).toEqual(word1);
      expect(result.current.wordQueue).toHaveLength(2);
      expect(result.current.currentSentence.wordForm).toBe('كتاب');
    });

    test('should preconfigure audio session on mount', () => {
      const word = createMockWord();
      useFSRS.mockReturnValue({
        currentWord: word,
        wordQueue: [word],
        isLoading: false,
        isComplete: false,
        progress: 0,
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      });

      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      expect(mockAudioPlayer.preconfigureAudioSession).toHaveBeenCalled();
    });
  });

  describe('Audio Playback', () => {
    // SKIP: Complex async timing issue with audioCache.getAudio promise resolution
    // See "Unknown Word Specific Behavior" test for detailed explanation
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

      useFSRS.mockReturnValue({
        currentWord: word,
        wordQueue: [word],
        isLoading: false,
        isComplete: false,
        progress: 0,
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      });

      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      await waitFor(() => {
        expect(mockAudioPlayer.play).toHaveBeenCalled();
      });
    });

    test('should not play audio during preloading', () => {
      useAudioPreloader.mockReturnValue({
        isPreloading: true,
        progress: 50,
        isComplete: false,
      });

      const word = createMockWord();
      useFSRS.mockReturnValue({
        currentWord: word,
        wordQueue: [word],
        isLoading: false,
        isComplete: false,
        progress: 0,
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      });

      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });

    test('should stop audio on session completion', () => {
      useFSRS.mockReturnValue({
        currentWord: null,
        wordQueue: [],
        isLoading: false,
        isComplete: true,
        progress: 100,
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      });

      const wrapper = createWrapper();
      renderHook(() => useReview(), { wrapper });

      expect(mockAudioPlayer.stop).toHaveBeenCalled();
    });
  });

  // Swipe gesture tests moved to useReview.swipe.test.tsx

  describe('Progress Tracking', () => {
    test('should update progress as words are reviewed', () => {
      useFSRS.mockReturnValue({
        currentWord: createMockWord(),
        wordQueue: [createMockWord(), createMockWord()],
        isLoading: false,
        isComplete: false,
        progress: 50,
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.progress).toBe(50);
    });

    test('should reach 100% progress on completion', () => {
      useFSRS.mockReturnValue({
        currentWord: null,
        wordQueue: [],
        isLoading: false,
        isComplete: true,
        progress: 100,
        updateWord: mockUpdateWord,
        invalidateQueries: mockInvalidateQueries,
      });

      const wrapper = createWrapper();
      const { result } = renderHook(() => useReview(), { wrapper });

      expect(result.current.progress).toBe(100);
      expect(result.current.isComplete).toBe(true);
    });
  });

  // Session completion, edge cases, cleanup, metrics, and audio preloader tests
  // moved to useReview.session.test.tsx

  // Vague/hint state tests moved to useReview.swipe.test.tsx
});
