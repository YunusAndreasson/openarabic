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
import {
  createAuthErrorMock,
  createSessionMock,
  createUserMock,
} from '@/__tests__/helpers/serviceMocks';

const mockSupabase = jest.mocked(supabase);
const mockAnalytics = jest.mocked(analytics);
const mockSuccessFeedback = jest.mocked(successFeedback);
const mockHandleError = jest.mocked(handleError);
const mockAuthBreadcrumb = jest.mocked(authBreadcrumb);
const mockSentryCaptureException = jest.mocked(captureException);

describe('useOAuthProvider', () => {
  // Default mock implementations
  const mockSession = createSessionMock({
    access_token: 'test-token',
    refresh_token: 'refresh-token',
    expires_at: Date.now() + 3600000,
    user: createUserMock({ id: 'user-123', email: 'test@example.com' }),
  });

  const mockAuthResponse: AuthResponse = {
    data: {
      user: mockSession.user,
      session: mockSession,
    },
    error: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Default Supabase mocks
    // `jest.mock('@/services/supabase')` automocks the module export but not the
    // nested `auth` methods, so these must be assigned rather than configured.
    mockSupabase.auth.signInWithIdToken = jest.fn(
      async () => mockAuthResponse,
    ) as unknown as typeof mockSupabase.auth.signInWithIdToken;
    mockSupabase.auth.getSession = jest.fn(async (..._args: unknown[]) => ({
      data: { session: mockSession },
      error: null,
    })) as unknown as typeof mockSupabase.auth.getSession;
    mockSupabase.auth.updateUser = jest.fn(async (..._args: unknown[]) => ({
      data: { user: mockSession.user },
      error: null,
    })) as unknown as typeof mockSupabase.auth.updateUser;

    // Default analytics mocks
    mockAnalytics.identify = jest.fn(async (..._args: unknown[]): Promise<void> => undefined);
    mockAnalytics.trackSignIn = jest.fn(async (..._args: unknown[]): Promise<void> => undefined);

    // Default utility mocks
    mockSuccessFeedback.mockReturnValue(undefined);
    mockHandleError.mockResolvedValue(undefined);

    // Sentry mocks are already defined via jest.mock factory
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Provider-supplied name', () => {
    const appleConfig = (name?: string): OAuthProviderConfig => ({
      provider: 'apple',
      loadModule: jest.fn(async (..._args: unknown[]) => {}),
      executeSignIn: jest.fn(async (..._args: unknown[]) => ({
        idToken: 'apple-token',
        userInfo: { name },
      })),
    });

    test('saves the name once Supabase has created the session', async () => {
      // Apple sends the name only on the first authorization, outside the
      // token — saving it before the session existed silently failed.
      const { result } = renderHook(() => useOAuthProvider(appleConfig('Amina Yusuf')));
      await result.current.signIn();

      expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
        data: { full_name: 'Amina Yusuf' },
      });
      const signInOrder = jest.mocked(mockSupabase.auth.signInWithIdToken).mock
        .invocationCallOrder[0];
      const updateOrder = jest.mocked(mockSupabase.auth.updateUser).mock.invocationCallOrder[0];
      expect(updateOrder).toBeGreaterThan(signInOrder ?? Infinity);
    });

    test('never overwrites a name the account already has', async () => {
      const namedUser = createUserMock({
        id: 'user-123',
        user_metadata: { full_name: 'From The Token' },
      });
      mockSupabase.auth.signInWithIdToken = jest.fn(async () => ({
        data: { user: namedUser, session: { ...mockSession, user: namedUser } },
        error: null,
      })) as unknown as typeof mockSupabase.auth.signInWithIdToken;

      const { result } = renderHook(() => useOAuthProvider(appleConfig('Amina Yusuf')));
      await result.current.signIn();

      expect(mockSupabase.auth.updateUser).not.toHaveBeenCalled();
    });
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
        loadModule: jest.fn(async (..._args: unknown[]) => mockModule),
        executeSignIn: jest.fn(async (..._args: unknown[]) => signInResult),
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
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => ({ idToken: 'token' })),
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
        loadModule: jest.fn(async (..._args: unknown[]) => {
          throw new Error('Module not found');
        }),
        executeSignIn: jest.fn<OAuthProviderConfig['executeSignIn']>(),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: expect.stringContaining('Google Sign In not available'),
          sentryTags: { location: 'google_auth', step: 'module_load', errorCode: 'unknown' },
        }),
      );
      expect(config.executeSignIn).not.toHaveBeenCalled();
    });

    test('should use custom module not available message', async () => {
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn(async (..._args: unknown[]) => {
          throw new Error('Module not found');
        }),
        executeSignIn: jest.fn<OAuthProviderConfig['executeSignIn']>(),
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
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => {
          throw signInError;
        }),
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
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => {
          throw customError;
        }),
        handleProviderError: jest.fn((..._args: unknown[]) => 'Custom error message'),
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
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => {
          throw new Error('Standard error');
        }),
        handleProviderError: jest.fn((..._args: unknown[]) => undefined),
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
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => ({ idToken: '' })),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'No ID token returned from Google Sign In' }),
        expect.objectContaining({
          toastMessage: expect.stringContaining('no auth token received'),
          sentryTags: expect.objectContaining({ step: 'token_validation' }),
        }),
      );
      expect(mockSupabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    });
  });

  describe('Supabase Exchange Errors', () => {
    test('should handle Supabase signInWithIdToken errors', async () => {
      const supabaseError = new Error('Network error');
      mockSupabase.auth.signInWithIdToken = jest.fn(async (..._args: unknown[]) => {
        throw supabaseError;
      });

      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => ({ idToken: 'token' })),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockHandleError).toHaveBeenCalledWith(
        supabaseError,
        expect.objectContaining({
          toastMessage: expect.stringContaining('server authentication failed'),
          sentryTags: expect.objectContaining({
            location: 'google_auth',
            step: 'supabase_exchange',
          }),
        }),
      );
    });

    test('should handle Supabase auth response errors', async () => {
      const authError = createAuthErrorMock('Invalid credentials');
      mockSupabase.auth.signInWithIdToken = jest.fn(async (..._args: unknown[]) => ({
        data: { user: null, session: null },
        error: authError,
      })) as unknown as typeof mockSupabase.auth.signInWithIdToken;

      const config: OAuthProviderConfig = {
        provider: 'apple',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => ({ idToken: 'token' })),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Supabase authentication failed: Invalid credentials',
          originalError: authError,
        }),
        expect.objectContaining({
          sentryTags: expect.objectContaining({
            location: 'apple_auth',
            step: 'supabase_exchange',
          }),
        }),
      );
    });
  });

  describe('Failure reporting', () => {
    test('a failed Apple sheet is a provider failure, not a server one', async () => {
      // React Native builds the error from the NSError. Its text names
      // com.apple.AuthenticationServices, and the old step guess matched
      // `includes('auth')` on it: the learner was told "Apple sign-in
      // succeeded, but server authentication failed".
      const nativeError = Object.assign(
        new Error(
          'The operation couldn’t be completed. (com.apple.AuthenticationServices.AuthorizationError error 1000.)',
        ),
        { code: '1000', domain: 'com.apple.AuthenticationServices.AuthorizationError' },
      );
      const config: OAuthProviderConfig = {
        provider: 'apple',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => {
          throw nativeError;
        }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      const options = mockHandleError.mock.calls[0]?.[1];
      expect(options?.toastMessage).toContain('Step: Apple sign-in failed');
      expect(options?.toastMessage).not.toContain('server authentication failed');
      expect(options?.sentryTags).toEqual({
        location: 'apple_auth',
        step: 'provider_signin',
        errorCode: '1000',
      });
      expect(mockSupabase.auth.signInWithIdToken).not.toHaveBeenCalled();
    });

    test('every failure is reported once, through handleError', async () => {
      mockSupabase.auth.signInWithIdToken = jest.fn(async (..._args: unknown[]) => {
        throw new Error('Network error');
      });
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => ({ idToken: 'token' })),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockHandleError).toHaveBeenCalledTimes(1);
      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });
  });

  describe('User Cancellation', () => {
    test('a sign-in the user backed out of resolves null and is silent', async () => {
      // google-signin 16 resolves a cancelled response, never a rejection.
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => null),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockAuthBreadcrumb).toHaveBeenCalledWith('Google sign-in cancelled by the user');
      expect(mockSupabase.auth.signInWithIdToken).not.toHaveBeenCalled();
      expect(mockHandleError).not.toHaveBeenCalled();
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    test('an Apple cancel (code 1001) is silent', async () => {
      const cancellationError = Object.assign(new Error('The user canceled'), { code: '1001' });

      const config: OAuthProviderConfig = {
        provider: 'apple',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => {
          throw cancellationError;
        }),
      };

      const { result } = renderHook(() => useOAuthProvider(config));
      await result.current.signIn();

      expect(mockAuthBreadcrumb).toHaveBeenCalledWith(
        'Apple Sign In error caught',
        expect.objectContaining({ isCancellation: true, step: 'provider_signin' }),
        'info',
      );
      expect(mockHandleError).not.toHaveBeenCalled();
    });
  });

  describe('Loading', () => {
    test('is set while the flow runs and cleared when it fails', async () => {
      let rejectSignIn: ((error: Error) => void) | undefined;
      const config: OAuthProviderConfig = {
        provider: 'google',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(
          (..._args: unknown[]) =>
            new Promise<OAuthSignInResult>((_resolve, reject) => {
              rejectSignIn = reject;
            }),
        ),
      };

      const { result } = renderHook(() => useOAuthProvider(config));

      const signInPromise = result.current.signIn();
      await waitFor(() => {
        expect(result.current.loading).toBe(true);
      });

      rejectSignIn?.(new Error('Network connection failed'));
      await signInPromise;

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('Analytics Tracking', () => {
    test('should track sign-in with correct provider', async () => {
      const config: OAuthProviderConfig = {
        provider: 'apple',
        loadModule: jest.fn(async (..._args: unknown[]) => {}),
        executeSignIn: jest.fn(async (..._args: unknown[]) => ({ idToken: 'token' })),
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
