/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

/**
 * Integration tests for OAuth race condition fix
 *
 * These tests verify the waitForAuthEvent utility prevents the race condition where:
 * 1. OAuth succeeds and immediately tries to navigate
 * 2. Session state update is deferred via setTimeout (onAuthStateChange callback)
 * 3. waitForAuthEvent blocks navigation until SIGNED_IN event fires
 * 4. Tabs layout sees valid session and doesn't redirect back to login
 *
 * The fix ensures navigation only happens after the auth state is confirmed,
 * preventing users from having to sign in twice.
 */

// Mock Supabase
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

describe('OAuth Race Condition Prevention', () => {
  const mockSession: Session = {
    access_token: 'test-token',
    refresh_token: 'refresh-token',
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: 'bearer',
    user: {
      id: 'user-123',
      email: 'test@example.com',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Race Condition Scenario', () => {
    test('should prevent double login by waiting for deferred session state update', async () => {
      /**
       * This test simulates the exact race condition that was fixed:
       *
       * Timeline WITHOUT fix:
       * 0ms:  OAuth succeeds → navigate immediately
       * 0ms:  Tabs layout renders
       * 1ms:  Check session → null (state not updated yet)
       * 1ms:  Redirect back to /auth
       * 100ms: setTimeout fires, session state updates (too late!)
       *
       * Timeline WITH fix:
       * 0ms:  OAuth succeeds
       * 0ms:  waitForAuthEvent starts listening
       * 1ms:  Navigation BLOCKED waiting for event
       * 100ms: setTimeout fires, SIGNED_IN event fires
       * 100ms: waitForAuthEvent resolves
       * 101ms: Navigate to app
       * 102ms: Tabs layout checks session → valid!
       */

      let callback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
      const mockUnsubscribe = jest.fn();

      // Setup mock that captures the callback and simulates deferred state update
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

      // Start waiting for auth event (this is what OAuth hooks do now)
      const waitPromise = waitForAuthEvent('SIGNED_IN', 5000);

      // At this point, waitPromise should NOT be resolved yet
      // Navigation should NOT happen yet

      let resolved = false;
      waitPromise.then(() => {
        resolved = true;
      });

      // Advance time slightly - promise should still not be resolved
      jest.advanceTimersByTime(50);
      await Promise.resolve(); // Flush promises

      expect(resolved).toBe(false);
      expect(mockUnsubscribe).not.toHaveBeenCalled();

      // Simulate the deferred state update (like setTimeout in onAuthStateChange)
      // This happens after ~100ms in the real flow
      jest.advanceTimersByTime(50);
      callback!('SIGNED_IN' as AuthChangeEvent, mockSession);

      // Now the promise should resolve
      const result = await waitPromise;

      expect(result).toBe(mockSession);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    test('should handle timeout gracefully if event never fires', async () => {
      /**
       * Tests graceful degradation - if the event doesn't fire within timeout,
       * we still navigate (better than being stuck on login screen)
       */

      const mockUnsubscribe = jest.fn();

      mockOnAuthStateChange.mockImplementation(() => {
        // Never call the callback - simulate event not firing
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      });

      const waitPromise = waitForAuthEvent('SIGNED_IN', 1000);

      // Advance past timeout
      jest.advanceTimersByTime(1000);

      // Should reject with timeout error
      await expect(waitPromise).rejects.toThrow('Timeout waiting for SIGNED_IN event');

      // Should clean up subscription
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    test('should not block navigation if event fires immediately', async () => {
      /**
       * Tests the case where the event fires very quickly (< 10ms)
       * This can happen if the session was already in localStorage
       */

      const mockUnsubscribe = jest.fn();

      mockOnAuthStateChange.mockImplementation(callback => {
        const result = {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };

        // Fire event almost immediately (after 10ms)
        setTimeout(() => {
          callback('SIGNED_IN' as AuthChangeEvent, mockSession);
        }, 10);

        return result;
      });

      const startTime = Date.now();
      const waitPromise = waitForAuthEvent('SIGNED_IN', 5000);

      // Advance to trigger the event
      jest.advanceTimersByTime(10);

      const result = await waitPromise;
      const elapsedTime = Date.now() - startTime;

      expect(result).toBe(mockSession);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
      // Should resolve quickly (< 100ms in real time)
      expect(elapsedTime).toBeLessThan(100);
    });

    test('should ignore wrong event types', async () => {
      /**
       * Tests that we only resolve on SIGNED_IN, not other events like TOKEN_REFRESHED
       */

      let callback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
      const mockUnsubscribe = jest.fn();

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

      const waitPromise = waitForAuthEvent('SIGNED_IN', 5000);

      // Fire wrong events
      callback!('TOKEN_REFRESHED' as AuthChangeEvent, mockSession);
      jest.advanceTimersByTime(50);

      callback!('USER_UPDATED' as AuthChangeEvent, mockSession);
      jest.advanceTimersByTime(50);

      // Promise should still be pending
      let resolved = false;
      waitPromise.then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);

      // Now fire correct event
      callback!('SIGNED_IN' as AuthChangeEvent, mockSession);

      const result = await waitPromise;
      expect(result).toBe(mockSession);
    });
  });

  describe('Integration with OAuth flow', () => {
    test('demonstrates the complete OAuth flow with waitForAuthEvent', async () => {
      /**
       * This test documents the full OAuth flow:
       * 1. OAuth provider returns ID token
       * 2. Supabase exchanges token for session
       * 3. onAuthStateChange fires with SIGNED_IN event (deferred)
       * 4. waitForAuthEvent waits for event
       * 5. Navigation proceeds only after event confirmed
       */

      let authCallback: ((event: AuthChangeEvent, session: Session | null) => void) | null = null;
      const mockUnsubscribe = jest.fn();

      mockOnAuthStateChange.mockImplementation(cb => {
        authCallback = cb;
        return {
          data: {
            subscription: {
              unsubscribe: mockUnsubscribe,
            },
          },
        };
      });

      // Step 1: OAuth succeeds (happens in OAuth hook)
      const oauthIdToken = 'google-id-token';

      // Step 2: Exchange token with Supabase (happens in OAuth hook)
      // supabase.auth.signInWithIdToken({ provider: 'google', token: oauthIdToken })
      // Returns: { data: { user, session }, error: null }

      // Step 3: Wait for auth state change (THIS IS THE FIX)
      const waitPromise = waitForAuthEvent('SIGNED_IN', 3000);

      // Navigation should be BLOCKED here
      let canNavigate = false;
      waitPromise.then(() => {
        canNavigate = true;
      });

      // Step 4: Simulate deferred onAuthStateChange callback
      // In real code, this is wrapped in setTimeout(..., 0) in useProvideAuth
      jest.advanceTimersByTime(100);
      authCallback!('SIGNED_IN' as AuthChangeEvent, mockSession);

      // Step 5: Wait completes, navigation can proceed
      await waitPromise;
      expect(canNavigate).toBe(true);

      // Step 6: router.replace('/(tabs)/explore') executes
      // Step 7: Tabs layout checks session → sees valid session
      // Step 8: No redirect back to login! ✅
    });
  });
});
