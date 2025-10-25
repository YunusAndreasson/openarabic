import { jest } from '@jest/globals';

import { checkAuthentication, supabase } from '../../services/supabase';
import { handleError } from '../../utils/errorHandling';

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
  const initializeMock = jest.fn();
  const getSessionMock = jest.fn();
  const startAutoRefreshMock = jest.fn();
  const session = { user: { id: 'user-1' } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.initialize = initializeMock;
    supabase.auth.startAutoRefresh = startAutoRefreshMock;
    supabase.auth.getSession = getSessionMock;
    getSessionMock.mockResolvedValue({ data: { session }, error: null });
  });

  it('returns session and user when valid session exists and id matches', async () => {
    const result = await checkAuthentication('user-1');

    expect(result).toEqual({ session, user: session.user });
    expect(handleError).not.toHaveBeenCalled();
  });

  it('returns session when no expected user id is provided', async () => {
    const result = await checkAuthentication();

    expect(result).toEqual({ session, user: session.user });
    expect(handleError).not.toHaveBeenCalled();
  });

  it('throws an error and calls handleError when no session', async () => {
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

  it('throws an error and calls handleError when user ID mismatches', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-2' } } },
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

  it('logs and rejects when getSession fails with network error', async () => {
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
