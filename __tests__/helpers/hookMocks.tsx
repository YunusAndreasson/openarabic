/**
 * Centralized Hook Mock Factories
 *
 * Provides reusable mock definitions for React hooks used across the codebase.
 * These reduce boilerplate and ensure consistent mock behavior across tests.
 *
 * Usage:
 * ```typescript
 * import { createAuthMock, createFSRSMock, createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
 *
 * // In test setup
 * const { useAuth } = require('@/hooks/auth');
 * useAuth.mockReturnValue(createAuthMock());
 *
 * // For renderHook tests
 * const { wrapper, queryClient } = createHookTestWrapper();
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 * ```
 */

import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { Provider } from 'react-redux';

import type { SessionMetrics } from '@/types/review.types';
import type { StudyWord } from '@/types/vocabulary.types';

import { createTestQueryClient } from './testUtils';
import { setupTestStore, type TestRootState } from './testStore';

// ============================================================================
// AUTH HOOKS
// ============================================================================

/**
 * Creates mock return value for useAuth hook
 */
export const createAuthMock = (
  overrides: Partial<{
    user: { id: string; email?: string } | null;
    isLoading: boolean;
    signIn: jest.Mock;
    signUp: jest.Mock;
    signOut: jest.Mock;
    refreshSession: jest.Mock;
  }> = {},
) => ({
  user: { id: 'test-user-123', email: 'test@example.com' },
  isLoading: false,
  signIn: jest.fn().mockResolvedValue(undefined),
  signUp: jest.fn().mockResolvedValue(undefined),
  signOut: jest.fn().mockResolvedValue(undefined),
  refreshSession: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

// ============================================================================
// AUDIO HOOKS
// ============================================================================

/**
 * Creates mock return value for useSimpleAudioPlayer hook
 */
export const createAudioPlayerMock = (
  overrides: Partial<{
    play: jest.Mock;
    stop: jest.Mock;
    preconfigureAudioSession: jest.Mock;
    playing: boolean;
    currentUrl: string | null;
  }> = {},
) => ({
  play: jest.fn().mockResolvedValue(true),
  stop: jest.fn().mockResolvedValue(undefined),
  preconfigureAudioSession: jest.fn().mockResolvedValue(undefined),
  playing: false,
  currentUrl: null,
  ...overrides,
});

/**
 * Creates mock return value for useAudioPreloader hook
 */
export const createAudioPreloaderMock = (
  overrides: Partial<{
    isPreloading: boolean;
    progress: number;
    isComplete: boolean;
  }> = {},
) => ({
  isPreloading: false,
  progress: 100,
  isComplete: true,
  ...overrides,
});

// ============================================================================
// VOCABULARY / FSRS HOOKS
// ============================================================================

/**
 * Creates mock return value for useFSRS hook
 */
export const createFSRSMock = (
  overrides: Partial<{
    currentWord: StudyWord | null;
    wordQueue: StudyWord[];
    isLoading: boolean;
    isComplete: boolean;
    progress: number;
    updateWord: jest.Mock;
    invalidateQueries: jest.Mock;
    dueWords: StudyWord[];
    totalDue: number;
  }> = {},
) => ({
  currentWord: null,
  wordQueue: [],
  isLoading: false,
  isComplete: false,
  progress: 0,
  updateWord: jest.fn().mockResolvedValue(7.5), // Returns new stability
  previewIntervals: jest.fn(() => ({ unknown: '1m', vague: '10m', known: '4d' })),
  invalidateQueries: jest.fn(),
  dueWords: [],
  totalDue: 0,
  ...overrides,
});

// ============================================================================
// SESSION / REVIEW HOOKS
// ============================================================================

/**
 * Creates mock return value for useSessionMetrics hook
 */
export const createSessionMetricsMock = (
  overrides: Partial<{
    metrics: Partial<SessionMetrics>;
    updateMetrics: jest.Mock;
    resetMetrics: jest.Mock;
  }> = {},
) => ({
  metrics: {
    wordsReviewed: 0,
    wordsKnown: 0,
    wordsVague: 0,
    wordsUnknown: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageStabilityIncrease: 0,
    masteredWords: 0,
    startTime: Date.now(),
    ...overrides.metrics,
  },
  updateMetrics: jest.fn(),
  resetMetrics: jest.fn(),
  ...overrides,
});

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Creates mock return value for useTimerCleanup hook
 */
export const createTimerCleanupMock = (
  overrides: Partial<{
    setTimer: jest.Mock;
    clearTimer: jest.Mock;
    clearAllTimers: jest.Mock;
  }> = {},
) => ({
  setTimer: jest.fn((callback: () => void, _delay: number) => {
    callback(); // Execute immediately in tests
    return 1;
  }),
  clearTimer: jest.fn(),
  clearAllTimers: jest.fn(),
  ...overrides,
});

/**
 * Creates mock return value for useOpacityAnimation hook
 */
export const createOpacityAnimationMock = (
  overrides: Partial<{
    opacity: { value: number };
    fadeIn: jest.Mock;
    fadeOut: jest.Mock;
  }> = {},
) => ({
  opacity: { value: 1 },
  fadeIn: jest.fn(),
  fadeOut: jest.fn(),
  ...overrides,
});

// ============================================================================
// SETUP HELPERS
// ============================================================================

/**
 * Creates InteractionManager mock that executes callbacks immediately
 */
export const setupInteractionManagerMock = () => {
  const { InteractionManager } = require('react-native');
  jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(callback => {
    Promise.resolve().then(callback);
    return { cancel: jest.fn() };
  });
};

// ============================================================================
// TEST WRAPPERS
// ============================================================================

/**
 * Creates a reusable wrapper for renderHook tests with QueryClient and optional Redux
 *
 * @example
 * // Basic usage (QueryClient only)
 * const { wrapper, queryClient } = createHookTestWrapper();
 * const { result } = renderHook(() => useMyHook(), { wrapper });
 *
 * @example
 * // With Redux store
 * const { wrapper } = createHookTestWrapper({ withRedux: true });
 *
 * @example
 * // With preloaded Redux state
 * const { wrapper } = createHookTestWrapper({
 *   withRedux: true,
 *   preloadedState: { theme: { mode: 'dark' } }
 * });
 */
export function createHookTestWrapper(options?: {
  withRedux?: boolean;
  preloadedState?: Partial<TestRootState>;
}) {
  const queryClient = createTestQueryClient();

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const content = <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

    if (options?.withRedux) {
      return <Provider store={setupTestStore(options.preloadedState)}>{content}</Provider>;
    }
    return content;
  };

  return { wrapper, queryClient };
}
