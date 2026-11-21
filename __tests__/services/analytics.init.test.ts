/**
 * Mixpanel is initialised once per launch, however many calls arrive first.
 *
 * Plain functions and a class rather than jest.fn: resetMocks empties a
 * jest.fn implementation before each test.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockMixpanel = {
  constructed: 0,
  inits: 0,
  failNextInit: false,
  /** What each instance was told, in order: registered super properties and tracked events. */
  calls: [] as unknown[][],
};

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
    track(event: string) {
      mockMixpanel.calls.push(['track', event]);
    }
    reset() {}
    async hasOptedOutTracking() {
      return false;
    }
    optInTracking() {}
    optOutTracking() {}
    registerSuperProperties(properties: Record<string, unknown>) {
      mockMixpanel.calls.push(['register', properties]);
    }
  },
}));

jest.mock('@/constants/analytics', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/constants/analytics'),
  MIXPANEL_TOKEN: 'test-token-123',
}));

import { ANALYTICS_EVENTS } from '@/constants/analytics';

type AnalyticsModule = typeof import('@/services/analytics');
type ConsentModule = typeof import('@/services/consent');

/**
 * A fresh copy of the service, so each test starts uninitialised, with analytics
 * allowed: initialisation is what these tests are about, and it needs consent.
 */
const loadAnalytics = async (): Promise<AnalyticsModule['analytics']> => {
  let loaded: AnalyticsModule | undefined;
  let consent: ConsentModule | undefined;
  jest.isolateModules(() => {
    consent = require('@/services/consent');
    loaded = require('@/services/analytics');
  });
  await consent!.saveConsent({ analytics: true, measurement: false });
  return loaded!.analytics;
};

describe('analytics initialisation', () => {
  beforeEach(() => {
    mockMixpanel.constructed = 0;
    mockMixpanel.inits = 0;
    mockMixpanel.failNextInit = false;
    mockMixpanel.calls = [];
  });

  test('concurrent first calls initialise Mixpanel once', async () => {
    const analytics = await loadAnalytics();

    await Promise.all([
      analytics.track(ANALYTICS_EVENTS.APP_OPENED),
      analytics.trackError('Some_Error'),
      analytics.trackSignIn(),
    ]);

    expect(mockMixpanel.constructed).toBe(1);
    expect(mockMixpanel.inits).toBe(1);
  });

  test('a failed initialisation is tried again by the next call', async () => {
    const analytics = await loadAnalytics();
    mockMixpanel.failNextInit = true;

    await analytics.trackError('First');
    await analytics.trackError('Second');

    expect(mockMixpanel.inits).toBe(2);
  });

  test('a failed initialisation sends nothing through the instance it left behind', async () => {
    const analytics = await loadAnalytics();
    mockMixpanel.failNextInit = true;

    await expect(analytics.trackError('First')).resolves.toBeUndefined();

    expect(mockMixpanel.inits).toBe(1);
  });

  // The system that follows installs joins on install_id, and drops an event
  // without it: the first one out has to carry it.
  test('install_id is registered before the first event goes out', async () => {
    const analytics = await loadAnalytics();

    await analytics.track(ANALYTICS_EVENTS.APP_OPENED);

    const [first, second] = mockMixpanel.calls;
    expect(first).toEqual(['register', { install_id: expect.any(String) }]);
    expect(second).toEqual(['track', ANALYTICS_EVENTS.APP_OPENED]);
  });

  test('never constructs Mixpanel for a call with no decision behind it', async () => {
    let analytics: AnalyticsModule['analytics'] | undefined;
    jest.isolateModules(() => {
      analytics = (require('@/services/analytics') as AnalyticsModule).analytics;
    });

    await analytics!.track(ANALYTICS_EVENTS.APP_OPENED);
    await analytics!.trackError('Some_Error');
    await analytics!.trackSignIn();
    await analytics!.reset();
    await analytics!.registerSuperProperties({ signed_in: true });
    await analytics!.startTracking();
    await analytics!.stopTracking();

    expect(mockMixpanel.constructed).toBe(0);
    expect(mockMixpanel.inits).toBe(0);
  });
});
