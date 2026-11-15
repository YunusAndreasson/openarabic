/**
 * Analytics Service Tests
 *
 * Tests the analytics service which provides Mixpanel integration with:
 * - Lazy initialization (only initializes on first use)
 * - Silent operation (graceful fallback when Mixpanel unavailable)
 * - Event tracking
 * - No user identification: events stay on the anonymous device id
 * - Convenience methods for common events
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.fn() for mock creation (already type-safe)
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import type { Mixpanel, People } from 'mixpanel-react-native';

import { describe, test, expect, jest } from '@jest/globals';

// Mock Mixpanel before importing service
const mockInit = jest.fn<Mixpanel['init']>(async () => undefined);
const mockIdentify = jest.fn<Mixpanel['identify']>(async () => undefined);
const mockTrack = jest.fn<Mixpanel['track']>();
const mockReset = jest.fn<Mixpanel['reset']>();
const mockSetPeople = jest.fn((..._args: unknown[]): ReturnType<People['set']> => undefined);
const mockGetPeople = jest.fn((): Pick<ReturnType<Mixpanel['getPeople']>, 'set'> => ({
  set: mockSetPeople,
}));

// A plain class, not jest.fn: resetMocks empties a jest.fn implementation
// before each test, which would leave the constructed instance without methods.
// The methods are the spies above, so each test can still assert on them.
class MockMixpanel {
  init = mockInit;
  identify = mockIdentify;
  track = mockTrack;
  reset = mockReset;
  getPeople = mockGetPeople;
}

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: MockMixpanel,
}));

// Spread the real module: only the token needs faking, and replacing it
// wholesale silently drops ANALYTICS_EVENTS, which the service reads for its
// event names.
jest.mock('@/constants/analytics', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/constants/analytics'),
  MIXPANEL_TOKEN: 'test-token-123',
}));

// Import service after mocks
import { analytics } from '@/services/analytics';
import { ANALYTICS_EVENTS } from '@/constants/analytics';

describe('analytics service', () => {
  /**
   * Analytics service is designed to fail silently.
   * The primary goal is to ensure it never throws errors, even when:
   * - Mixpanel is not available
   * - Token is missing
   * - Network fails
   * - Methods throw errors
   */

  describe('Core Functionality', () => {
    test('should call track without throwing', async () => {
      await expect(analytics.track(ANALYTICS_EVENTS.APP_OPENED)).resolves.not.toThrow();
      await expect(
        analytics.track(ANALYTICS_EVENTS.APP_OPENED, { prop: 'value' }),
      ).resolves.not.toThrow();
    });

    test('should call reset without throwing', async () => {
      await expect(analytics.reset()).resolves.not.toThrow();
    });
  });

  describe('Anonymity', () => {
    test('exposes no identify or people-profile method', () => {
      expect(analytics).not.toHaveProperty('identify');
      expect(analytics).not.toHaveProperty('getPeople');
    });

    test('never identifies the user or writes a people profile', async () => {
      await analytics.track(ANALYTICS_EVENTS.APP_OPENED);
      await analytics.trackError('Some_Error');
      await analytics.trackSignUp('email');
      await analytics.trackSignIn('google');
      await analytics.trackSignOut();
      await analytics.reset();

      expect(mockTrack).toHaveBeenCalled();
      expect(mockIdentify).not.toHaveBeenCalled();
      expect(mockGetPeople).not.toHaveBeenCalled();
      expect(mockSetPeople).not.toHaveBeenCalled();
    });

    test('auth events carry the method and nothing else', async () => {
      await analytics.trackSignIn('apple');
      await analytics.trackSignUp('email');
      await analytics.trackSignOut();

      expect(mockTrack).toHaveBeenCalledWith(ANALYTICS_EVENTS.SIGN_IN, { method: 'apple' });
      expect(mockTrack).toHaveBeenCalledWith(ANALYTICS_EVENTS.SIGN_UP, { method: 'email' });
      expect(mockTrack).toHaveBeenCalledWith(ANALYTICS_EVENTS.SIGN_OUT, undefined);
    });

    test('reset starts a fresh anonymous id', async () => {
      await analytics.reset();

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Convenience Methods', () => {
    test('should call trackSignIn without throwing', async () => {
      await expect(analytics.trackSignIn()).resolves.not.toThrow();
      await expect(analytics.trackSignIn('google')).resolves.not.toThrow();
    });

    test('should call trackSignUp without throwing', async () => {
      await expect(analytics.trackSignUp()).resolves.not.toThrow();
      await expect(analytics.trackSignUp('apple')).resolves.not.toThrow();
    });

    test('should call trackSignOut without throwing', async () => {
      await expect(analytics.trackSignOut()).resolves.not.toThrow();
    });
  });

  describe('Property Types Support', () => {
    test('should accept various property types', async () => {
      await expect(
        analytics.track(ANALYTICS_EVENTS.APP_OPENED, {
          string: 'value',
          number: 42,
          boolean: true,
          nullValue: null,
          undefinedValue: undefined,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('Error Resilience', () => {
    test('should handle errors from mocked functions', async () => {
      mockInit.mockRejectedValueOnce(new Error('Init failed'));
      mockTrack.mockImplementationOnce(() => {
        throw new Error('Track failed');
      });
      mockReset.mockImplementationOnce(() => {
        throw new Error('Reset failed');
      });

      await expect(analytics.track(ANALYTICS_EVENTS.APP_OPENED)).resolves.not.toThrow();
      await expect(analytics.reset()).resolves.not.toThrow();
    });
  });
});
