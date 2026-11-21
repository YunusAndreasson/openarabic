/**
 * Service Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: test.concurrent() used where tests are independent
 */

import { afterEach, jest } from '@jest/globals';

import { SUPABASE_REQUEST_TIMEOUT_MS } from '@/constants/supabase';
import { checkAuthentication, fetchWithTimeout, supabase } from '../../services/supabase';
import { handleError } from '../../utils/errorHandling';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createSessionMock, createUserMock } from '@/__tests__/helpers/serviceMocks';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

describe('checkAuthentication', () => {
  // Typed from the client itself: a bare `jest.fn()` is `Mock<UnknownFunction>`
  // and cannot stand in for the method it replaces.
  const initializeMock = jest.fn<SupabaseClient['auth']['initialize']>();
  const getSessionMock = jest.fn<SupabaseClient['auth']['getSession']>();
  const startAutoRefreshMock = jest.fn<SupabaseClient['auth']['startAutoRefresh']>();
  const session = createSessionMock({ user: createUserMock({ id: 'user-1' }) });

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.initialize = initializeMock;
    supabase.auth.startAutoRefresh = startAutoRefreshMock;
    supabase.auth.getSession = getSessionMock;
    getSessionMock.mockResolvedValue({ data: { session }, error: null });
  });

  test('returns session and user when valid session exists and id matches', async () => {
    const result = await checkAuthentication('user-1');

    expect(result).toEqual({ session, user: session.user });
    expect(handleError).not.toHaveBeenCalled();
  });

  test('returns session when no expected user id is provided', async () => {
    const result = await checkAuthentication();

    expect(result).toEqual({ session, user: session.user });
    expect(handleError).not.toHaveBeenCalled();
  });

  test('throws an error and calls handleError when no session', async () => {
    getSessionMock.mockResolvedValueOnce({ data: { session: null }, error: null });

    await expect(checkAuthentication('user-1')).rejects.toThrow('User must be authenticated');
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        analyticsEventName: 'Auth_Required',
        sentrySeverity: 'info',
      }),
    );
  });

  test('throws an error and calls handleError when user ID mismatches', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: createSessionMock({ user: createUserMock({ id: 'user-2' }) }) },
      error: null,
    });

    await expect(checkAuthentication('user-1')).rejects.toThrow('User ID mismatch');
    expect(handleError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        analyticsEventName: 'Auth_User_Mismatch',
        sentrySeverity: 'info',
      }),
    );
  });

  test('logs and rejects when getSession fails with network error', async () => {
    const networkError = new Error('Network error');
    getSessionMock.mockRejectedValueOnce(networkError);

    await expect(checkAuthentication('user-1')).rejects.toThrow(networkError);
    expect(handleError).toHaveBeenCalledWith(
      networkError,
      expect.objectContaining({
        sentrySeverity: 'error',
      }),
    );
  });
});

describe('fetchWithTimeout', () => {
  const realFetch = global.fetch;

  afterEach(() => {
    global.fetch = realFetch;
    jest.useRealTimers();
  });

  /** A request that never answers, and rejects as expo/fetch does once cancelled. */
  const installHangingFetch = (): void => {
    global.fetch = ((_input: unknown, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(new Error('fetch failed: Fetch request has been canceled'));
        });
      })) as typeof fetch;
  };

  test('the deadline rejects with a TimeoutError of its own', async () => {
    jest.useFakeTimers();
    installHangingFetch();

    const pending = fetchWithTimeout('https://example.test/rest/v1/articles');
    jest.advanceTimersByTime(SUPABASE_REQUEST_TIMEOUT_MS);

    await expect(pending).rejects.toMatchObject({
      name: 'TimeoutError',
      message: `Request timed out after ${SUPABASE_REQUEST_TIMEOUT_MS} ms`,
    });
  });

  test("a caller's own abort comes through as it was", async () => {
    installHangingFetch();
    const controller = new AbortController();

    const pending = fetchWithTimeout('https://example.test/rest/v1/articles', {
      signal: controller.signal,
    });
    controller.abort();

    await expect(pending).rejects.toThrow('fetch failed: Fetch request has been canceled');
  });
});
