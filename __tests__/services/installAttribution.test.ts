/**
 * The contract with the system that reads these events from Mixpanel: the names,
 * once per install, and nothing owed by someone who was already here. Deciding
 * new or existing is services/analyticsInstall's, and runs for real here;
 * install_id is services/analytics' (analytics.installId.test.ts).
 *
 * Plain objects and functions rather than jest.fn: resetMocks empties a jest.fn
 * implementation before each test. `launch` reloads the modules; storage and the
 * recorders outlive it, as a device does.
 */
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';

import { STORAGE_KEYS } from '@/constants/storageKeys';

const mockStorage = new Map<string, string>();
const mockStorageFails = { reads: false };
const mockPlatform = { OS: 'android' };
const mockDevice = {
  installTime: 0,
  updateTime: 0,
  referrer: 'utm_source=meta',
  referrerFails: false,
  referrerHangs: false,
  referrerReads: 0,
};
const mockAnalytics = {
  calls: [] as { event: string; properties?: Record<string, string> }[],
};

jest.mock('react-native', () => ({ Platform: mockPlatform }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => {
    if (mockStorageFails.reads) throw new Error('storage exploded');
    return mockStorage.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    mockStorage.set(key, value);
  },
}));

jest.mock('expo-application', () => ({
  getInstallationTimeAsync: async () => new Date(mockDevice.installTime),
  getLastUpdateTimeAsync: async () => new Date(mockDevice.updateTime),
  getInstallReferrerAsync: async () => {
    mockDevice.referrerReads += 1;
    if (mockDevice.referrerFails) throw new Error('service unavailable');
    if (mockDevice.referrerHangs) await new Promise(() => undefined);
    return mockDevice.referrer;
  },
}));

jest.mock('@/services/analytics', () => ({
  analytics: {
    track: async (event: string, properties?: Record<string, string>) => {
      mockAnalytics.calls.push({ event, properties });
    },
  },
}));

type Attribution = typeof import('@/services/installAttribution');

const launch = (): Attribution => {
  let loaded: Attribution | undefined;
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    loaded = require('@/services/installAttribution') as Attribution;
  });
  return loaded!;
};

/** A launch the learner opens, as hooks/app/useAppOpenTracking runs it. */
const openApp = async (): Promise<Attribution> => {
  const app = launch();
  await app.trackFirstOpen();
  await app.startInstallAttribution();
  return app;
};

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-11-21T12:00:00.000Z').getTime();

const count = (event: string) => mockAnalytics.calls.filter(call => call.event === event).length;
const attributionCall = () => mockAnalytics.calls.find(c => c.event === 'Install Attribution');
const firstOpenCall = () => mockAnalytics.calls.find(c => c.event === 'First Open');
const storedRecord = () =>
  JSON.parse(mockStorage.get(STORAGE_KEYS.ANALYTICS_INSTALL) ?? '{}') as Record<string, unknown>;

beforeEach(() => {
  jest.setSystemTime(NOW);
  mockStorage.clear();
  mockStorageFails.reads = false;
  mockPlatform.OS = 'android';
  Object.assign(mockDevice, {
    installTime: NOW - HOUR,
    // Later than any install in here, so an old one reads as updated since.
    updateTime: NOW,
    referrer: 'utm_source=meta',
    referrerFails: false,
    referrerHangs: false,
    referrerReads: 0,
  });
  mockAnalytics.calls = [];
});

// A read left hanging belongs to a launch that is over; its timeout must not fire in the next test.
afterEach(() => {
  jest.clearAllTimers();
});

/** Storage and the mocks here are all promises, so microtasks alone get there. */
const settle = async (done: () => boolean): Promise<void> => {
  for (let i = 0; i < 1000 && !done(); i++) await Promise.resolve();
};

