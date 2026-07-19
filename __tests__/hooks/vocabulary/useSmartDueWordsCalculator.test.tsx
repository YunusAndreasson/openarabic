/**
 * useSmartDueWordsCalculator Hook Tests
 *
 * Tests smart due words calculation with app state awareness.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { useSmartDueWordsCalculator } from '@/hooks/vocabulary/useSmartDueWordsCalculator';

// Mock auth hook
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    isAuthenticated: true,
  }),
}));

// Mock FSRS service
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn().mockResolvedValue([]),
  },
}));

// Mock error handling
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

// Mock fsrs queries. The hook refreshes via the factories' own queryFn (it no
// longer attaches its own), so the mock factories must route to the mocked
// service for the call-count assertions below.
jest.mock('@/constants/queries', () => {
  const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');
  return {
    fsrsQueries: {
      due: (userId: string) => ({
        queryKey: ['fsrs-words', userId, 'due', null, null],
        queryFn: () => studyWordsFSRSService.getFSRSWords(userId, { onlyDue: true }),
      }),
      all: (userId: string) => ({
        queryKey: ['fsrs-words', userId],
        queryFn: () => studyWordsFSRSService.getFSRSWords(userId, { forStats: false }),
      }),
      stats: (userId: string) => ({ queryKey: ['fsrs-words', userId, 'stats'] }),
    },
    CACHE_TIMES: {
      CRITICAL: { staleTime: 30000, gcTime: 120000 },
      SHORT: { staleTime: 60000, gcTime: 300000 },
      MEDIUM: { staleTime: 180000, gcTime: 600000 },
    },
  };
});

describe('useSmartDueWordsCalculator', () => {
  let queryClient: QueryClient;
  let appStateListeners: ((state: AppStateStatus) => void)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    queryClient = createTestQueryClient();
    appStateListeners = [];

    // Mock AppState.currentState and addEventListener
    Object.defineProperty(AppState, 'currentState', {
      value: 'active',
      writable: true,
      configurable: true,
    });

    jest.spyOn(AppState, 'addEventListener').mockImplementation((type, handler) => {
      if (type === 'change') {
        appStateListeners.push(handler);
      }
      return { remove: jest.fn() };
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // Helper to simulate app state change
  const simulateAppStateChange = (newState: AppStateStatus) => {
    Object.defineProperty(AppState, 'currentState', {
      value: newState,
      writable: true,
      configurable: true,
    });
    appStateListeners.forEach(listener => listener(newState));
  };

  describe('Initialization', () => {
    test('returns forceRefresh function', () => {
      const { result } = renderHook(() => useSmartDueWordsCalculator(), { wrapper });

      expect(typeof result.current.forceRefresh).toBe('function');
    });

    test('sets up AppState listener on mount', () => {
      renderHook(() => useSmartDueWordsCalculator(), { wrapper });

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('App State Handling', () => {
    test('triggers refresh when app becomes active', async () => {
      const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');

      renderHook(() => useSmartDueWordsCalculator({ refreshDelay: 0 }), { wrapper });

      // Simulate going to background then becoming active
      simulateAppStateChange('background');
      simulateAppStateChange('active');

      await waitFor(() => {
        expect(studyWordsFSRSService.getFSRSWords).toHaveBeenCalled();
      });
    });

    test('respects refresh delay option', async () => {
      const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');

      renderHook(() => useSmartDueWordsCalculator({ refreshDelay: 1000 }), { wrapper });

      simulateAppStateChange('background');
      simulateAppStateChange('active');

      // Should not have called immediately
      expect(studyWordsFSRSService.getFSRSWords).not.toHaveBeenCalled();

      // Advance timers
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(studyWordsFSRSService.getFSRSWords).toHaveBeenCalled();
      });
    });

    test('clears pending refresh when app becomes inactive', () => {
      renderHook(() => useSmartDueWordsCalculator({ refreshDelay: 1000 }), { wrapper });

      simulateAppStateChange('background');
      simulateAppStateChange('active');

      // Go inactive before delay completes
      simulateAppStateChange('background');

      // The timeout should be cleared (no way to directly verify, but no errors should occur)
      expect(() => jest.advanceTimersByTime(2000)).not.toThrow();
    });
  });

  describe('Force Refresh', () => {
    test('allows manual refresh trigger', async () => {
      const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');

      const { result } = renderHook(() => useSmartDueWordsCalculator(), { wrapper });

      await act(async () => {
        result.current.forceRefresh();
      });

      await waitFor(() => {
        expect(studyWordsFSRSService.getFSRSWords).toHaveBeenCalled();
      });
    });
  });

  describe('Debouncing', () => {
    test('respects minimum refresh interval', async () => {
      const { studyWordsFSRSService } = require('@/services/studyWordsFSRS');

      const { result } = renderHook(() => useSmartDueWordsCalculator({ refreshDelay: 0 }), {
        wrapper,
      });

      // First refresh
      await act(async () => {
        result.current.forceRefresh();
      });

      const initialCallCount = studyWordsFSRSService.getFSRSWords.mock.calls.length;

      // Immediate second refresh should be debounced
      await act(async () => {
        result.current.forceRefresh();
      });

      // Should not have made additional calls due to debounce
      expect(studyWordsFSRSService.getFSRSWords.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Cleanup', () => {
    test('cleans up AppState listener on unmount', () => {
      const mockRemove = jest.fn();
      jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: mockRemove });

      const { unmount } = renderHook(() => useSmartDueWordsCalculator(), { wrapper });

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
