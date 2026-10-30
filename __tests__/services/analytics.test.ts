/**
 * Analytics Service Tests
 *
 * Tests the analytics service which provides Mixpanel integration with:
 * - Lazy initialization (only initializes on first use, and only with consent)
 * - Silent operation (graceful fallback when Mixpanel unavailable)
 * - Event tracking
 * - User identification
 * - Convenience methods for common events
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.fn() for mock creation (already type-safe)
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { beforeAll, beforeEach, describe, test, expect, jest } from '@jest/globals';

// Mock Mixpanel before importing service
const mockInit = jest.fn(async (..._args: unknown[]) => undefined);
const mockIdentify = jest.fn(async (..._args: unknown[]) => undefined);
const mockTrack = jest.fn(async (..._args: unknown[]) => undefined);
const mockReset = jest.fn(async (..._args: unknown[]) => undefined);
const mockSetPeople = jest.fn();
const mockGetPeople = jest.fn(async (..._args: unknown[]) => ({ set: mockSetPeople }));

const mockRegisterSuperProperties = jest.fn();
const mockHasOptedOutTracking = jest.fn(async (..._args: unknown[]) => false);
const mockOptInTracking = jest.fn();
const mockOptOutTracking = jest.fn();

const MockMixpanel = jest.fn((..._args: unknown[]) => ({
  init: mockInit,
  identify: mockIdentify,
  track: mockTrack,
  reset: mockReset,
  getPeople: mockGetPeople,
  registerSuperProperties: mockRegisterSuperProperties,
  hasOptedOutTracking: mockHasOptedOutTracking,
  optInTracking: mockOptInTracking,
  optOutTracking: mockOptOutTracking,
}));

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
import { saveConsent } from '@/services/consent';

describe('analytics service', () => {
  beforeAll(async () => {
    await saveConsent({ analytics: true, measurement: false });
  });

  // resetMocks empties the implementations above before every test, and a Mixpanel
  // constructed from an empty mock has no methods: every call would then "not
  // throw" only because the failure was swallowed.
  beforeEach(() => {
    MockMixpanel.mockImplementation((..._args: unknown[]) => ({
      init: mockInit,
      identify: mockIdentify,
      track: mockTrack,
      reset: mockReset,
      getPeople: mockGetPeople,
      registerSuperProperties: mockRegisterSuperProperties,
      hasOptedOutTracking: mockHasOptedOutTracking,
      optInTracking: mockOptInTracking,
      optOutTracking: mockOptOutTracking,
    }));
    mockGetPeople.mockImplementation(async () => ({ set: mockSetPeople }));
  });

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

      expect(mockTrack).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.APP_OPENED, { prop: 'value' });
    });

    test('should call identify without throwing', async () => {
      await expect(analytics.identify('user-123')).resolves.not.toThrow();
      await expect(
        analytics.identify('user-123', { email: 'test@example.com' }),
      ).resolves.not.toThrow();

      expect(mockIdentify).toHaveBeenLastCalledWith('user-123');
      expect(mockSetPeople).toHaveBeenCalledWith({ email: 'test@example.com' });
    });

    test('should call reset without throwing', async () => {
      await expect(analytics.reset()).resolves.not.toThrow();

      expect(mockReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Convenience Methods', () => {
    test('should call trackSignIn without throwing', async () => {
      await expect(analytics.trackSignIn()).resolves.not.toThrow();
      await expect(analytics.trackSignIn('google')).resolves.not.toThrow();

      expect(mockTrack).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.SIGN_IN, { method: 'google' });
    });

    test('should call trackSignUp without throwing', async () => {
      await expect(analytics.trackSignUp()).resolves.not.toThrow();
      await expect(analytics.trackSignUp('apple')).resolves.not.toThrow();

      expect(mockTrack).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.SIGN_UP, { method: 'apple' });
    });

    test('should call trackSignOut without throwing', async () => {
      await expect(analytics.trackSignOut()).resolves.not.toThrow();

      expect(mockTrack).toHaveBeenLastCalledWith(ANALYTICS_EVENTS.SIGN_OUT, undefined);
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
      mockTrack.mockRejectedValueOnce(new Error('Track failed'));
      mockIdentify.mockRejectedValueOnce(new Error('Identify failed'));
      mockReset.mockRejectedValueOnce(new Error('Reset failed'));

      await expect(analytics.track(ANALYTICS_EVENTS.APP_OPENED)).resolves.not.toThrow();
      await expect(analytics.identify('user')).resolves.not.toThrow();
      await expect(analytics.reset()).resolves.not.toThrow();
    });

    test('should not throw from the consent controls when Mixpanel fails', async () => {
      mockHasOptedOutTracking.mockRejectedValueOnce(new Error('hasOptedOut failed'));
      mockRegisterSuperProperties.mockImplementationOnce(() => {
        throw new Error('register failed');
      });
      mockOptOutTracking.mockImplementationOnce(() => {
        throw new Error('optOut failed');
      });

      await expect(analytics.startTracking()).resolves.not.toThrow();
      await expect(analytics.registerInstallId('install-1')).resolves.not.toThrow();
      await saveConsent({ analytics: false, measurement: false });
      await expect(analytics.stopTracking()).resolves.not.toThrow();
      await saveConsent({ analytics: true, measurement: false });
    });
  });
});
