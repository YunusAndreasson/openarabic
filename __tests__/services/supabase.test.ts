/**
 * Service Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 * - Note: test.concurrent() used where tests are independent
 */

import { jest } from '@jest/globals';

import { checkAuthentication, supabase } from '../../services/supabase';
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
