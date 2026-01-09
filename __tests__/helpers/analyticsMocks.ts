/**
 * Analytics Mock Utilities
 *
 * Provides utilities for testing Mixpanel analytics events.
 * Allows tests to verify that correct events are tracked with proper properties.
 *
 * Usage:
 * ```typescript
 * import { createAnalyticsMock, expectAnalyticsEvent } from '@/__tests__/helpers/analyticsMocks';
 *
 * const analyticsMock = createAnalyticsMock();
 *
 * jest.mock('@/services/analytics', () => ({
 *   analytics: analyticsMock,
 * }));
 *
 * // In test
 * await userAction();
 * expectAnalyticsEvent(analyticsMock, 'Audio Playback Started', {
 *   article_id: 1,
 * });
 * ```
 *
 * Modern Jest 29 Patterns:
 * - Type-safe event tracking
 * - Fluent assertion helpers
 */

import { jest } from '@jest/globals';

import type { ANALYTICS_EVENTS } from '@/constants/analytics';

// ============================================================================
// TYPES
// ============================================================================

type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

interface TrackedEvent {
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
}

interface AnalyticsMock {
  track: jest.Mock<(name: string, properties?: Record<string, unknown>) => void>;
  identify: jest.Mock<(userId: string, properties?: Record<string, unknown>) => void>;
  reset: jest.Mock<() => Promise<void>>;
  trackSignIn: jest.Mock<(method: string) => void>;
  trackSignUp: jest.Mock<(method: string) => void>;
  trackSignOut: jest.Mock<() => Promise<void>>;
  trackScreenView: jest.Mock<(screenName: string) => void>;
  setUserProperties: jest.Mock<(properties: Record<string, unknown>) => void>;

  // Test utilities (not part of actual analytics service)
  _trackedEvents: TrackedEvent[];
  _getTrackedEvents: () => TrackedEvent[];
  _getEventsByName: (name: string) => TrackedEvent[];
  _clearTrackedEvents: () => void;
  _wasEventTracked: (name: string) => boolean;
}

// ============================================================================
// MOCK FACTORY
// ============================================================================

/**
 * Creates a comprehensive mock for the analytics service with event tracking
 *
 * @example
 * const analyticsMock = createAnalyticsMock();
 * // Later: verify events were tracked
 * expect(analyticsMock._wasEventTracked('Audio Playback Started')).toBe(true);
 */
