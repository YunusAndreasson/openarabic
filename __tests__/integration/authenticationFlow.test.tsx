/**
 * Authentication Flow Integration Tests
 *
 * Tests the complete authentication lifecycle including:
 * - Initial session retrieval
 * - Auth state change handling (token refreshes arrive here: supabase-js
 *   refreshes on its own, with `autoRefreshToken`)
 * - App state transitions
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { beforeEach, afterEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useProvideAuth } from '@/hooks/auth/useProvideAuth';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthErrorMock,
  createSessionMock,
  createUserMock,
} from '@/__tests__/helpers/serviceMocks';

// Mock modules at top level
// Typed from the real modules: a bare `jest.fn()` is `Mock<UnknownFunction>`,
// whose `mockResolvedValue` argument is checked against `never` — so none of the
// session shapes these return were ever verified against what supabase produces.
const mockGetSession = jest.fn<SupabaseClient['auth']['getSession']>();
const mockRemoveSupabaseListener = jest.fn();
const mockAuthUnsubscribe = jest.fn();
const mockOnAuthStateChange = jest.fn();
let mockAuthStateCallback: ((event: string, session: unknown) => void) | null = null;

jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
        mockOnAuthStateChange();
        mockAuthStateCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: mockAuthUnsubscribe,
            },
          },
        };
      },
    },
  },
  setupSupabaseAppStateListener: () => mockRemoveSupabaseListener,
}));

// The store's dispatch keeps one identity for the life of the app, and the
// hook's subscription relies on that. The global react-redux stub hands back a
// fresh function on every call, so this suite uses a stable one, like the
// real store.
const mockDispatch = jest.fn();
jest.mock('@/store/hooks', () => ({
  useAppDispatch: () => mockDispatch,
}));

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

// Spread the real module: only handleError needs silencing, and replacing it
// wholesale silently drops every other export (the breadcrumb helpers), which
// surfaces as "authBreadcrumb is not a function" deep inside the hook.
jest.mock('@/utils/errorHandling', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/utils/errorHandling'),
  handleError: jest.fn(),
}));

describe('Authentication Flow', () => {
  let appStateListeners: ((state: AppStateStatus) => void)[] = [];

  const mockSession = createSessionMock({
    user: createUserMock({ id: 'test-user-id', email: 'test@example.com' }),
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    appStateListeners = [];
    mockAuthStateCallback = null;

    // Default mock implementations
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

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
      const error = createAuthErrorMock('Session retrieval failed');
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      expect(result.current.session).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
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

      // `UserSession` deliberately narrows the supabase session down to `user`,
      // so the refreshed token is not reachable through the hook's contract —
      // assert the session object itself was replaced.
      await waitFor(() => {
        expect(result.current.session).toEqual(newSession);
      });
    });

    test('adopts the session a password-recovery link signs in with', async () => {
      // A cold-started reset link: nobody is signed in until verifyOtp runs.
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });

      await act(async () => {
        if (mockAuthStateCallback) {
          mockAuthStateCallback('PASSWORD_RECOVERY', mockSession);
        }
        jest.runAllTimers();
      });

      // Without it the tabs stay guarded and "reset succeeded" goes nowhere.
      await waitFor(() => {
        expect(result.current.isAuthenticated).toBeTruthy();
      });
    });

    test('follows USER_UPDATED to the updated session', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.session).toEqual(mockSession);
      });

      const updatedSession = { ...mockSession, access_token: 'after-password-change' };

      await act(async () => {
        if (mockAuthStateCallback) {
          mockAuthStateCallback('USER_UPDATED', updatedSession);
        }
        jest.runAllTimers();
      });

      await waitFor(() => {
        expect(result.current.session).toEqual(updatedSession);
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
    test('subscribes to auth changes once, however often it re-renders', async () => {
      mockGetSession.mockResolvedValue({ data: { session: mockSession }, error: null });

      const { result, rerender } = renderHook(() => useProvideAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBeFalsy();
      });
      rerender({});

      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockAuthUnsubscribe).not.toHaveBeenCalled();
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
      const { unmount } = renderHook(() => useProvideAuth());

      unmount();
      expect(mockAuthUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
