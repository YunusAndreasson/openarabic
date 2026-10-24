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
const createAuthMockDefaults = () => ({
  user: { id: 'test-user-123', email: 'test@example.com' },
  isLoading: false,
  signIn: jest.fn(async (..._args: unknown[]) => undefined),
  signUp: jest.fn(async (..._args: unknown[]) => undefined),
  signOut: jest.fn(async (..._args: unknown[]) => undefined),
});

export const createAuthMock = (
  overrides: Partial<ReturnType<typeof createAuthMockDefaults>> = {},
) => ({
  ...createAuthMockDefaults(),
  ...overrides,
});

// ============================================================================
// AUDIO HOOKS
// ============================================================================

/**
 * Creates mock return value for useSimpleAudioPlayer hook
 */
const createAudioPlayerMockDefaults = () => ({
  play: jest.fn(async (..._args: unknown[]) => true),
  stop: jest.fn(async (..._args: unknown[]) => undefined),
  preconfigureAudioSession: jest.fn(async (..._args: unknown[]) => undefined),
  playing: false,
  currentUrl: null,
});

export const createAudioPlayerMock = (
  overrides: Partial<ReturnType<typeof createAudioPlayerMockDefaults>> = {},
) => ({
  ...createAudioPlayerMockDefaults(),
  ...overrides,
});

/**
 * Creates mock return value for useAudioPreloader hook
 */
const createAudioPreloaderMockDefaults = () => ({
  isPreloading: false,
  // The first card's audio is cached — later files may still be downloading.
  isReady: true,
  // Defaults to a miss so the play path exercises its audioCache fallback;
  // override with a path to test the preloaded fast path.
  resolveCached: jest.fn((..._args: unknown[]) => undefined),
  forgetCached: jest.fn(),
});

export const createAudioPreloaderMock = (
  overrides: Partial<ReturnType<typeof createAudioPreloaderMockDefaults>> = {},
) => ({
  ...createAudioPreloaderMockDefaults(),
  ...overrides,
});

// ============================================================================
// VOCABULARY / FSRS HOOKS
// ============================================================================

/**
 * Creates mock return value for useFSRS hook
 */
const createFSRSMockDefaults = () => ({
  currentWord: null,
  wordQueue: [],
  isLoading: false,
  isComplete: false,
  progress: 0,
  updateWord: jest.fn(async (..._args: unknown[]) => ({ status: 'committed', stability: 7.5 })),
  previewIntervals: jest.fn((..._args: unknown[]) => ({
    unknown: '1m',
    vague: '10m',
    known: '4d',
  })),
  invalidateQueries: jest.fn(),
  // Every review exit awaits this before invalidating, so it must resolve —
  // a mock missing it turns session teardown into a TypeError.
  flushPendingWrites: jest.fn(async (..._args: unknown[]) => undefined),
  resetQueue: jest.fn(),
  dueWords: [],
  totalDue: 0,
});

export const createFSRSMock = (
  overrides: Partial<ReturnType<typeof createFSRSMockDefaults>> = {},
) => ({
  ...createFSRSMockDefaults(),
  ...overrides,
});

// ============================================================================
// SESSION / REVIEW HOOKS
// ============================================================================

/**
 * Creates mock return value for useSessionMetrics hook
 */
const sessionMetricsDefaults = (metrics: Partial<SessionMetrics> = {}) => ({
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
    ...metrics,
  },
  updateMetrics: jest.fn(),
});

export const createSessionMetricsMock = (
  overrides: Partial<Omit<ReturnType<typeof sessionMetricsDefaults>, 'metrics'>> & {
    metrics?: Partial<SessionMetrics>;
  } = {},
) => {
  const { metrics, ...rest } = overrides;
  return { ...sessionMetricsDefaults(metrics), ...rest };
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Creates mock return value for useTimerCleanup hook
 */
const createTimerCleanupMockDefaults = () => ({
  setTimer: jest.fn((callback: () => void, _delay: number) => {
    callback(); // Execute immediately in tests
    return 1;
  }),
  clearTimer: jest.fn(),
  clearAllTimers: jest.fn(),
});

export const createTimerCleanupMock = (
  overrides: Partial<ReturnType<typeof createTimerCleanupMockDefaults>> = {},
) => ({
  ...createTimerCleanupMockDefaults(),
  ...overrides,
});

/**
 * Creates mock return value for useOpacityAnimation hook
 */
const createOpacityAnimationMockDefaults = () => ({
  opacity: { value: 1 },
  fadeIn: jest.fn(),
  fadeOut: jest.fn(),
});

export const createOpacityAnimationMock = (
  overrides: Partial<ReturnType<typeof createOpacityAnimationMockDefaults>> = {},
) => ({
  ...createOpacityAnimationMockDefaults(),
  ...overrides,
});

// ============================================================================
// SETUP HELPERS
// ============================================================================

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
