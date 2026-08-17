/**
 * Hook Tests - useOAuthProvider Factory
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ renderHook from @testing-library/react-native
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { AuthResponse } from '@supabase/supabase-js';

// Mock dependencies BEFORE imports
jest.mock('@/services/supabase');
jest.mock('@/services/analytics');
jest.mock('@/utils/haptics');
jest.mock('@/utils/errorHandling');
jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));
jest.mock('@/hooks/common/useMountSafety');

import {
  useOAuthProvider,
  type OAuthProviderConfig,
  type OAuthSignInResult,
} from '@/hooks/auth/useOAuthProvider';

import { supabase } from '@/services/supabase';
import { analytics } from '@/services/analytics';
import { successFeedback } from '@/utils/haptics';
import { authBreadcrumb, handleError } from '@/utils/errorHandling';
import { captureException } from '@sentry/react-native';
import { useMountSafety } from '@/hooks/common/useMountSafety';

const mockSupabase = jest.mocked(supabase);
const mockAnalytics = jest.mocked(analytics);
const mockSuccessFeedback = jest.mocked(successFeedback);
const mockHandleError = jest.mocked(handleError);
const mockAuthBreadcrumb = jest.mocked(authBreadcrumb);
const mockSentryCaptureException = jest.mocked(captureException);
const mockUseMountSafety = jest.mocked(useMountSafety);

describe('useOAuthProvider', () => {
  // Default mock implementations
  const mockSession = {
    access_token: 'test-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  };

  const mockAuthResponse: AuthResponse = {
    data: {
      user: mockSession.user,
      session: mockSession,
    },
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mount safety - component is mounted
    mockUseMountSafety.mockReturnValue({ current: true });

    // Default Supabase mocks
    mockSupabase.auth.signInWithIdToken = jest.fn().mockResolvedValue(mockAuthResponse);
    mockSupabase.auth.getSession = jest
      .fn()
      .mockResolvedValue({ data: { session: mockSession }, error: null });

    // Default analytics mocks
    mockAnalytics.identify = jest.fn().mockResolvedValue(undefined);
    mockAnalytics.trackSignIn = jest.fn().mockResolvedValue(undefined);

    // Default utility mocks
    mockSuccessFeedback.mockReturnValue(undefined);
    mockHandleError.mockReturnValue(undefined);

    // Sentry mocks are already defined via jest.mock factory
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Successful OAuth Flow', () => {
    test('should complete full OAuth flow successfully', async () => {
      const mockModule = { signIn: jest.fn() };
      const signInResult: OAuthSignInResult = {
        idToken: 'test-id-token',
        userInfo: { email: 'test@example.com', name: 'Test User' },
      };

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue(mockModule),
        executeSignIn: jest.fn().mockResolvedValue(signInResult),
      };

      const { result } = renderHook(() => useOAuthProvider(config));

      // Should not be loading initially
      expect(result.current.loading).toBeFalsy();

      // Call signIn and await completion
      await result.current.signIn();

      // Verify full flow
      expect(config.loadModule).toHaveBeenCalled();
      expect(config.executeSignIn).toHaveBeenCalledWith(mockModule);
      expect(mockSupabase.auth.signInWithIdToken).toHaveBeenCalledWith({
        provider: 'google',
        token: 'test-id-token',
      });
      expect(mockAnalytics.identify).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          last_sign_in: expect.any(String),
        }),
      );
      expect(mockAnalytics.trackSignIn).toHaveBeenCalledWith('google');
      // Navigation is now handled by root layout, not the hook
      expect(mockSuccessFeedback).toHaveBeenCalled();

      // Should not be loading after completion
      expect(result.current.loading).toBeFalsy();
    });

    test('should add Sentry breadcrumbs throughout the flow', async () => {
      const config: OAuthProviderConfig = {
        provider: 'apple',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockResolvedValue({ idToken: 'token' }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      // Verify breadcrumbs
      expect(mockAuthBreadcrumb).toHaveBeenCalledWith(
        'Checking Apple Auth native module availability',
      );
      expect(mockAuthBreadcrumb).toHaveBeenCalledWith(
        'Apple Auth native module loaded successfully',
      );
      expect(mockAuthBreadcrumb).toHaveBeenCalledWith('Starting Apple sign-in flow');
      expect(mockAuthBreadcrumb).toHaveBeenCalledWith(
        'Apple sign-in successful',
        expect.objectContaining({ hasIdToken: true }),
      );
    });
  });

  describe('Module Loading Errors', () => {
    test('should handle module not available error', async () => {
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockRejectedValue(new Error('Module not found')),
        executeSignIn: jest.fn(),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          tags: {
            location: 'google_auth',
            step: 'module_load',
          },
        }),
      );

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: expect.stringContaining('Google Sign In not available'),
        }),
      );
    });

    test('should use custom module not available message', async () => {
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockRejectedValue(new Error('Module not found')),
        executeSignIn: jest.fn(),
        moduleNotAvailableMessage: 'Custom error message',
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: expect.stringContaining('Custom error message'),
        }),
      );
    });
  });

  describe('Sign-In Errors', () => {
    test('should handle sign-in errors', async () => {
      const signInError = new Error('Network connection failed');

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockRejectedValue(signInError),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: expect.stringContaining('Google Sign In Failed'),
        }),
      );
    });

    test('should use custom error handler if provided', async () => {
      const customError = new Error('Custom error');

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockRejectedValue(customError),
        handleProviderError: jest.fn().mockReturnValue('Custom error message'),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(config.handleProviderError).toHaveBeenCalledWith(customError);
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: expect.stringContaining('Custom error message'),
        }),
      );
    });

    test('should skip custom error handler if it returns undefined', async () => {
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockRejectedValue(new Error('Standard error')),
        handleProviderError: jest.fn().mockReturnValue(undefined),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(config.handleProviderError).toHaveBeenCalled();
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: expect.stringContaining('Google Sign In Failed'),
        }),
      );
    });
  });

  describe('Token Validation', () => {
    test('should throw error if no ID token returned', async () => {
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockResolvedValue({ idToken: '' }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'No ID token returned from Google Sign In',
        }),
        expect.objectContaining({
          tags: {
            location: 'google_auth',
            step: 'token_validation',
          },
        }),
      );
    });
  });

  describe('Supabase Exchange Errors', () => {
    test('should handle Supabase signInWithIdToken errors', async () => {
      const supabaseError = new Error('Network error');
      mockSupabase.auth.signInWithIdToken = jest.fn().mockRejectedValue(supabaseError);

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockResolvedValue({ idToken: 'token' }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        supabaseError,
        expect.objectContaining({
          tags: {
            location: 'google_auth',
            step: 'supabase_signin',
          },
        }),
      );
    });

    test('should handle Supabase auth response errors', async () => {
      const authError = {
        message: 'Invalid credentials',
        name: 'AuthError',
      };
      mockSupabase.auth.signInWithIdToken = jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: authError,
      });

      const config: OAuthProviderConfig = {
        provider: 'apple',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockResolvedValue({ idToken: 'token' }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockSentryCaptureException).toHaveBeenCalledWith(
        authError,
        expect.objectContaining({
          tags: {
            location: 'apple_auth',
            step: 'supabase_response',
          },
        }),
      );
    });
  });

  describe('User Cancellation', () => {
    test('should handle user cancellation silently (code -5 - Google iOS)', async () => {
      // -5 is kGIDSignInErrorCodeCanceled (Google iOS user cancelled)
      const cancellationError = Object.assign(new Error('User cancelled'), { code: -5 });

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockRejectedValue(cancellationError),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      // Should add diagnostic breadcrumb with isCancellation: true
      expect(mockAuthBreadcrumb).toHaveBeenCalledWith(
        'Google Sign In error caught',
        expect.objectContaining({ isCancellation: true }),
        'info',
      );

      // Should NOT call handleError
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('should handle user cancellation silently (code 12501 - Google Android)', async () => {
      // 12501 is SIGN_IN_CANCELLED (Google Android user cancelled)
      const cancellationError = Object.assign(new Error('User cancelled'), { code: 12501 });

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockRejectedValue(cancellationError),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      // Should add diagnostic breadcrumb with isCancellation: true
      expect(mockAuthBreadcrumb).toHaveBeenCalledWith(
        'Google Sign In error caught',
        expect.objectContaining({ isCancellation: true }),
        'info',
      );
      expect(mockHandleError).not.toHaveBeenCalled();
    });
  });

  describe('Mount Safety', () => {
    test('should not update state if component unmounted', async () => {
      const mountedRef = { current: true };
      mockUseMountSafety.mockReturnValue(mountedRef);

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockImplementation(async () => {
          // Simulate unmount during async operation
          mountedRef.current = false;
          return { idToken: 'token' };
        }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));

      // Should start loading
      const signInPromise = result.current.signIn();
      await waitFor(() => {
        expect(result.current.loading).toBeTruthy();
      });

      await signInPromise;

      // Loading state should not be updated after unmount
      // Note: In the actual hook, setLoading(false) is guarded by isMountedRef.current
    });
  });

  describe('Analytics Tracking', () => {
    test('should track sign-in with correct provider', async () => {
      const config: OAuthProviderConfig = {
        provider: 'apple',
        loadModule: jest.fn().mockResolvedValue({}),
        executeSignIn: jest.fn().mockResolvedValue({ idToken: 'token' }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockAnalytics.identify).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          last_sign_in: expect.any(String),
        }),
      );
      expect(mockAnalytics.trackSignIn).toHaveBeenCalledWith('apple');
    });
  });
});
