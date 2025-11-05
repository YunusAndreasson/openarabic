import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

// Mock Supabase - use jest.fn() inside the factory
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: jest.fn(),
    },
  },
}));

import { waitForAuthEvent } from '@/utils/authEventWaiter';
import { supabase } from '@/services/supabase';

// Get reference to the mocked function
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as jest.Mock;
const mockUnsubscribe = jest.fn();

describe('waitForAuthEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Default mock implementation
    mockOnAuthStateChange.mockImplementation(() => ({
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    }));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should resolve when SIGNED_IN event fires with session', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: 'user-123', email: 'test@example.com' },
    } as Session;

    // Capture the callback and simulate the event
    mockOnAuthStateChange.mockImplementation(callback => {
      // Trigger the event asynchronously
      setTimeout(() => {
        callback('SIGNED_IN' as AuthChangeEvent, mockSession);
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });

    const promise = waitForAuthEvent('SIGNED_IN', 5000);

    // Advance timers to trigger the callback
    jest.advanceTimersByTime(100);

    const result = await promise;

    expect(result).toBe(mockSession);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should timeout after specified duration', async () => {
    // Don't trigger any events - just let it timeout
    const promise = waitForAuthEvent('SIGNED_IN', 1000);

    // Advance past the timeout
    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow('Timeout waiting for SIGNED_IN event after 1000ms');
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe immediately on success', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: 'user-123' },
    } as Session;

    mockOnAuthStateChange.mockImplementation(callback => {
      // Return subscription first, then trigger callback asynchronously
      const result = {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };

      // Use setTimeout to ensure subscription is returned before callback is invoked
      setTimeout(() => {
        callback('SIGNED_IN' as AuthChangeEvent, mockSession);
      }, 0);

      return result;
    });

    const promise = waitForAuthEvent('SIGNED_IN', 5000);

    // Advance timers to trigger the callback
    jest.advanceTimersByTime(0);

    await promise;

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should only resolve on matching event (ignore other events)', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: 'user-123' },
    } as Session;

    let callback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

    mockOnAuthStateChange.mockImplementation(cb => {
      callback = cb;
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });

    const promise = waitForAuthEvent('SIGNED_IN', 5000);

    // Trigger wrong event first
    callback!('TOKEN_REFRESHED' as AuthChangeEvent, mockSession);

    // Give it a moment (shouldn't resolve yet)
    jest.advanceTimersByTime(50);

    // Now trigger correct event
    callback!('SIGNED_IN' as AuthChangeEvent, mockSession);

    const result = await promise;

    expect(result).toBe(mockSession);
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('should ignore events without session', async () => {
    let callback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;

    mockOnAuthStateChange.mockImplementation(cb => {
      callback = cb;
      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });

    const promise = waitForAuthEvent('SIGNED_IN', 1000);

    // Trigger event with null session
    callback!('SIGNED_IN' as AuthChangeEvent, null);

    // Should not resolve, should timeout
    jest.advanceTimersByTime(1000);

    await expect(promise).rejects.toThrow('Timeout waiting for SIGNED_IN event after 1000ms');
  });

  it('should use default timeout of 5000ms when not specified', async () => {
    const promise = waitForAuthEvent('SIGNED_IN'); // No timeout specified

    // Advance just before default timeout
    jest.advanceTimersByTime(4999);

    // Promise should not be rejected yet
    await Promise.race([
      promise.then(() => 'resolved'),
      Promise.resolve('not-yet'),
    ]).then(result => {
      expect(result).toBe('not-yet');
    });

    // Advance past default timeout
    jest.advanceTimersByTime(1);

    await expect(promise).rejects.toThrow('Timeout waiting for SIGNED_IN event after 5000ms');
  });

  it('should clear timeout when event fires before timeout', async () => {
    const mockSession = {
      access_token: 'test-token',
      user: { id: 'user-123' },
    } as Session;

    mockOnAuthStateChange.mockImplementation(callback => {
      // Trigger event after 100ms
      setTimeout(() => {
        callback('SIGNED_IN' as AuthChangeEvent, mockSession);
      }, 100);

      return {
        data: {
          subscription: {
            unsubscribe: mockUnsubscribe,
          },
        },
      };
    });

    const promise = waitForAuthEvent('SIGNED_IN', 5000);

    // Advance to trigger event
    jest.advanceTimersByTime(100);

    await promise;

    // Advance past original timeout - should not throw
    jest.advanceTimersByTime(5000);

    // If timeout wasn't cleared, this would fail
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1); // Only unsubscribed once
  });
});
