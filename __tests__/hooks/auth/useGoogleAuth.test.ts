/**
 * useGoogleAuth's provider step — what it hands useOAuthProvider for each
 * outcome of the native Google sign-in.
 *
 * google-signin (v13+) RESOLVES `{ type: 'cancelled' }` when the user backs out
 * of the account picker instead of throwing, so the cancel has to be turned
 * into a `null` result here or it reads as a failed sign-in.
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
jest.mock('@/utils/network', () => ({
  isKnownOffline: jest.fn(async () => false),
}));
jest.mock('@/utils/async', () => ({
  delay: jest.fn(async () => undefined),
}));
jest.mock('@/hooks/auth/useOAuthProvider', () => ({
  useOAuthProvider: jest.fn(),
}));

import { captureException } from '@sentry/react-native';

import { useGoogleAuth } from '@/hooks/auth/useGoogleAuth';
import { useOAuthProvider, type OAuthProviderConfig } from '@/hooks/auth/useOAuthProvider';
import { authBreadcrumb } from '@/utils/errorHandling';
import { isKnownOffline } from '@/utils/network';

/** The provider config useGoogleAuth registered on its last render. */
function renderGoogleProvider(): OAuthProviderConfig {
  renderHook(() => useGoogleAuth());
  const config = jest.mocked(useOAuthProvider).mock.lastCall?.[0];
  if (!config) throw new Error('useGoogleAuth did not register a provider');
  return config;
}

/**
 * The library module as executeSignIn receives it: the `GoogleSignin` entry
 * point plus the response helpers, which mirror the library's own.
 */
function googleLibrary(signIn: () => Promise<unknown>) {
  return {
    GoogleSignin: {
      hasPlayServices: jest.fn(async () => true),
      signIn: jest.fn(signIn),
    },
    isCancelledResponse: (response: { type: string }) => response.type === 'cancelled',
  };
}

const resolvesWith = (signInResult: unknown) => googleLibrary(async () => signInResult);

describe('useGoogleAuth executeSignIn', () => {
  beforeEach(() => {
    // Re-armed per test: the suite-wide `resetMocks` wipes implementations.
    jest
      .mocked(useOAuthProvider)
      .mockReturnValue({ signIn: jest.fn(async () => {}), loading: false });
    jest.mocked(isKnownOffline).mockResolvedValue(false);
  });

  it('turns a cancelled account picker into a null result, not an error', async () => {
    const { executeSignIn } = renderGoogleProvider();

    await expect(
      executeSignIn(resolvesWith({ type: 'cancelled', data: null })),
    ).resolves.toBeNull();
    expect(captureException).not.toHaveBeenCalled();
  });

  it('returns the ID token from a successful sign-in', async () => {
    const { executeSignIn } = renderGoogleProvider();

    const result = await executeSignIn(
      resolvesWith({
        type: 'success',
        data: { idToken: 'id-token', user: { email: 'a@b.c', name: null } },
      }),
    );

    expect(result).toEqual({ idToken: 'id-token', userInfo: { email: 'a@b.c', name: undefined } });
  });

  it('fails a success that carries no ID token, leaving the email off the trail', async () => {
    const { executeSignIn } = renderGoogleProvider();

    await expect(
      executeSignIn(
        resolvesWith({ type: 'success', data: { idToken: null, user: { email: 'a@b.c' } } }),
      ),
    ).rejects.toThrow('Google Sign-In failed');

    // Reported once, by useOAuthProvider — not here as well.
    expect(captureException).not.toHaveBeenCalled();
    expect(JSON.stringify(jest.mocked(authBreadcrumb).mock.calls)).not.toContain('a@b.c');
  });

  it('retries INTERNAL_ERROR once, which the native module rejects as the string "8"', async () => {
    const { executeSignIn } = renderGoogleProvider();
    const signIn = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(Object.assign(new Error('internal'), { code: '8' }))
      .mockResolvedValueOnce({
        type: 'success',
        data: { idToken: 'second-try', user: { email: 'a@b.c', name: 'A' } },
      });

    const result = await executeSignIn(googleLibrary(signIn));

    expect(signIn).toHaveBeenCalledTimes(2);
    expect(result).toEqual(expect.objectContaining({ idToken: 'second-try' }));
    expect(captureException).not.toHaveBeenCalled();
  });

  it('does not retry while the device is known to be offline', async () => {
    const { executeSignIn } = renderGoogleProvider();
    jest.mocked(isKnownOffline).mockResolvedValue(true);
    const signIn = jest
      .fn<() => Promise<unknown>>()
      .mockRejectedValue(Object.assign(new Error('internal'), { code: '8' }));

    await expect(executeSignIn(googleLibrary(signIn))).rejects.toThrow(
      'No network connection available',
    );
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('does not retry any other failure', async () => {
    const { executeSignIn } = renderGoogleProvider();
    const failure = Object.assign(new Error('developer error'), { code: '10' });
    const signIn = jest.fn<() => Promise<unknown>>().mockRejectedValue(failure);

    await expect(executeSignIn(googleLibrary(signIn))).rejects.toBe(failure);
    expect(signIn).toHaveBeenCalledTimes(1);
  });
});
