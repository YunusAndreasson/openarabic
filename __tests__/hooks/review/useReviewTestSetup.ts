/**
 * Shared Test Setup for useReview Hook Tests
 *
 * Centralizes the beforeEach setup logic used across:
 * - useReview.test.tsx
 * - useReview.session.test.tsx
 * - useReview.swipe.test.tsx
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
  setupInteractionManagerMock,
} from '@/__tests__/helpers/hookMocks';

// Re-export for convenience
export {
  createAuthMock,
  createAudioPlayerMock,
  createFSRSMock,
  createSessionMetricsMock,
  createAudioPreloaderMock,
  createTimerCleanupMock,
  createOpacityAnimationMock,
  setupInteractionManagerMock,
};

import type { StudyWord } from '@/types/vocabulary.types';

/**
 * Creates a mock StudyWord for useReview tests.
 * Includes root data needed for word display.
 */
export const createMockWord = (overrides: Partial<StudyWord> = {}): StudyWord => ({
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

// Re-export wrapper creator
export { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';

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
 * Sets up all mock return values for useReview hook tests.
 * Call this in beforeEach after jest.clearAllMocks().
 *
 * @returns Object containing all mock references for assertions
 */
export function setupUseReviewMocks(): UseReviewMockRefs {
  // Get mocked hooks via require (they're already mocked via jest.mock in test file)
  const { useAuth } = require('@/hooks/auth');
  const { useFSRS } = require('@/hooks/vocabulary');
  const { useSimpleAudioPlayer } = require('@/hooks/audio/useSimpleAudioPlayer');
  const { useSessionMetrics } = require('@/hooks/review/useSessionMetrics');
  const { useAudioPreloader } = require('@/hooks/review/useAudioPreloader');
  const { useTimerCleanup } = require('@/hooks/utils/useTimerCleanup');
  const { useOpacityAnimation } = require('@/hooks/animations/useOpacityAnimation');

  // Setup InteractionManager mock
  setupInteractionManagerMock();

  // Mock auth
  useAuth.mockReturnValue(createAuthMock());

  // Mock audio player
  const mockAudioPlayer = createAudioPlayerMock();
  useSimpleAudioPlayer.mockReturnValue(mockAudioPlayer);

  // Mock FSRS hook
  const mockUpdateWord = jest.fn().mockResolvedValue(7.5);
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
      progress: 100,
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
      setTimer: mockSetTimer,
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
