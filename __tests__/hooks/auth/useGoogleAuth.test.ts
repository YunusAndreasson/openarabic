/**
 * useGoogleAuth's provider step — what it hands useOAuthProvider for each
 * outcome of the native Google sign-in.
 *
 * google-signin (v13+) RESOLVES `{ type: 'cancelled' }` when the user backs out
 * of the account picker instead of throwing, so the cancel has to be turned
 * into a cancellation here or it reads as a failed sign-in.
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
}));
jest.mock('@/utils/errorHandling', () => ({
  authBreadcrumb: jest.fn(),
}));
jest.mock('@/hooks/auth/useOAuthProvider', () => ({
  useOAuthProvider: jest.fn(),
}));

import { captureException } from '@sentry/react-native';

import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';
import { useOAuthProvider, type OAuthProviderConfig } from '@/hooks/auth/useOAuthProvider';
import { isCancellationError } from '@/utils/authUtils';

/** The provider config useGoogleAuth registered on its last render. */
function renderGoogleProvider(): OAuthProviderConfig {
  renderHook(() => useGoogleAuth());
  const config = jest.mocked(useOAuthProvider).mock.lastCall?.[0];
  if (!config) throw new Error('useGoogleAuth did not register a provider');
  return config;
}

function nativeModule(signInResult: unknown) {
  return {
    hasPlayServices: jest.fn(async () => true),
    signIn: jest.fn(async () => signInResult),
  };
}

describe('useGoogleAuth executeSignIn', () => {
  beforeEach(() => {
    // Re-armed per test: the suite-wide `resetMocks` wipes implementations.
    jest
      .mocked(useOAuthProvider)
      .mockReturnValue({ signIn: jest.fn(async () => {}), loading: false });
  });

  it('turns a cancelled account picker into a silent cancellation', async () => {
    const { executeSignIn } = renderGoogleProvider();

    const error = await executeSignIn(nativeModule({ type: 'cancelled', data: null })).catch(
      (e: unknown) => e,
    );

    expect(isCancellationError(error)).toBe(true);
    expect(captureException).not.toHaveBeenCalled();
  });

  it('returns the ID token from a successful sign-in', async () => {
    const { executeSignIn } = renderGoogleProvider();

    const result = await executeSignIn(
      nativeModule({
        type: 'success',
        data: { idToken: 'id-token', user: { email: 'a@b.c', name: null } },
      }),
    );

    expect(result).toEqual({ idToken: 'id-token', userInfo: { email: 'a@b.c', name: undefined } });
  });

  it('still reports a success that carries no ID token, without the email', async () => {
    const { executeSignIn } = renderGoogleProvider();

    await expect(
      executeSignIn(
        nativeModule({ type: 'success', data: { idToken: null, user: { email: 'a@b.c' } } }),
      ),
    ).rejects.toThrow('Google Sign-In failed');

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(jest.mocked(captureException).mock.calls[0])).not.toContain('a@b.c');
  });
});
