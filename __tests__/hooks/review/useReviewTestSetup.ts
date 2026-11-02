/**
 * Shared Test Setup for useReview Hook Tests
 *
 * Centralizes the beforeEach setup logic used across:
 * - useReview.test.tsx
 * - useReview.session.test.tsx
 * - useReview.grade.test.tsx
 *
 * Note: jest.mock() declarations must remain in each test file due to hoisting.
 * This file handles the mock return value setup that runs in beforeEach.
 */

import {
  createAuthMock,
  createAudioPlayerMock,
  createFSRSMock,
  createSessionMetricsMock,
  createAudioPreloaderMock,
  createTimerCleanupMock,
  createOpacityAnimationMock,
} from '@/__tests__/helpers/hookMocks';

// Re-exported because useReview.test.tsx builds its FSRS state through this module.
export { createFSRSMock };

import type { StudyWord } from '@/types/vocabulary.types';
import { rootId, userId } from '@/__tests__/helpers/ids';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';

/**
 * Creates a mock StudyWord for useReview tests.
 * Includes root data needed for word display.
 */
export const createMockWord = (overrides: Partial<StudyWord> = {}): StudyWord =>
  createTestWord({
    user_id: userId('test-user-123'),
    root_id: rootId(101),
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

/**
 * Mock references returned by setupUseReviewMocks
 */
export interface UseReviewMockRefs {
  mockAudioPlayer: ReturnType<typeof createAudioPlayerMock>;
  mockUpdateWord: jest.Mock;
  mockInvalidateQueries: jest.Mock;
  mockUpdateMetrics: jest.Mock;
  mockSetTimer: jest.Mock;
  mockClearTimer: jest.Mock;
  mockClearAllTimers: jest.Mock;
  mockFadeIn: jest.Mock;
  mockFadeOut: jest.Mock;
}

/**
 * What `useFSRS` hands `useReview` for a given card.
 *
 * The three useReview suites wrote this same seven-key object 33 times. Four of
 * the keys never varied across ANY of them (`isLoading`, `updateWord`,
 * `invalidateQueries`, and usually `isComplete`/`progress`), so every block was
 * five lines of noise around the one or two values the test actually cared
 * about — and a new field on the hook meant editing 33 call sites.
 *
 * @param mocks the refs from `setupUseReviewMocks`
 * @param currentWord the card under test, or null for an empty/finished queue
 * @param overrides anything the test genuinely varies (`isComplete`, `progress`,
 *   or a `wordQueue` that is not just `[currentWord]`)
 */
export function fsrsState(
  mocks: UseReviewMockRefs,
  currentWord: StudyWord | null,
  overrides: Partial<{
    wordQueue: StudyWord[];
    isLoading: boolean;
    isComplete: boolean;
    progress: number;
  }> = {},
) {
  return {
    currentWord,
    wordQueue: currentWord ? [currentWord] : [],
    isLoading: false,
    isComplete: false,
    progress: 0,
    updateWord: mocks.mockUpdateWord,
    previewIntervals: jest.fn(() => ({ unknown: '1m', vague: '10m', known: '4d' })),
    invalidateQueries: mocks.mockInvalidateQueries,
    ...overrides,
  };
}

/**
 * Sets up all mock return values for useReview hook tests.
 * Call this in beforeEach after jest.clearAllMocks().
 *
 * @returns Object containing all mock references for assertions
 */
export function setupUseReviewMocks(): UseReviewMockRefs {
  // Get mocked hooks via require (they're already mocked via jest.mock in test file)
  const { useAuth } = require('@/hooks/auth');
  const { useFSRS } = require('@/hooks/vocabulary');
  const { simpleAudioService } = require('@/services/audioPlayer');
  const { useSessionMetrics } = require('@/hooks/review/useSessionMetrics');
  const { useAudioPreloader } = require('@/hooks/review/useAudioPreloader');
  const { useTimerCleanup } = require('@/hooks/utils/useTimerCleanup');
  const { useOpacityAnimation } = require('@/hooks/animations/useOpacityAnimation');

  // Mock auth
  useAuth.mockReturnValue(createAuthMock());

  // Mock the audio service. useReview commands playback directly rather than
  // through useSimpleAudioPlayer: it reads no status field, and the review
  // lane's 100 ms status interval made that subscription re-render the whole
  // screen ten times a second for the length of every prompt.
  const mockAudioPlayer = createAudioPlayerMock();
  simpleAudioService.play = mockAudioPlayer.play;
  simpleAudioService.stop = mockAudioPlayer.stop;
  simpleAudioService.preconfigureAudioSession = mockAudioPlayer.preconfigureAudioSession;
  // jest.config's resetMocks clears implementations declared in the module
  // factory before every test. Production's subscribe contract always returns
  // an unsubscribe callback; leaving this as the reset `undefined` made the
  // prompt watcher crash only after its timer settled and was the real reason
  // the automatic-audio tests had been skipped as "timing" failures.
  simpleAudioService.subscribe.mockReturnValue(jest.fn());
  simpleAudioService.getStatus.mockReturnValue({});

  // These factory implementations are reset for the same reason. An empty
  // generateStorageUrl silently short-circuits every playback path before the
  // audio-service mock is reached, which let audio assertions fail with the
  // misleading appearance that the effect never ran.
  const { audioCache } = require('@/services/audioCache');
  audioCache.getAudio.mockImplementation((url: string) => url);
  const { generateStorageUrl } = require('@/utils/storageUtils');
  generateStorageUrl.mockImplementation((bucket: string, path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `https://example.com/storage/${bucket}/${path}`;
  });

  // Mock FSRS hook
  const mockUpdateWord = jest.fn(async (..._args: unknown[]) => ({
    status: 'committed' as const,
    horizonDays: 7.5,
  }));
  const mockInvalidateQueries = jest.fn();
  useFSRS.mockReturnValue(
    createFSRSMock({
      updateWord: mockUpdateWord,
      invalidateQueries: mockInvalidateQueries,
    }),
  );

  // Mock session metrics
  const mockUpdateMetrics = jest.fn();
  useSessionMetrics.mockReturnValue(
    createSessionMetricsMock({
      updateMetrics: mockUpdateMetrics,
    }),
  );

  // Mock audio preloader
  useAudioPreloader.mockReturnValue(
    createAudioPreloaderMock({
      isPreloading: false,
    }),
  );

  // Mock timer cleanup
  const mockSetTimer = jest.fn((_name: string, callback: () => void) => {
    callback(); // Execute callback synchronously for testing
  });
  const mockClearTimer = jest.fn();
  const mockClearAllTimers = jest.fn();
  useTimerCleanup.mockReturnValue(
    createTimerCleanupMock({
      setTimer: mockSetTimer as unknown as ReturnType<typeof createTimerCleanupMock>['setTimer'],
      clearTimer: mockClearTimer,
      clearAllTimers: mockClearAllTimers,
    }),
  );

  // Mock opacity animation
  const mockFadeIn = jest.fn();
  const mockFadeOut = jest.fn();
  useOpacityAnimation.mockReturnValue(
    createOpacityAnimationMock({
      fadeIn: mockFadeIn,
      fadeOut: mockFadeOut,
    }),
  );

  return {
    mockAudioPlayer,
    mockUpdateWord,
    mockInvalidateQueries,
    mockUpdateMetrics,
    mockSetTimer,
    mockClearTimer,
    mockClearAllTimers,
    mockFadeIn,
    mockFadeOut,
  };
}

/**
 * Creates a test wrapper with QueryClient.
 * Use this instead of defining createWrapper in each test file.
 */
export function createWrapper() {
  const { createHookTestWrapper } = require('@/__tests__/helpers/hookMocks');
  const { wrapper } = createHookTestWrapper();
  return wrapper;
}
