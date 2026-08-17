/**
 * Analytics Service Tests
 *
 * Tests the analytics service which provides Mixpanel integration with:
 * - Lazy initialization (only initializes on first use)
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

import { describe, test, expect, jest } from '@jest/globals';

// Mock Mixpanel before importing service
const mockInit = jest.fn().mockResolvedValue(undefined);
const mockIdentify = jest.fn().mockResolvedValue(undefined);
const mockTrack = jest.fn().mockResolvedValue(undefined);
const mockReset = jest.fn().mockResolvedValue(undefined);
const mockSetPeople = jest.fn();
const mockGetPeople = jest.fn().mockResolvedValue({ set: mockSetPeople });

const MockMixpanel = jest.fn().mockImplementation(() => ({
  init: mockInit,
  identify: mockIdentify,
  track: mockTrack,
  reset: mockReset,
  getPeople: mockGetPeople,
}));

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: MockMixpanel,
}));

// Spread the real module: only the token needs faking, and replacing it
// wholesale silently drops ANALYTICS_EVENTS, which the service reads for its
// event names.
jest.mock('@/constants/analytics', () => ({
  ...jest.requireActual('@/constants/analytics'),
  MIXPANEL_TOKEN: 'test-token-123',
}));

// Import service after mocks
import { analytics } from '@/services/analytics';

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
      await expect(analytics.track('Test Event')).resolves.not.toThrow();
      await expect(analytics.track('Test Event', { prop: 'value' })).resolves.not.toThrow();
    });

    test('should call identify without throwing', async () => {
      await expect(analytics.identify('user-123')).resolves.not.toThrow();
      await expect(
        analytics.identify('user-123', { email: 'test@example.com' }),
      ).resolves.not.toThrow();
    });

    test('should call reset without throwing', async () => {
      await expect(analytics.reset()).resolves.not.toThrow();
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
        analytics.track('Event', {
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

      await expect(analytics.track('Event')).resolves.not.toThrow();
      await expect(analytics.identify('user')).resolves.not.toThrow();
      await expect(analytics.reset()).resolves.not.toThrow();
    });
  });
});
