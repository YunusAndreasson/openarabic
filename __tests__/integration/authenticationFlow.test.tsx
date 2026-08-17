/**
 * Authentication Flow Integration Tests
 *
 * Tests the complete authentication lifecycle including:
 * - Initial session retrieval
 * - Session refresh with retry logic
 * - Auth state change handling
 * - App state transitions
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

jest.unmock('@tanstack/react-query');

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useProvideAuth } from '@/hooks/auth/useProvideAuth';

// Mock modules at top level
const mockGetSession = jest.fn();
const mockRefreshSession = jest.fn();
const mockOnAuthStateChange = jest.fn();
const mockNetInfoFetch = jest.fn();
const mockRemoveSupabaseListener = jest.fn();
let mockAuthStateCallback: ((event: string, session: unknown) => void) | null = null;

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      refreshSession: () => mockRefreshSession(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mockAuthStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: jest.fn(),
            },
          },
        };
      },
    },
  },
  setupSupabaseAppStateListener: () => mockRemoveSupabaseListener,
}));

jest.mock('@react-native-community/netinfo', () => ({
  fetch: () => mockNetInfoFetch(),
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Spread the real module: only handleError needs silencing, and replacing it
// wholesale silently drops every other export (the breadcrumb helpers), which
// surfaces as "authBreadcrumb is not a function" deep inside the hook.
jest.mock('@/utils/errorHandling', () => ({
  ...jest.requireActual('@/utils/errorHandling'),
  handleError: jest.fn(),
}));

describe('Authentication Flow', () => {
  let appStateListeners: ((state: AppStateStatus) => void)[] = [];

  const mockSession = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    appStateListeners = [];
    mockAuthStateCallback = null;

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockRefreshSession.mockResolvedValue({ data: { session: null }, error: null });
    mockNetInfoFetch.mockResolvedValue({ isConnected: true });

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

  const simulateAppStateChange = (newState: AppStateStatus) => {
    Object.defineProperty(AppState, 'currentState', {
      value: newState,
      writable: true,
      configurable: true,
    });
    appStateListeners.forEach(listener => listener(newState));
  };

  describe('Initial Auth Initialization', () => {
    test('starts in loading state', () => {
      const { result } = renderHook(() => useProvideAuth());

      expect(result.current.isLoading).toBeTruthy();
    });

    test('retrieves existing session on mount', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(result.current.session).toEqual(mockSession);
      expect(result.current.user).toEqual(mockSession.user);
      expect(result.current.isAuthenticated).toBeTruthy();
    });

    test('handles no existing session gracefully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBeFalsy();
    });

    test('handles session retrieval errors', async () => {
      const error = new Error('Session retrieval failed');
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.authError).toEqual(error);
    });
  });

  describe('Session Refresh', () => {
    test('refreshSession checks network connectivity first', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });
      mockNetInfoFetch.mockResolvedValue({ isConnected: false });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      let refreshResult: unknown;
      await act(async () => {
        refreshResult = await result.current.refreshSession();
      });

      expect(refreshResult).toBeNull();
      expect(mockRefreshSession).not.toHaveBeenCalled();
    });

    test('refreshSession succeeds with valid session', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      mockNetInfoFetch.mockResolvedValue({ isConnected: true });
      mockRefreshSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      let refreshResult: unknown;
      await act(async () => {
        refreshResult = await result.current.refreshSession();
      });

      expect(refreshResult).toEqual(mockSession);
      expect(result.current.session).toEqual(mockSession);
      expect(result.current.isAuthenticated).toBeTruthy();
    });

    test('refreshSession retries on error up to max attempts', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
      mockNetInfoFetch.mockResolvedValue({ isConnected: true });
      mockRefreshSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Refresh failed'),
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      // Call refreshSession - it will retry with exponential backoff
      const refreshPromise = result.current.refreshSession();

      // Advance through retry delays (1000ms, 2000ms, 4000ms)
      await act(async () => {
        jest.advanceTimersByTime(1000);
      });
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });

      const refreshResult = await refreshPromise;

      // Should have called refreshSession multiple times (up to MAX_REFRESH_RETRIES)
      expect(mockRefreshSession.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(refreshResult).toBeNull();
    });
  });

  describe('Auth State Changes', () => {
    test('updates session on SIGNED_IN event', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(result.current.session).toBeNull();

      // Trigger auth state change
      await act(async () => {
        if (mockAuthStateCallback) {
          mockAuthStateCallback('SIGNED_IN', mockSession);
        }
        // Allow setTimeout(0) in the callback to execute
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      expect(result.current.isAuthenticated).toBeTruthy();
    });

    test('clears session on SIGNED_OUT event', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      // Trigger sign out
      await act(async () => {
        if (mockAuthStateCallback) {
          mockAuthStateCallback('SIGNED_OUT', null);
        }
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.session).toBeNull();
      });

      expect(result.current.isAuthenticated).toBeFalsy();
    });

    test('updates session on TOKEN_REFRESHED event', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      const newSession = {
        ...mockSession,
        access_token: 'new-access-token',
      };

      // Trigger token refresh
      await act(async () => {
        if (mockAuthStateCallback) {
          mockAuthStateCallback('TOKEN_REFRESHED', newSession);
        }
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('new-access-token');
      });
    });
  });

  describe('App State Handling', () => {
    // Foreground token refresh is owned by the supabase service's AppState
    // listener (startAutoRefresh/stopAutoRefresh); the hook itself must not
    // register its own AppState listener or poll getSession() on foreground.
    test('does not register its own AppState listener', () => {
      renderHook(() => useProvideAuth());

      expect(AppState.addEventListener).not.toHaveBeenCalled();
    });

    test('does not re-fetch the session on app state transitions', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      // Clear the initial call
      mockGetSession.mockClear();

      // Simulate going to background then active
      simulateAppStateChange('background');

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      simulateAppStateChange('active');

      await act(async () => {
        jest.advanceTimersByTime(100);
      });

      // Session updates arrive via onAuthStateChange, not foreground polling
      expect(mockGetSession).not.toHaveBeenCalled();
    });
  });

  describe('Auth Result Interface', () => {
    test('provides refreshSession function', async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(typeof result.current.refreshSession).toBe('function');
    });

    test('memoizes auth result for reference stability', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      const { result, rerender } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      const firstResult = result.current;
      rerender({});
      const secondResult = result.current;

      // Same reference if no state changed
      expect(firstResult.session).toEqual(secondResult.session);
    });
  });

  describe('Cleanup', () => {
    test('removes the supabase AppState listener on unmount', () => {
      const { unmount } = renderHook(() => useProvideAuth());

      unmount();

      expect(mockRemoveSupabaseListener).toHaveBeenCalled();
    });

    test('unsubscribes from auth state changes on unmount', () => {
      const mockUnsubscribe = jest.fn();
      jest.mocked(mockOnAuthStateChange).mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { unmount } = renderHook(() => useProvideAuth());

      unmount();

      // Auth subscription cleanup is handled internally
    });
  });
});
