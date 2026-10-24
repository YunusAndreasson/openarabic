/**
 * Mixpanel is initialised once per launch, however many calls arrive first.
 *
 * Plain functions and a class rather than jest.fn: resetMocks empties a
 * jest.fn implementation before each test.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockMixpanel = { constructed: 0, inits: 0, failNextInit: false };

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: class {
    constructor() {
      mockMixpanel.constructed++;
    }
    async init() {
      mockMixpanel.inits++;
      await new Promise(resolve => setTimeout(resolve, 5));
      if (mockMixpanel.failNextInit) {
        mockMixpanel.failNextInit = false;
        throw new Error('init failed');
      }
    }
    async identify() {}
    async track() {}
    async reset() {}
    async getPeople() {
      return { set: () => undefined };
    }
  },
}));

jest.mock('@/constants/analytics', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/constants/analytics'),
  MIXPANEL_TOKEN: 'test-token-123',
}));

type AnalyticsModule = typeof import('@/services/analytics');

/** A fresh copy of the service, so each test starts uninitialised. */
const loadAnalytics = (): AnalyticsModule['analytics'] => {
  let loaded: AnalyticsModule | undefined;
  jest.isolateModules(() => {
    loaded = require('@/services/analytics');
  });
  return loaded!.analytics;
};

describe('analytics initialisation', () => {
  beforeEach(() => {
    mockMixpanel.constructed = 0;
    mockMixpanel.inits = 0;
    mockMixpanel.failNextInit = false;
  });

  test('concurrent first calls initialise Mixpanel once', async () => {
    const analytics = loadAnalytics();

    await Promise.all([
      analytics.identify('user-1'),
      analytics.trackError('Some_Error'),
      analytics.trackSignIn(),
    ]);

    expect(mockMixpanel.constructed).toBe(1);
    expect(mockMixpanel.inits).toBe(1);
  });

  test('a failed initialisation is tried again by the next call', async () => {
    const analytics = loadAnalytics();
    mockMixpanel.failNextInit = true;

    await analytics.trackError('First');
    await analytics.trackError('Second');

    expect(mockMixpanel.inits).toBe(2);
  });
});