describe('First Open', () => {
  test('uses the exact name in the contract, says the install is new, and comes first', async () => {
    await openApp();

    expect(mockAnalytics.calls).toEqual([
      { event: 'First Open', properties: { install_kind: 'new' } },
      { event: 'Install Attribution', properties: { referrer_0: 'utm_source=meta' } },
    ]);
  });

  test('fires once, across calls and relaunches', async () => {
    const app = await openApp();
    await app.trackFirstOpen();
    await openApp();

    expect(count('First Open')).toBe(1);
  });

  test('fires once however the calls overlap', async () => {
    const app = launch();

    await Promise.all([
      app.trackFirstOpen(),
      app.startInstallAttribution(),
      app.trackFirstOpen(),
      app.startInstallAttribution(),
    ]);

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
    expect(mockDevice.referrerReads).toBe(1);
  });

  test('an upgrade older than 24 hours fires it once, as existing', async () => {
    mockDevice.installTime = NOW - 25 * HOUR;

    await openApp();
    await openApp();

    expect(count('First Open')).toBe(1);
    expect(firstOpenCall()?.properties).toEqual({ install_kind: 'existing' });
  });

  test('storage that cannot be read sends nothing, and the next launch tries again', async () => {
    mockStorageFails.reads = true;
    await openApp();
    expect(mockAnalytics.calls).toEqual([]);
    expect(mockDevice.referrerReads).toBe(0);

    mockStorageFails.reads = false;
    await openApp();
    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
  });
});

describe('Install Attribution', () => {
  test('fires once per install', async () => {
    const app = await openApp();
    await app.startInstallAttribution();
    await openApp();

    expect(count('Install Attribution')).toBe(1);
    expect(mockDevice.referrerReads).toBe(1);
  });

  test('iOS sends none and never asks', async () => {
    mockPlatform.OS = 'ios';

    await openApp();
    await openApp();

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(0);
  });

  test('an upgrade has it spent: never sent, never asked', async () => {
    mockDevice.installTime = NOW - 25 * HOUR;

    await openApp();

    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(0);
    expect(storedRecord()).toEqual(
      expect.objectContaining({
        installKind: 'existing',
        installAttributionSent: true,
        activatedSent: true,
      }),
    );
  });

  test('an Android install never updated is new, however late it is first opened', async () => {
    mockDevice.installTime = NOW - 72 * HOUR;
    mockDevice.updateTime = mockDevice.installTime;

    await openApp();

    expect(firstOpenCall()?.properties).toEqual({ install_kind: 'new' });
    expect(count('Install Attribution')).toBe(1);
  });

  test('a referrer that cannot be read is tried again next launch, without repeats', async () => {
    mockDevice.referrerFails = true;
    await openApp();
    expect(count('Install Attribution')).toBe(0);

    mockDevice.referrerFails = false;
    await openApp();
    await openApp();

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
    expect(mockDevice.referrerReads).toBe(2);
  });

  test('a referrer that never answers times out, and the next launch asks again', async () => {
    mockDevice.referrerHangs = true;
    const app = launch();
    await app.trackFirstOpen();

    const started = app.startInstallAttribution();
    await jest.advanceTimersByTimeAsync(10 * 1000);
    await started;
    expect(count('Install Attribution')).toBe(0);

    mockDevice.referrerHangs = false;
    await openApp();
    expect(count('Install Attribution')).toBe(1);
  });

  test('a referrer that keeps failing is asked for three times in all, then let go', async () => {
    mockDevice.referrerFails = true;

    for (let i = 0; i < 5; i++) await openApp();

    expect(mockDevice.referrerReads).toBe(3);
    expect(count('Install Attribution')).toBe(0);
    expect(storedRecord()).toEqual(
      expect.objectContaining({ installAttributionSent: true, referrerReads: 3 }),
    );
  });

  test('an empty referrer is asked for again, up to the same limit', async () => {
    mockDevice.referrer = '';
    await openApp();
    await openApp();
    expect(mockDevice.referrerReads).toBe(2);

    mockDevice.referrer = 'utm_source=late';
    await openApp();
    await openApp();

    expect(mockDevice.referrerReads).toBe(3);
    expect(attributionCall()?.properties).toEqual({ referrer_0: 'utm_source=late' });
  });

  // expo-application stringifies a null referrer, so it arrives as the word itself.
  test('treats the word null as the empty referrer it stands for', async () => {
    mockDevice.referrer = 'null';

    for (let i = 0; i < 4; i++) await openApp();

    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(3);
  });

  test('a read cut short by a crash still counts against the limit', async () => {
    mockDevice.referrerHangs = true;
    // Three launches killed while the Play Store was being asked.
    for (let i = 1; i <= 3; i++) {
      void launch().startInstallAttribution();
      await settle(() => mockDevice.referrerReads === i);
    }
    jest.clearAllTimers();

    mockDevice.referrerHangs = false;
    await openApp();

    expect(mockDevice.referrerReads).toBe(3);
    expect(count('Install Attribution')).toBe(0);
  });

  describe('splitting the referrer', () => {
    const parts = () => {
      const properties = attributionCall()?.properties ?? {};
      return Object.keys(properties)
        .sort((a, b) => Number(a.split('_')[1]) - Number(b.split('_')[1]))
        .map(key => ({ key, value: properties[key] ?? '' }));
    };

    test.each([
      ['shorter than a part', 57, 1],
      ['exactly one part', 200, 1],
      ['one over', 201, 2],
      ['exactly two parts', 400, 2],
      ['several parts', 913, 5],
    ])('%s: joining gives back the exact original', async (_label, length, expectedParts) => {
      // Not a repeated character: a part in the wrong place has to show.
      mockDevice.referrer = Array.from({ length }, (_, i) => String(i % 10)).join('');

      await openApp();

      const split = parts();
      expect(split.map(({ key }) => key)).toEqual(
        Array.from({ length: expectedParts }, (_, i) => `referrer_${i}`),
      );
      expect(split.map(({ value }) => value).join('')).toBe(mockDevice.referrer);
      // Exactly 200 each, and only the last may be shorter.
      expect(split.slice(0, -1).every(({ value }) => value.length === 200)).toBe(true);
      expect(split.at(-1)!.value.length).toBeLessThanOrEqual(200);
    });

    test('the raw string is neither decoded nor parsed', async () => {
      mockDevice.referrer =
        'utm_source=apps.facebook.com&utm_content=%7B%22app%22%3A0%2C%22t%22%3A1%7D&x=a+b%20c';

      await openApp();

      expect(attributionCall()?.properties).toEqual({ referrer_0: mockDevice.referrer });
    });
  });
});