export function createAnalyticsMock(): AnalyticsMock {
  const trackedEvents: TrackedEvent[] = [];

  const trackFn = jest.fn((name: string, properties: Record<string, unknown> = {}) => {
    trackedEvents.push({
      name,
      properties,
      timestamp: Date.now(),
    });
  });

  return {
    track: trackFn,
    identify: jest.fn(),
    reset: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    trackSignIn: jest.fn((method: string) => {
      trackFn('Sign In', { method });
    }),
    trackSignUp: jest.fn((method: string) => {
      trackFn('Sign Up', { method });
    }),
    trackSignOut: jest.fn<() => Promise<void>>().mockImplementation(async () => {
      trackFn('Sign Out', {});
    }),
    trackScreenView: jest.fn((screenName: string) => {
      trackFn('Screen Viewed', { screen_name: screenName });
    }),
    setUserProperties: jest.fn(),

    // Test utilities
    _trackedEvents: trackedEvents,
    _getTrackedEvents: () => [...trackedEvents],
    _getEventsByName: (name: string) => trackedEvents.filter(e => e.name === name),
    _clearTrackedEvents: () => {
      trackedEvents.length = 0;
    },
    _wasEventTracked: (name: string) => trackedEvents.some(e => e.name === name),
  };
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Asserts that a specific analytics event was tracked
 *
 * @param mock - The analytics mock instance
 * @param eventName - Expected event name
 * @param expectedProperties - Optional properties to match (partial match)
 *
 * @example
 * expectAnalyticsEvent(analyticsMock, 'Audio Playback Started', {
 *   article_id: 1,
 * });
 */
export function expectAnalyticsEvent(
  mock: AnalyticsMock,
  eventName: string,
  expectedProperties?: Record<string, unknown>,
): void {
  const events = mock._getEventsByName(eventName);

  if (events.length === 0) {
    const allEvents = mock._getTrackedEvents();
    const eventNames = allEvents.map(e => e.name).join(', ') || '(none)';
    throw new Error(
      `Expected event "${eventName}" to be tracked, but it was not.\n` +
        `Tracked events: ${eventNames}`,
    );
  }

  if (expectedProperties) {
    const matchingEvent = events.find(event => {
      return Object.entries(expectedProperties).every(
        ([key, value]) => event.properties[key] === value,
      );
    });

    if (!matchingEvent) {
      const actualProps = events.map(e => JSON.stringify(e.properties)).join('\n  ');
      throw new Error(
        `Event "${eventName}" was tracked but properties don't match.\n` +
          `Expected: ${JSON.stringify(expectedProperties)}\n` +
          `Actual events:\n  ${actualProps}`,
      );
    }
  }
}

/**
 * Asserts that a specific analytics event was NOT tracked
 */
export function expectNoAnalyticsEvent(mock: AnalyticsMock, eventName: string): void {
  if (mock._wasEventTracked(eventName)) {
    const events = mock._getEventsByName(eventName);
    throw new Error(
      `Expected event "${eventName}" NOT to be tracked, but it was tracked ${events.length} time(s)`,
    );
  }
}

/**
 * Asserts the exact number of times an event was tracked
 */
export function expectAnalyticsEventCount(
  mock: AnalyticsMock,
  eventName: string,
  expectedCount: number,
): void {
  const actualCount = mock._getEventsByName(eventName).length;
  if (actualCount !== expectedCount) {
    throw new Error(
      `Expected event "${eventName}" to be tracked ${expectedCount} time(s), ` +
        `but it was tracked ${actualCount} time(s)`,
    );
  }
}

/**
 * Gets all tracked events for manual inspection
 */
export function getTrackedEvents(mock: AnalyticsMock): TrackedEvent[] {
  return mock._getTrackedEvents();
}

/**
 * Clears all tracked events (useful for isolation between tests)
 */
export function clearTrackedEvents(mock: AnalyticsMock): void {
  mock._clearTrackedEvents();
}

// ============================================================================
// JEST MATCHERS (for use with expect.extend)
// ============================================================================

/**
 * Custom Jest matchers for analytics testing
 *
 * Usage:
 * ```typescript
 * // In jest.setup.js or test file
 * expect.extend(analyticsMatchers);
 *
 * // In tests
 * expect(analyticsMock).toHaveTrackedEvent('Audio Playback Started');
 * ```
 */
export const analyticsMatchers = {
  toHaveTrackedEvent(
    received: AnalyticsMock,
    eventName: string,
    expectedProperties?: Record<string, unknown>,
  ) {
    const events = received._getEventsByName(eventName);
    const pass = expectedProperties
      ? events.some(event =>
          Object.entries(expectedProperties).every(
            ([key, value]) => event.properties[key] === value,
          ),
        )
      : events.length > 0;

    return {
      pass,
      message: () =>
        pass
          ? `Expected event "${eventName}" not to be tracked`
          : `Expected event "${eventName}" to be tracked` +
            (expectedProperties ? ` with properties ${JSON.stringify(expectedProperties)}` : ''),
    };
  },

  toHaveTrackedEventCount(received: AnalyticsMock, eventName: string, expectedCount: number) {
    const actualCount = received._getEventsByName(eventName).length;
    const pass = actualCount === expectedCount;

    return {
      pass,
      message: () =>
        pass
          ? `Expected event "${eventName}" not to be tracked ${expectedCount} time(s)`
          : `Expected event "${eventName}" to be tracked ${expectedCount} time(s), but was tracked ${actualCount} time(s)`,
    };
  },
};

// ============================================================================
// MODULE MOCK FACTORY
// ============================================================================

/**
 * Creates a complete module mock for jest.mock('@/services/analytics')
 *
 * @example
 * jest.mock('@/services/analytics', () =>
 *   require('@/__tests__/helpers/analyticsMocks').createAnalyticsModuleMock()
 * );
 */
export function createAnalyticsModuleMock() {
  const mock = createAnalyticsMock();
  return {
    analytics: mock,
    _mock: mock, // Expose for test assertions
  };
}
