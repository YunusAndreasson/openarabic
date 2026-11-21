/**
 * The wrapper's two per-install additions to an event: `first_time` on the
 * first of each core action, and the super properties applied at init.
 *
 * A fresh copy of the wrapper (and its install record) per test. A plain class
 * and plain functions rather than jest.fn: resetMocks empties a jest.fn
 * implementation before each test.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

const mockMixpanel = {
  tracked: [] as [string, Record<string, unknown> | undefined][],
  registered: [] as Record<string, unknown>[],
};

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: class {
    async init() {}
    track(event: string, properties?: Record<string, unknown>) {
      mockMixpanel.tracked.push([event, properties]);
    }
    registerSuperProperties(properties: Record<string, unknown>) {
      mockMixpanel.registered.push(properties);
    }
    reset() {}
  },
}));

jest.mock('@/constants/analytics', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/constants/analytics'),
  MIXPANEL_TOKEN: 'test-token-123',
}));

const mockMemoryStore = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => mockMemoryStore.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    mockMemoryStore.set(key, value);
  },
}));

jest.mock('expo-application', () => ({
  // Installed a minute ago: a new install, whose firsts are all still to come.
  getInstallationTimeAsync: async () => new Date(Date.now() - 60 * 1000),
  getLastUpdateTimeAsync: async () => new Date(Date.now() - 60 * 1000),
}));

import { ANALYTICS_EVENTS } from '@/constants/analytics';

type AnalyticsModule = typeof import('@/services/analytics');

const loadAnalytics = (): AnalyticsModule['analytics'] => {
  let loaded: AnalyticsModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/services/analytics') as AnalyticsModule;
  });
  return loaded!.analytics;
};

describe('analytics: first_time and super properties', () => {
  beforeEach(() => {
    mockMixpanel.tracked = [];
    mockMixpanel.registered = [];
    mockMemoryStore.clear();
  });

  test('the first of each core action carries first_time, and only the first', async () => {
    const analytics = loadAnalytics();

    await analytics.track(ANALYTICS_EVENTS.ARTICLE_VIEWED, { source: 'search' });
    await analytics.track(ANALYTICS_EVENTS.ARTICLE_VIEWED, { source: 'search' });

    expect(mockMixpanel.tracked).toEqual([
      [ANALYTICS_EVENTS.ARTICLE_VIEWED, { source: 'search', first_time: true }],
      [ANALYTICS_EVENTS.ARTICLE_VIEWED, { source: 'search' }],
    ]);
  });

  test('a sign-out does not make a first happen again', async () => {
    const analytics = loadAnalytics();

    await analytics.track(ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE);
    await analytics.reset();
    await analytics.track(ANALYTICS_EVENTS.PRACTICE_SESSION_COMPLETE);

    const flags = mockMixpanel.tracked.map(([, properties]) => properties?.['first_time']);
    expect(flags).toEqual([true, undefined]);
  });

  test('events outside the core actions never carry first_time', async () => {
    const analytics = loadAnalytics();

    await analytics.track(ANALYTICS_EVENTS.APP_OPENED, { launch: 'foreground' });
    await analytics.trackError('Some_Error', { errorName: 'Error' });

    expect(mockMixpanel.tracked).toEqual([
      [ANALYTICS_EVENTS.APP_OPENED, { launch: 'foreground' }],
      ['Some_Error', { errorName: 'Error' }],
    ]);
  });

  test('super properties registered before Mixpanel started are applied at init', async () => {
    const analytics = loadAnalytics();

    // Registering is also what starts Mixpanel here, so the init itself
    // applies the store and the call then applies its own properties.
    await analytics.registerSuperProperties({ install_date: '2026-11-21', signed_in: false });

    expect(mockMixpanel.registered[0]).toEqual({ install_date: '2026-11-21', signed_in: false });
  });
});
