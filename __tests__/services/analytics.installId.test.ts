/**
 * `install_id` is on every event Mixpanel receives: the first of a launch, the
 * ones racing it, and the ones after a sign-out's reset().
 *
 * The fake Mixpanel keeps super properties the way the SDK does (reset() clears
 * them) and records what each event carried at the moment it was tracked. A
 * plain class and plain functions rather than jest.fn: resetMocks empties a
 * jest.fn implementation before each test.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';

type Properties = Record<string, unknown>;

const mockMixpanel = {
  tracked: [] as { event: string; properties: Properties }[],
};

jest.mock('mixpanel-react-native', () => ({
  Mixpanel: class {
    private supers: Properties = {};
    async init() {}
    track(event: string, properties?: Properties) {
      mockMixpanel.tracked.push({ event, properties: { ...this.supers, ...properties } });
    }
    registerSuperProperties(properties: Properties) {
      this.supers = { ...this.supers, ...properties };
    }
    reset() {
      this.supers = {};
    }
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

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('node:crypto').randomUUID(),
}));

import { ANALYTICS_EVENTS } from '@/constants/analytics';

type AnalyticsModule = typeof import('@/services/analytics');

/** A new launch: module state gone, storage kept. */
const launch = (): AnalyticsModule['analytics'] => {
  let loaded: AnalyticsModule | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/services/analytics') as AnalyticsModule;
  });
  return loaded!.analytics;
};

const installIds = () => mockMixpanel.tracked.map(({ properties }) => properties['install_id']);

describe('analytics: install_id', () => {
  beforeEach(() => {
    mockMixpanel.tracked = [];
    mockMemoryStore.clear();
  });

  test("is on the launch's first event, and on the ones racing it", async () => {
    const analytics = launch();

    await Promise.all([
      analytics.track(ANALYTICS_EVENTS.FIRST_OPEN, { install_kind: 'new' }),
      analytics.track(ANALYTICS_EVENTS.APP_OPENED, { launch: 'foreground' }),
      analytics.trackError('Some_Error'),
    ]);

    const [id] = installIds();
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(installIds()).toEqual([id, id, id]);
  });

  test('stays the same across launches', async () => {
    await launch().track(ANALYTICS_EVENTS.APP_OPENED);
    await launch().track(ANALYTICS_EVENTS.APP_OPENED);

    const [first, second] = installIds();
    expect(first).toEqual(expect.any(String));
    expect(second).toBe(first);
  });

  test('is registered again after reset(), with the other super properties', async () => {
    const analytics = launch();
    await analytics.registerSuperProperties({ install_date: '2026-11-21' });
    await analytics.track(ANALYTICS_EVENTS.SIGN_OUT);

    await analytics.reset();
    await analytics.track(ANALYTICS_EVENTS.APP_OPENED);

    const [before, after] = mockMixpanel.tracked;
    expect(after?.properties['install_id']).toBe(before?.properties['install_id']);
    expect(after?.properties['install_date']).toBe('2026-11-21');
  });

  test('a later registration cannot drop it', async () => {
    const analytics = launch();
    await analytics.track(ANALYTICS_EVENTS.APP_OPENED);
    await analytics.registerSuperProperties({ signed_in: true });
    await analytics.reset();
    await analytics.track(ANALYTICS_EVENTS.APP_OPENED);

    const [before, after] = installIds();
    expect(after).toBe(before);
  });
});
