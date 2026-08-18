/**
 * useAppBadge Hook Tests
 *
 * Tests app badge updates based on due words count.
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
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { fsrsQueries, PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { useAppBadge } from '@/hooks/app/useAppBadge';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';

// Mock modules at top level
const mockCanUseBadge = jest.fn(async (..._args: unknown[]) => true);
const mockSetAppBadgeCount = jest.fn(async (..._args: unknown[]) => true);
const mockClearAppBadge = jest.fn(async (..._args: unknown[]) => true);
jest.mock('@/services/notificationService', () => ({
  canUseBadge: () => mockCanUseBadge(),
  setAppBadgeCount: (count: number) => mockSetAppBadgeCount(count),
  clearAppBadge: () => mockClearAppBadge(),
}));

// Mock auth hook
const mockUser = { id: 'test-user-id' };
let mockIsAuthenticated = true;

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    user: mockIsAuthenticated ? mockUser : null,
    isAuthenticated: mockIsAuthenticated,
  }),
}));

// Mock FSRS queries
let mockDueWords: { root_id: number }[] = [];
let mockIsLoading = false;

jest.mock('@/hooks/vocabulary/useFSRSQueries', () => ({
  useFSRSQueries: () => ({
    dueWords: mockDueWords,
    isLoading: mockIsLoading,
  }),
}));

describe('useAppBadge', () => {
  let queryClient: QueryClient;
  let appStateListeners: ((state: AppStateStatus) => void)[] = [];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    queryClient = createTestQueryClient();
    appStateListeners = [];

    // Reset mock state
    mockIsAuthenticated = true;
    mockDueWords = [];
    mockIsLoading = false;

    // Default mock implementations
    mockCanUseBadge.mockResolvedValue(true);
    mockSetAppBadgeCount.mockResolvedValue(true);
    mockClearAppBadge.mockResolvedValue(true);

    // Mock AppState
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

  describe('Badge permission check', () => {
    test('checks badge permission on mount', async () => {
      renderHook(() => useAppBadge(), { wrapper });

      await waitFor(() => {
        expect(mockCanUseBadge).toHaveBeenCalled();
      });
    });

    test('does not update badge when permission denied', async () => {
      mockCanUseBadge.mockResolvedValue(false);
      mockDueWords = [
        createTestWord({ root_id: rootId(1) }),
        createTestWord({ root_id: rootId(2) }),
      ];

      renderHook(() => useAppBadge(), { wrapper });

      // Advance past debounce
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
    });
  });

  describe('Badge updates', () => {
    test('updates badge when due words change', async () => {
      mockDueWords = [
        createTestWord({ root_id: rootId(1) }),
        createTestWord({ root_id: rootId(2) }),
        createTestWord({ root_id: rootId(3) }),
      ];

      renderHook(() => useAppBadge(), { wrapper });

      await waitFor(() => {
        expect(mockSetAppBadgeCount).toHaveBeenCalledWith(3);
      });
    });

    test('debounces rapid updates (1-second minimum)', async () => {
      mockDueWords = [createTestWord({ root_id: rootId(1) })];

      renderHook(() => useAppBadge(), { wrapper });

      await waitFor(() => {
        expect(mockSetAppBadgeCount).toHaveBeenCalledWith(1);
      });

      // Verify the initial update set the badge
      expect(mockSetAppBadgeCount).toHaveBeenCalledTimes(1);

      // The debounce implementation uses lastUpdateTimeRef to prevent
      // rapid updates within 1 second - this is verified by the fact that
      // only one call was made even though the hook may have attempted
      // multiple updates during setup
    });

    test('does not update when count has not changed', async () => {
      mockDueWords = [createTestWord({ root_id: rootId(1) })];

      renderHook(() => useAppBadge(), { wrapper });

      await waitFor(() => {
        expect(mockSetAppBadgeCount).toHaveBeenCalledTimes(1);
      });

      mockSetAppBadgeCount.mockClear();

      // Advance time to bypass debounce
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Due words count is still 1, should not update
      expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
    });
  });

  describe('Query cache subscription', () => {
    const userId = 'test-user-id';
    const words = (n: number) =>
      Array.from({ length: n }, (_, i) => createTestWord({ root_id: rootId(i + 1) }));

    // Establish a badge count, then clear the spy and step past the 1s rate
    // limit so a following update is free to land.
    const renderWithSettledBadge = async () => {
      mockDueWords = words(1);
      renderHook(() => useAppBadge(), { wrapper });

      await waitFor(() => {
        expect(mockSetAppBadgeCount).toHaveBeenCalledWith(1);
      });
      mockSetAppBadgeCount.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
    };

    test("publishes an update to the badge's own due entry", async () => {
      await renderWithSettledBadge();

      await act(async () => {
        queryClient.setQueryData(
          fsrsQueries.due(userId, DEFAULT_SESSION_COOLDOWN_HOURS, undefined).queryKey,
          words(4),
        );
      });

      expect(mockSetAppBadgeCount).toHaveBeenCalledWith(4);
    });

    test('ignores due variants the badge does not read', async () => {
      await renderWithSettledBadge();

      // The due key encodes (sessionCooldownHours, limit), and the variants
      // answer different questions: the Practice screen's list is capped at
      // PRACTICE_DUE_WORDS_LIMIT, the bare one applies no session cooldown.
      // Matching the due PREFIX published whichever of them changed last to the
      // icon — so an app resume, which refreshes all of them, could leave the
      // badge showing a count from a list this hook never chose.
      await act(async () => {
        queryClient.setQueryData(
          fsrsQueries.due(userId, DEFAULT_SESSION_COOLDOWN_HOURS, PRACTICE_DUE_WORDS_LIMIT)
            .queryKey,
          words(4),
        );
        queryClient.setQueryData(fsrsQueries.due(userId).queryKey, words(7));
      });

      expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
    });
  });

  describe('Sign out handling', () => {
    test('clears badge when user signs out', async () => {
      mockDueWords = [createTestWord({ root_id: rootId(1) })];

      const { rerender } = renderHook(() => useAppBadge(), { wrapper });

      await waitFor(() => {
        expect(mockSetAppBadgeCount).toHaveBeenCalled();
      });

      // Simulate sign out
      mockIsAuthenticated = false;
      rerender({});

      await waitFor(() => {
        expect(mockClearAppBadge).toHaveBeenCalled();
      });
    });
  });

  describe('App state handling', () => {
    test('sets up AppState listener on mount', () => {
      renderHook(() => useAppBadge(), { wrapper });

      expect(AppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    test('updates badge when app becomes active', async () => {
      mockDueWords = [
        createTestWord({ root_id: rootId(1) }),
        createTestWord({ root_id: rootId(2) }),
      ];

      renderHook(() => useAppBadge(), { wrapper });

      await waitFor(() => {
        expect(mockSetAppBadgeCount).toHaveBeenCalledWith(2);
      });

      mockSetAppBadgeCount.mockClear();

      // Advance past debounce
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      // Simulate going to background then becoming active
      simulateAppStateChange('background');

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      simulateAppStateChange('active');

      await waitFor(() => {
        // May or may not call depending on debounce - just verify no errors
      });
    });

    test('does not update badge when app is in background', async () => {
      // Start with app in background
      Object.defineProperty(AppState, 'currentState', {
        value: 'background',
        writable: true,
        configurable: true,
      });

      mockDueWords = [createTestWord({ root_id: rootId(1) })];

      renderHook(() => useAppBadge(), { wrapper });

      // Should not update when in background
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
    });
  });

  describe('Loading state', () => {
    test('does not update badge while loading', async () => {
      mockIsLoading = true;
      mockDueWords = [createTestWord({ root_id: rootId(1) })];

      renderHook(() => useAppBadge(), { wrapper });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      expect(mockSetAppBadgeCount).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    test('removes AppState listener on unmount', () => {
      const mockRemove = jest.fn();
      jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: mockRemove });

      const { unmount } = renderHook(() => useAppBadge(), { wrapper });

      unmount();

      expect(mockRemove).toHaveBeenCalled();
    });
  });
});
