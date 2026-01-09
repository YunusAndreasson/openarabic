/**
 * Hook Tests - useReviewCompletion
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

// Mock dependencies BEFORE imports
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-123' },
  })),
}));

jest.mock('@/constants/queries', () => ({
  studyStreakQueries: {
    invalidateAll: jest.fn(),
  },
}));

jest.mock('@/services/analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

jest.mock('@/utils/haptics', () => ({
  successFeedback: jest.fn(),
}));

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback: () => void) => {
      callback();
      return { cancel: jest.fn() };
    }),
  },
}));

import { useReviewCompletion } from '@/hooks/review/useReviewCompletion';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionMetrics } from '@/hooks/review/useSessionMetrics';

const mockUseAuth = jest.mocked(useAuth);
const mockUseQueryClient = jest.mocked(useQueryClient);

describe('useReviewCompletion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset mocks after clearAllMocks
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } } as never);
    mockUseQueryClient.mockReturnValue({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
    } as never);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const mockSessionMetrics: SessionMetrics = {
    wordsReviewed: 10,
    wordsKnown: 8,
    wordsUnknown: 2,
    masteredWords: 2,
    averageStabilityIncrease: 1.5,
    longestStreak: 5,
    startTime: Date.now() - 60000,
    sessionDuration: 60,
    successRate: 80,
    wordsPerMinute: 0.167,
    responseTimeAverage: 3000,
    difficultyBreakdown: {
      easy: 4,
      medium: 4,
      hard: 2,
    },
    stabilityBreakdown: {
      new: 2,
      learning: 3,
      review: 5,
    },
    newCardsStudied: 2,
    reviewCardsStudied: 8,
    cardsCrossedThreshold: 1,
  };

  describe('Initial state', () => {
    test('should return completion functions', () => {
      const { result } = renderHook(() => useReviewCompletion(mockSessionMetrics, false));

      expect(result.current).toHaveProperty('invalidateReviewQueries');
      expect(result.current).toHaveProperty('trackCompletion');
    });

    test('should not crash with undefined metrics', () => {
      const { result } = renderHook(() => useReviewCompletion(undefined, false));
      expect(result.current).toBeDefined();
    });
  });

  describe('Return value structure', () => {
    test('should return functions', () => {
      const { result } = renderHook(() => useReviewCompletion(mockSessionMetrics, false));
      expect(typeof result.current.invalidateReviewQueries).toBe('function');
      expect(typeof result.current.trackCompletion).toBe('function');
    });
  });

  describe('Cleanup', () => {
    test('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useReviewCompletion(mockSessionMetrics, false));

      // Should unmount without errors
      unmount();
    });
  });
});
