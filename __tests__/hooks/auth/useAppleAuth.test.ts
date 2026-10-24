/**
 * useAppleAuth's provider step: the request, its one retry, and what a native
 * failure leaves on the Sentry trail for useOAuthProvider's single report.
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockPerformRequest = jest.fn<(options: unknown) => Promise<unknown>>();

jest.mock('@invertase/react-native-apple-authentication', () => ({
  appleAuth: {
    performRequest: (options: unknown) => mockPerformRequest(options),
    Error: { UNKNOWN: '1000', CANCELED: '1001' },
    Operation: { LOGIN: 1 },
    Scope: { EMAIL: 0, FULL_NAME: 1 },
  },
}));
jest.mock('@/utils/errorHandling', () => ({
  authBreadcrumb: jest.fn(),
}));
jest.mock('@/utils/async', () => ({
  delay: jest.fn(async () => undefined),
}));
jest.mock('@/hooks/auth/useOAuthProvider', () => ({
  useOAuthProvider: jest.fn(),
}));

import { useAppleAuth } from '@/hooks/auth/useAppleAuth';
import { useOAuthProvider, type OAuthProviderConfig } from '@/hooks/auth/useOAuthProvider';
import { authBreadcrumb } from '@/utils/errorHandling';

const credential = {
  identityToken: 'apple-token',
  nonce: 'nonce-1',
  email: null,
  fullName: { givenName: 'Amina', familyName: 'Yusuf' },
};

/** The provider config useAppleAuth registered, plus the module it loads. */
async function renderAppleProvider(): Promise<{
  config: OAuthProviderConfig;
  appleAuth: unknown;
}> {
  renderHook(() => useAppleAuth());
  const config = jest.mocked(useOAuthProvider).mock.lastCall?.[0];
  if (!config) throw new Error('useAppleAuth did not register a provider');
  return { config, appleAuth: await config.loadModule() };
}

describe('useAppleAuth', () => {
  beforeEach(() => {
    Platform.OS = 'ios';
    jest
      .mocked(useOAuthProvider)
      .mockReturnValue({ signIn: jest.fn(async () => {}), loading: false });
  });

  it('returns the identity token, nonce and the once-only full name', async () => {
    mockPerformRequest.mockResolvedValue(credential);
    const { config, appleAuth } = await renderAppleProvider();

    await expect(config.executeSignIn(appleAuth)).resolves.toEqual({
      idToken: 'apple-token',
      nonce: 'nonce-1',
      userInfo: { email: undefined, name: 'Amina Yusuf' },
    });
  });

  it('retries ASAuthorizationError.unknown (1000) once', async () => {
    mockPerformRequest
      .mockRejectedValueOnce(Object.assign(new Error('unknown'), { code: '1000' }))
      .mockResolvedValueOnce(credential);
    const { config, appleAuth } = await renderAppleProvider();

    await expect(config.executeSignIn(appleAuth)).resolves.toEqual(
      expect.objectContaining({ idToken: 'apple-token' }),
    );
    expect(mockPerformRequest).toHaveBeenCalledTimes(2);
  });

  it('does not retry any other failure', async () => {
    const failure = Object.assign(new Error('failed'), { code: '1004' });
    mockPerformRequest.mockRejectedValue(failure);
    const { config, appleAuth } = await renderAppleProvider();

    await expect(config.executeSignIn(appleAuth)).rejects.toBe(failure);
    expect(mockPerformRequest).toHaveBeenCalledTimes(1);
  });

  it('leaves the native details on the trail and the reporting to useOAuthProvider', async () => {
    const { config } = await renderAppleProvider();
    const nativeError = Object.assign(new Error('The operation couldn’t be completed.'), {
      code: '1000',
      domain: 'com.apple.AuthenticationServices.AuthorizationError',
      userInfo: { NSLocalizedDescription: 'The operation couldn’t be completed.', other: 'x' },
    });

    expect(config.handleProviderError?.(nativeError)).toBeUndefined();
    expect(authBreadcrumb).toHaveBeenCalledWith(
      'Apple authorization failed',
      {
        errorCode: '1000',
        nativeDomain: 'com.apple.AuthenticationServices.AuthorizationError',
        userInfo: { NSLocalizedDescription: 'The operation couldn’t be completed.' },
      },
      'error',
    );
  });

  it('leaves a cancel alone', async () => {
    const { config } = await renderAppleProvider();

    expect(
      config.handleProviderError?.(Object.assign(new Error('canceled'), { code: '1001' })),
    ).toBeUndefined();
    expect(authBreadcrumb).not.toHaveBeenCalledWith(
      'Apple authorization failed',
      expect.anything(),
      expect.anything(),
    );
  });
});
