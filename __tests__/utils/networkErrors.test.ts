/**
 * isNetworkFailure: a request that never got an answer, told apart from one
 * that failed. The messages are the ones Sentry received, as each layer
 * wrapped them.
 */

import { describe, expect, test } from '@jest/globals';

import { isNetworkFailure } from '@/utils/networkErrors';

/** A SupabaseRequestError as executeQuery throws it: postgrest-js's message, the status. */
const requestError = (message: string, status: number): Error =>
  Object.assign(new Error(message), { status, code: '', details: '', hint: '' });

const named = (name: string, message: string, extra: Record<string, unknown> = {}): Error =>
  Object.assign(new Error(message), { name, ...extra });

describe('isNetworkFailure', () => {
  test.each([
    [
      'iOS, cellular data off for the app (OPENARABIC-NV)',
      requestError(
        'Error: fetch failed: UnexpectedException: A data connection is not currently allowed.',
        0,
      ),
    ],
    ['iOS URLSession timeout (OPENARABIC-T5)', requestError('Error: The request timed out.', 0)],
    [
      'expo/fetch cancel on Android (OPENARABIC-TC)',
      requestError('Error: fetch failed: Fetch request has been canceled', 0),
    ],
    [
      'the Supabase request deadline',
      requestError('TimeoutError: Request timed out after 20000 ms', 0),
    ],
    [
      'Android DNS failure',
      requestError(
        'Error: fetch failed: java.net.UnknownHostException: Unable to resolve host "x.supabase.co"',
        0,
      ),
    ],
    ['iOS offline', requestError('Error: The Internet connection appears to be offline.', 0)],
    [
      'OkHttp socket timeout',
      requestError('Error: fetch failed: java.net.SocketTimeoutException: timeout', 0),
    ],
    ["React Native's own fetch", new TypeError('Network request failed')],
    ['the app’s own offline pre-flight', new Error('No network connection available')],
  ])('%s', (_label, error) => {
    expect(isNetworkFailure(error)).toBe(true);
  });

  test('an AbortError, whatever its message (OPENARABIC-PK, -RE)', () => {
    expect(isNetworkFailure(named('AbortError', 'The operation was aborted.'))).toBe(true);
    expect(isNetworkFailure(named('AbortError', 'Aborted'))).toBe(true);
    expect(isNetworkFailure(named('TimeoutError', 'signal timed out'))).toBe(true);
  });

  test('supabase-js auth when fetch itself rejected (OPENARABIC-P2, -P0)', () => {
    expect(
      isNetworkFailure(
        named(
          'AuthRetryableFetchError',
          'fetch failed: A data connection is not currently allowed',
          {
            status: 0,
          },
        ),
      ),
    ).toBe(true);
  });

  test('a plain supabase-js error object or a string is read the same way', () => {
    expect(isNetworkFailure({ message: 'Network request failed', status: 0 })).toBe(true);
    expect(isNetworkFailure('The network connection was lost.')).toBe(true);
  });

  describe('a failure the server answered, or one that is not the network, is not', () => {
    test('any HTTP status, however the message reads', () => {
      expect(
        isNetworkFailure(requestError('canceling statement due to statement timeout', 500)),
      ).toBe(false);
      expect(isNetworkFailure(requestError('Request timed out', 504))).toBe(false);
      expect(isNetworkFailure(requestError('Unreadable response body (HTTP 200)', 200))).toBe(
        false,
      );
    });

    test('supabase-js auth retrying a 5xx', () => {
      expect(
        isNetworkFailure(named('AuthRetryableFetchError', 'Service Unavailable', { status: 503 })),
      ).toBe(false);
    });

    test.each([
      ['wrong credentials', named('AuthApiError', 'Invalid login credentials', { status: 400 })],
      ['a programming error', new TypeError("Cannot read property 'id' of undefined")],
      [
        'a dead audio source',
        new Error('Player ready timeout - audio may be corrupted or unavailable'),
      ],
      ['an unknown fetch failure', requestError('Error: fetch failed: Unknown error', 0)],
      ['Apple sign-in error 1000', Object.assign(new Error('error 1000'), { code: '1000' })],
    ])('%s', (_label, error) => {
      expect(isNetworkFailure(error)).toBe(false);
    });

    test('nothing at all', () => {
      expect(isNetworkFailure(undefined)).toBe(false);
      expect(isNetworkFailure(null)).toBe(false);
      expect(isNetworkFailure(42)).toBe(false);
    });
  });
});
