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
  initArgs: [] as unknown[][],
};
const mockServerUrl: { value: string | undefined } = { value: undefined };

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: class {
    constructor() {
      mockMixpanel.constructed++;
    }
    async init(...args: unknown[]) {
      mockMixpanel.inits++;
      mockMixpanel.initArgs.push(args);
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
    async hasOptedOutTracking() {
      return false;
    }
    optInTracking() {}
    optOutTracking() {}
    registerSuperProperties() {}
  },
}));

jest.mock('@/constants/analytics', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/constants/analytics'),
  MIXPANEL_TOKEN: 'test-token-123',
  get MIXPANEL_SERVER_URL() {
    return mockServerUrl.value;
  },
}));

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
    mockMixpanel.initArgs = [];
    mockServerUrl.value = undefined;
  });

  test('concurrent first calls initialise Mixpanel once', async () => {
    const analytics = await loadAnalytics();

    await Promise.all([
      analytics.identify('user-1'),
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

  // The SDK's default applies only for `undefined`: the project's region isn't
  // known yet, and a wrong endpoint would lose everything sent to it.
  test('leaves the SDK default server in place when no URL is configured', async () => {
    const analytics = await loadAnalytics();

    await analytics.trackError('Some_Error');

    expect(mockMixpanel.initArgs).toEqual([[false, {}, undefined]]);
  });

  test('passes the configured server URL to init', async () => {
    mockServerUrl.value = 'https://api-eu.mixpanel.com';
    const analytics = await loadAnalytics();

    await analytics.trackError('Some_Error');

    expect(mockMixpanel.initArgs).toEqual([[false, {}, 'https://api-eu.mixpanel.com']]);
  });

  test('never constructs Mixpanel for a call with no decision behind it', async () => {
    let analytics: AnalyticsModule['analytics'] | undefined;
    jest.isolateModules(() => {
      analytics = (require('@/services/analytics') as AnalyticsModule).analytics;
    });

    await analytics!.identify('user-1');
    await analytics!.trackError('Some_Error');
    await analytics!.trackSignIn();
    await analytics!.reset();
    await analytics!.startTracking();
    await analytics!.stopTracking();
    await analytics!.registerInstallId('install-1');

    expect(mockMixpanel.constructed).toBe(0);
    expect(mockMixpanel.inits).toBe(0);
  });
});
