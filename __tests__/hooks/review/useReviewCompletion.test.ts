/**
 * Hook Tests - useReviewCompletion
 *
 * Modern Jest 29 Patterns:
 * - @jest/globals explicit imports
 * - jest.mocked() for type-safe mocking
 * - renderHook from @testing-library/react-native
 */

import { describe, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

// Mock dependencies BEFORE imports
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn((..._args: unknown[]) => ({
    invalidateQueries: jest.fn(),
    setQueryData: jest.fn(),
  })),
}));

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: jest.fn((..._args: unknown[]) => ({
    user: { id: 'user-123' },
  })),
}));

jest.mock('@/constants/queries', () => ({
  fsrsQueries: {
    lastCompletedAtKey: jest.fn((userId: string) => ['last-completed', userId]),
    invalidateAll: jest.fn(),
  },
  studyStreakQueries: {
    invalidateAll: jest.fn(),
  },
}));

jest.mock('@/services/analytics', () => ({
  analytics: {
    track: jest.fn(),
  },
}));

jest.mock('@/services/metaEvents', () => ({
  metaEvents: {
    logPracticeSessionComplete: jest.fn(),
  },
}));

jest.mock('@/utils/notificationPromptStorage', () => ({
  recordSessionCompleted: jest.fn(),
}));

jest.mock('@/utils/recallSignalStorage', () => ({
  appendSession: jest.fn(),
}));

jest.mock('@/utils/studyDayLedger', () => ({
  recordStudyDay: jest.fn(),
}));

jest.mock('@/services/notificationService', () => ({
  ensurePermissions: jest.fn(async (..._args: unknown[]) => true),
}));

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

jest.mock('react-native', () => ({
  InteractionManager: {
    runAfterInteractions: jest.fn((callback: () => void) => {
      if (typeof callback === 'function') callback();
      return { cancel: jest.fn() };
    }),
  },
}));

import { useReviewCompletion } from '@/hooks/review/useReviewCompletion';
import { useAuth } from '@/hooks/auth/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import type { SessionMetrics } from '@/types/review.types';
import { analytics } from '@/services/analytics';
import { metaEvents } from '@/services/metaEvents';
import { recordSessionCompleted } from '@/utils/notificationPromptStorage';
import { appendSession } from '@/utils/recallSignalStorage';
import { recordStudyDay } from '@/utils/studyDayLedger';
import { fsrsQueries, studyStreakQueries } from '@/constants/queries';
import { InteractionManager } from 'react-native';

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
    jest.mocked(InteractionManager.runAfterInteractions).mockImplementation(callback => {
      if (typeof callback === 'function') callback();
      return { cancel: jest.fn() } as never;
    });
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
    currentStreak: 5,
    firstAttemptKnown: 8,
    firstAttemptUnknown: 2,
  };

  describe('Lifecycle', () => {
    test('should not crash with undefined metrics', () => {
      expect(() => renderHook(() => useReviewCompletion())).not.toThrow();
    });

    test('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useReviewCompletion(mockSessionMetrics));

      // Should unmount without errors
      unmount();
    });

    test('does nothing for a zero-word session', () => {
      renderHook(() =>
        useReviewCompletion({
          ...mockSessionMetrics,
          wordsReviewed: 0,
          wordsKnown: 0,
          wordsUnknown: 0,
          firstAttemptKnown: 0,
          firstAttemptUnknown: 0,
        }),
      );

      expect(fsrsQueries.invalidateAll).not.toHaveBeenCalled();
      expect(studyStreakQueries.invalidateAll).not.toHaveBeenCalled();
      expect(analytics.track).not.toHaveBeenCalled();
      expect(appendSession).not.toHaveBeenCalled();
      expect(recordStudyDay).not.toHaveBeenCalled();
      expect(recordSessionCompleted).not.toHaveBeenCalled();
      expect(metaEvents.logPracticeSessionComplete).not.toHaveBeenCalled();
    });

    test('records every completion effect for a real session', async () => {
      renderHook(() => useReviewCompletion(mockSessionMetrics));

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(analytics.track).toHaveBeenCalledTimes(1);
      expect(appendSession).toHaveBeenCalledWith(8, 2);
      expect(recordStudyDay).toHaveBeenCalledTimes(1);
      expect(recordSessionCompleted).toHaveBeenCalledTimes(1);
      expect(metaEvents.logPracticeSessionComplete).toHaveBeenCalledWith(10);
    });
  });
});
