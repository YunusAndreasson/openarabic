import { renderHook, act } from '@testing-library/react-native';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';

const flushPromises = () => new Promise(resolve => setImmediate(resolve));

import { useProvideAuth } from './useProvideAuth';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

jest.mock('@/services/supabase', () => {
  const auth = {
    initialize: jest.fn().mockResolvedValue(undefined),
    startAutoRefresh: jest.fn(),
    getSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: '1' } } },
      error: null,
    }),
    refreshSession: jest.fn().mockResolvedValue({
      data: { session: { user: { id: '2' } } },
      error: null,
    }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  };

  return {
    supabase: { auth },
    setupSupabaseAppStateListener: jest.fn(() => jest.fn()),
  };
});

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

// NetInfo and Sentry are mocked via __mocks__

describe('useProvideAuth', () => {
  beforeEach(() => {
    jest.useRealTimers();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: jest.fn() });
  });

  afterAll(() => {
    jest.useFakeTimers();
  });
  it('initializes with session on mount', async () => {
    const { result } = renderHook(() => useProvideAuth());
    await act(flushPromises);

    expect(result.current.session).toEqual({ user: { id: '1' } });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('refreshSession updates the session when connected', async () => {
    const { result } = renderHook(() => useProvideAuth());
    await act(flushPromises);

    await act(async () => {
      await result.current.refreshSession();
    });

    expect(result.current.session).toEqual({ user: { id: '2' } });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('refreshSession returns null when offline', async () => {
    const NetInfo = require('@react-native-community/netinfo').default;
    NetInfo.fetch.mockResolvedValueOnce({ isConnected: false });

    const { result } = renderHook(() => useProvideAuth());
    await act(flushPromises);

    let newSession: Session | null | string = 'not null';
    await act(async () => {
      newSession = await result.current.refreshSession();
    });

    expect(newSession).toBeNull();
    const { supabase } = require('@/services/supabase');
    expect(supabase.auth.refreshSession).not.toHaveBeenCalled();
  });
});
