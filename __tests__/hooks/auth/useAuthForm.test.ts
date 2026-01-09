/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { PASSWORD_REQUIREMENTS, useAuthForm } from '@/hooks/auth/useAuthForm';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

// Mock router
jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      startAutoRefresh: jest.fn(),
      resetPasswordForEmail: jest.fn(),
    },
  },
}));

// Mock error handling utilities
jest.mock('@/utils/errorHandling', () => ({
  showSuccessToast: jest.fn(),
  handleError: jest.fn(),
}));

// Mock haptics
jest.mock('@/utils/haptics', () => ({
  successFeedback: jest.fn(),
}));

// Mock analytics
jest.mock('@/services/analytics', () => ({
  analytics: {
    identify: jest.fn().mockResolvedValue(undefined),
    trackSignUp: jest.fn().mockResolvedValue(undefined),
    trackSignIn: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
}));

describe('useAuthForm', () => {
  // Get references to mocked functions
  let mockRouterReplace: jest.Mock;
  let mockSignInWithPassword: jest.Mock;
  let mockSignUp: jest.Mock;
  let mockShowSuccessToast: jest.Mock;
  let mockHandleError: jest.Mock;
  let mockSuccessFeedback: jest.Mock;
  let mockAnalyticsIdentify: jest.Mock;
  let mockAnalyticsTrackSignUp: jest.Mock;
  let mockAnalyticsTrackSignIn: jest.Mock;

  beforeEach(() => {
    // Get references to the mocked functions
    const router = require('expo-router');
    mockRouterReplace = router.router.replace as jest.Mock;

    const { supabase } = require('@/services/supabase');
    mockSignInWithPassword = supabase.auth.signInWithPassword as jest.Mock;
    mockSignUp = supabase.auth.signUp as jest.Mock;

    const errorHandling = require('@/utils/errorHandling');
    mockShowSuccessToast = errorHandling.showSuccessToast as jest.Mock;
    mockHandleError = errorHandling.handleError as jest.Mock;

    const haptics = require('@/utils/haptics');
    mockSuccessFeedback = haptics.successFeedback as jest.Mock;

    const analytics = require('@/services/analytics');
    mockAnalyticsIdentify = analytics.analytics.identify as jest.Mock;
    mockAnalyticsTrackSignUp = analytics.analytics.trackSignUp as jest.Mock;
    mockAnalyticsTrackSignIn = analytics.analytics.trackSignIn as jest.Mock;

    // Clear all mock calls and timers before each test
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Set default mock implementations
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com' }, session: { access_token: 'token' } },
      error: null,
    });
    mockSignUp.mockResolvedValue({
      data: { user: { id: '1', email: 'test@example.com' }, session: null },
      error: null,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('validates email correctly', () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.validateEmail('bad');
    });
    expect(result.current.emailError).toBe('Enter a valid email');

    act(() => {
      result.current.validateEmail('good@example.com');
    });
    expect(result.current.emailError).toBe('');
  });

  test('validates password correctly', () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.validatePassword('short');
    });
    expect(result.current.passwordError).toContain(`${PASSWORD_REQUIREMENTS.minLength}`);

    act(() => {
      result.current.validatePassword('Password1');
    });
    expect(result.current.passwordError).toBe('');
  });

  test('toggles registration mode', () => {
    const { result } = renderHook(() => useAuthForm());

    expect(result.current.isRegistering).toBeTruthy();
    act(() => {
      result.current.toggleMode();
    });
    expect(result.current.isRegistering).toBeFalsy();
  });

  test('calls supabase on sign in', async () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => {
      result.current.setEmail('user@example.com');
      result.current.setPassword('Password1');
    });

    await act(async () => {
      await result.current.signInWithEmail();
    });

    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'Password1',
    });
  });

  describe('signUpWithEmail', () => {
    describe('with immediate session (email confirmation disabled)', () => {
      beforeEach(() => {
        // Mock Supabase to return session immediately
        mockSignUp.mockResolvedValue({
          data: {
            user: { id: 'user-123', email: 'newuser@example.com' },
            session: { access_token: 'token-abc', user: { id: 'user-123' } },
          },
          error: null,
        });
      });

      test('shows success toast with welcome message', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('newuser@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          `${STRINGS.WELCOME_TITLE}! Let's start learning.`,
          5000,
        );
      });

      test('triggers haptic feedback', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('newuser@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        expect(mockSuccessFeedback).toHaveBeenCalledTimes(1);
      });

      test('navigates to library after 1 second delay', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('newuser@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        // Navigation should not happen immediately
        expect(mockRouterReplace).not.toHaveBeenCalled();

        // Fast-forward time by 1000ms
        act(() => {
          jest.advanceTimersByTime(1000);
        });

        // Now navigation should have occurred
        expect(mockRouterReplace).toHaveBeenCalledWith(ROUTE_PATHS.EXPLORE_TAB);
      });

      test('tracks analytics identify with user data', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('newuser@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        // Verify analytics identify was called with user data
        expect(mockAnalyticsIdentify).toHaveBeenCalledWith(
          'user-123',
          expect.objectContaining({
            email: 'newuser@example.com',
            created_at: expect.any(String),
          }),
        );
      });

      test('calls supabase signUp with correct credentials', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('newuser@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        expect(mockSignUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'Password123',
        });
      });
    });

    describe('with email confirmation required (no immediate session)', () => {
      beforeEach(() => {
        // Mock Supabase to return user but NO session
        mockSignUp.mockResolvedValue({
          data: {
            user: { id: 'user-456', email: 'confirmemail@example.com' },
            session: null,
          },
          error: null,
        });
      });

      test('shows email confirmation toast', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('confirmemail@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        expect(mockShowSuccessToast).toHaveBeenCalledWith(STRINGS.CHECK_EMAIL_CONFIRMATION, 5000);
      });

      test('does NOT navigate to library', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('confirmemail@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        // Fast-forward time to ensure navigation doesn't happen
        act(() => {
          jest.advanceTimersByTime(2000);
        });

        expect(mockRouterReplace).not.toHaveBeenCalled();
      });

      test('still triggers haptic feedback', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('confirmemail@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        expect(mockSuccessFeedback).toHaveBeenCalledTimes(1);
      });

      test('still tracks analytics identify', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('confirmemail@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        expect(mockAnalyticsIdentify).toHaveBeenCalledWith(
          'user-456',
          expect.objectContaining({
            email: 'confirmemail@example.com',
            created_at: expect.any(String),
          }),
        );
      });
    });

    describe('error handling', () => {
      test('returns early if email is invalid', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('invalid-email');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        // Should not call Supabase
        expect(mockSignUp).not.toHaveBeenCalled();
        expect(result.current.emailError).toBe(STRINGS.ENTER_VALID_EMAIL);
      });

      test('returns early if password is too short', async () => {
        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('valid@example.com');
          result.current.setPassword('short');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        // Should not call Supabase
        expect(mockSignUp).not.toHaveBeenCalled();
        expect(result.current.passwordError).toContain(`${PASSWORD_REQUIREMENTS.minLength}`);
      });

      test('handles Supabase errors correctly', async () => {
        const errorMessage = 'User already exists';
        mockSignUp.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: errorMessage, status: 400 },
        });

        const { result } = renderHook(() => useAuthForm());

        act(() => {
          result.current.setEmail('existing@example.com');
          result.current.setPassword('Password123');
        });

        await act(async () => {
          await result.current.signUpWithEmail();
        });

        expect(mockHandleError).toHaveBeenCalledWith(
          expect.objectContaining({ message: errorMessage }),
          expect.objectContaining({
            toastMessage: expect.stringContaining(STRINGS.ACCOUNT_CREATION_FAILED),
            analyticsEventName: 'Sign_Up_Error',
            sentrySeverity: 'error',
          }),
        );
      });
    });
  });

  describe('signInWithEmail', () => {
    test('navigates to library on successful sign in', async () => {
      const { result } = renderHook(() => useAuthForm());

      act(() => {
        result.current.setEmail('user@example.com');
        result.current.setPassword('Password1');
      });

      await act(async () => {
        await result.current.signInWithEmail();
      });

      expect(mockRouterReplace).toHaveBeenCalledWith(ROUTE_PATHS.EXPLORE_TAB);
    });

    test('tracks analytics on successful sign in', async () => {
      const { result } = renderHook(() => useAuthForm());

      act(() => {
        result.current.setEmail('user@example.com');
        result.current.setPassword('Password1');
      });

      await act(async () => {
        await result.current.signInWithEmail();
      });

      await waitFor(() => {
        expect(mockAnalyticsIdentify).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            last_sign_in: expect.any(String),
          }),
        );
      });

      expect(mockAnalyticsTrackSignIn).toHaveBeenCalledWith('email');
    });

    test('triggers haptic feedback on successful sign in', async () => {
      const { result } = renderHook(() => useAuthForm());

      act(() => {
        result.current.setEmail('user@example.com');
        result.current.setPassword('Password1');
      });

      await act(async () => {
        await result.current.signInWithEmail();
      });

      expect(mockSuccessFeedback).toHaveBeenCalledTimes(1);
    });
  });
});