describe('Activated', () => {
  test('fires once, on the first completed session of a new install', async () => {
    const app = await openApp();

    await app.trackActivated();
    await app.trackActivated();

    const next = await openApp();
    await next.trackActivated();

    expect(mockAnalytics.calls.filter(c => c.event === 'Activated')).toEqual([
      { event: 'Activated', properties: undefined },
    ]);
  });

  test('fires once however the calls overlap', async () => {
    const app = await openApp();

    await Promise.all([app.trackActivated(), app.trackActivated()]);

    expect(count('Activated')).toBe(1);
  });

  test('never fires for an upgrade: their first session was long ago', async () => {
    mockDevice.installTime = NOW - 25 * HOUR;

    const app = await openApp();
    await app.trackActivated();

    expect(count('Activated')).toBe(0);
  });

  test('does not wait for a Play Store that has not answered', async () => {
    mockDevice.referrerHangs = true;
    const app = launch();
    void app.startInstallAttribution();

    await app.trackActivated();

    expect(count('Activated')).toBe(1);
  });
});

describe('a record written before this code', () => {
  const legacyRecord = (fields: Record<string, unknown>) =>
    mockStorage.set(
      STORAGE_KEYS.ANALYTICS_INSTALL,
      JSON.stringify({ installDate: '2026-11-20', firstEvents: [], ...fields }),
    );

  // Its First Open went out without install_id, so nothing sent now would join to it.
  test('a new install whose First Open has gone out owes nothing more', async () => {
    legacyRecord({ installKind: 'new', firstOpenSent: true });

    const app = await openApp();
    await app.trackActivated();

    expect(mockAnalytics.calls).toEqual([]);
    expect(mockDevice.referrerReads).toBe(0);
  });

  test('a new install still waiting for its First Open owes all three', async () => {
    legacyRecord({ installKind: 'new', firstOpenSent: false });

    const app = await openApp();
    await app.trackActivated();

    expect(mockAnalytics.calls.map(c => c.event)).toEqual([
      'First Open',
      'Install Attribution',
      'Activated',
    ]);
  });

  test('an existing install owes neither', async () => {
    legacyRecord({ installKind: 'existing', firstOpenSent: true });

    const app = await openApp();
    await app.trackActivated();

    expect(mockAnalytics.calls).toEqual([]);
  });
});
