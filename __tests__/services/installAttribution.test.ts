/**
 * The contract with the system that reads these events from Mixpanel: the names,
 * once per install, and nothing owed by someone who was already here. Deciding
 * new or existing is services/analyticsInstall's, and runs for real here;
 * install_id is services/analytics' (analytics.init.test.ts, privacy.test.ts).
 *
 * Plain objects and functions rather than jest.fn: resetMocks empties a jest.fn
 * implementation before each test. `launch` reloads the modules; storage and the
 * recorders outlive it, as a device does.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { STORAGE_KEYS } from '@/constants/storageKeys';

const mockStorage = new Map<string, string>();
const mockStorageFails = { reads: false };
const mockPlatform = { OS: 'android' };
const mockDevice = {
  installTime: 0,
  installTimeFails: false,
  updateTime: 0,
  updateTimeFails: false,
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
  getInstallationTimeAsync: async () => {
    if (mockDevice.installTimeFails) throw new Error('no install time');
    return new Date(mockDevice.installTime);
  },
  getLastUpdateTimeAsync: async () => {
    if (mockDevice.updateTimeFails) throw new Error('no update time');
    return new Date(mockDevice.updateTime);
  },
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
type Consent = typeof import('@/services/consent');

const launch = (): { attribution: Attribution; consent: Consent } => {
  let app: { attribution: Attribution; consent: Consent } | undefined;
  jest.isolateModules(() => {
    app = {
      attribution: require('@/services/installAttribution'),
      consent: require('@/services/consent'),
    };
  });
  return app!;
};

const HOUR = 60 * 60 * 1000;
const NOW = new Date('2026-10-30T12:00:00.000Z').getTime();

const ALLOW_BOTH = { analytics: true, measurement: true };
const ANALYTICS_ONLY = { analytics: true, measurement: false };
const MEASUREMENT_ONLY = { analytics: false, measurement: true };
const REFUSE_BOTH = { analytics: false, measurement: false };

const count = (event: string) => mockAnalytics.calls.filter(call => call.event === event).length;
const attributionCall = () => mockAnalytics.calls.find(c => c.event === 'Install Attribution');
const firstOpenCall = () => mockAnalytics.calls.find(c => c.event === 'First Open');

/**
 * A launch with this choice in force, opened by the learner: attribution started
 * as services/privacy does, then First Open as the first App Opened sends it.
 */
const launchAllowing = async (choices: { analytics: boolean; measurement: boolean }) => {
  const app = launch();
  await app.consent.saveConsent(choices);
  await app.attribution.startInstallAttribution();
  await app.attribution.trackFirstOpen();
  return app;
};

beforeEach(() => {
  jest.setSystemTime(NOW);
  mockStorage.clear();
  mockStorageFails.reads = false;
  mockPlatform.OS = 'android';
  Object.assign(mockDevice, {
    installTime: NOW - HOUR,
    installTimeFails: false,
    // Later than any install in here, so an old one reads as updated since.
    updateTime: NOW,
    updateTimeFails: false,
    referrer: 'utm_source=meta',
    referrerFails: false,
    referrerHangs: false,
    referrerReads: 0,
  });
  Object.assign(mockAnalytics, { calls: [] });
});

describe('First Open', () => {
  test('uses the exact name in the contract, and says the install is new', async () => {
    await launchAllowing(ANALYTICS_ONLY);

    expect(mockAnalytics.calls).toEqual([
      { event: 'First Open', properties: { install_kind: 'new' } },
    ]);
  });

  test('fires once, across calls and relaunches', async () => {
    const app = await launchAllowing(ALLOW_BOTH);
    await app.attribution.trackFirstOpen();
    await launchAllowing(ALLOW_BOTH);

    expect(count('First Open')).toBe(1);
  });

  test('fires once however the calls overlap', async () => {
    const app = launch();
    await app.consent.saveConsent(ALLOW_BOTH);

    await Promise.all([
      app.attribution.trackFirstOpen(),
      app.attribution.startInstallAttribution(),
      app.attribution.trackFirstOpen(),
      app.attribution.startInstallAttribution(),
    ]);

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
  });

  // The boards count new users from First Open {install_kind: new}; an existing
  // user's first launch of this code is told apart, not dropped.
  test('an upgrade older than 24 hours fires it once, as existing', async () => {
    mockDevice.installTime = NOW - 25 * HOUR;

    await launchAllowing(ALLOW_BOTH);
    await launchAllowing(ALLOW_BOTH);

    expect(count('First Open')).toBe(1);
    expect(firstOpenCall()?.properties).toEqual({ install_kind: 'existing' });
  });

  test('an Android install never updated is new, however late it is first opened', async () => {
    mockDevice.installTime = NOW - 72 * HOUR;
    mockDevice.updateTime = mockDevice.installTime;

    await launchAllowing(ALLOW_BOTH);

    expect(firstOpenCall()?.properties).toEqual({ install_kind: 'new' });
    expect(count('Install Attribution')).toBe(1);
  });

  test('needs analytics consent, and is not marked sent without it', async () => {
    const app = launch();
    await app.attribution.startInstallAttribution();
    await app.attribution.trackFirstOpen();
    await launchAllowing(MEASUREMENT_ONLY);
    await launchAllowing(REFUSE_BOTH);
    expect(mockAnalytics.calls).toEqual([]);

    await launchAllowing(ANALYTICS_ONLY);
    expect(count('First Open')).toBe(1);
  });

  // Judged when the code first runs, not when consent first comes: someone who
  // refused and changed their mind days later is still a new install.
  test('refusing and allowing days later still counts as a new install', async () => {
    await launchAllowing(REFUSE_BOTH);

    jest.setSystemTime(NOW + 72 * HOUR);
    await launchAllowing(ALLOW_BOTH);

    expect(firstOpenCall()?.properties).toEqual({ install_kind: 'new' });
    expect(count('Install Attribution')).toBe(1);
  });

  test('an upgrade with no decision yet stays an upgrade once it allows', async () => {
    mockDevice.installTime = NOW - 72 * HOUR;
    await launch().attribution.startInstallAttribution();

    await launchAllowing(ALLOW_BOTH);

    expect(mockAnalytics.calls).toEqual([
      { event: 'First Open', properties: { install_kind: 'existing' } },
    ]);
  });

  test('deciding new or upgrade writes only to the device', async () => {
    await launch().attribution.startInstallAttribution();

    expect(mockAnalytics.calls).toEqual([]);
    expect(JSON.parse(mockStorage.get(STORAGE_KEYS.ANALYTICS_INSTALL)!)).toEqual(
      expect.objectContaining({
        installKind: 'new',
        installId: '',
        firstOpenSent: false,
        installAttributionSent: false,
        activatedSent: false,
      }),
    );
  });

  test('storage that cannot be read sends nothing, and the next launch tries again', async () => {
    mockStorageFails.reads = true;
    await launchAllowing(ALLOW_BOTH);
    expect(mockAnalytics.calls).toEqual([]);

    mockStorageFails.reads = false;
    await launchAllowing(ALLOW_BOTH);
    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
  });
});

describe('Install Attribution', () => {
  test('uses the exact names in the contract', async () => {
    await launchAllowing(ALLOW_BOTH);

    expect(attributionCall()).toEqual({
      event: 'Install Attribution',
      properties: { referrer_0: 'utm_source=meta' },
    });
  });

  test('needs both consents', async () => {
    await launchAllowing(ANALYTICS_ONLY);
    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(0);

    await launchAllowing(MEASUREMENT_ONLY);
    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(0);

    await launchAllowing(ALLOW_BOTH);
    expect(count('Install Attribution')).toBe(1);
  });

  test('a second consent given later still sends it, once', async () => {
    await launchAllowing(ANALYTICS_ONLY);
    await launchAllowing(ALLOW_BOTH);
    await launchAllowing(ALLOW_BOTH);

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
  });

  test('runs only on Android', async () => {
    mockPlatform.OS = 'ios';

    await launchAllowing(ALLOW_BOTH);

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(0);
  });

  test('fires once', async () => {
    const app = await launchAllowing(ALLOW_BOTH);
    await app.attribution.startInstallAttribution();
    await launchAllowing(ALLOW_BOTH);

    expect(count('Install Attribution')).toBe(1);
  });

  test('never fires for an upgrade', async () => {
    mockDevice.installTime = NOW - 25 * HOUR;

    await launchAllowing(ALLOW_BOTH);

    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(0);
  });

  test('is skipped for an empty referrer, and not asked for again', async () => {
    mockDevice.referrer = '';

    await launchAllowing(ALLOW_BOTH);
    await launchAllowing(ALLOW_BOTH);

    expect(count('Install Attribution')).toBe(0);
    expect(mockDevice.referrerReads).toBe(1);
  });

  // expo-application stringifies a null referrer, so it arrives as the word itself.
  test('treats the word null as the empty referrer it stands for', async () => {
    mockDevice.referrer = 'null';

    await launchAllowing(ALLOW_BOTH);

    expect(count('Install Attribution')).toBe(0);
  });

  test('a referrer that never answers does not hold up what is queued behind it', async () => {
    mockDevice.referrerHangs = true;
    const app = launch();
    await app.consent.saveConsent(ALLOW_BOTH);

    const started = app.attribution.startInstallAttribution();
    const firstOpen = app.attribution.trackFirstOpen();
    const activated = app.attribution.trackActivated();
    await jest.advanceTimersByTimeAsync(10 * 1000);
    await Promise.all([started, firstOpen, activated]);

    expect(count('First Open')).toBe(1);
    expect(count('Activated')).toBe(1);
    expect(count('Install Attribution')).toBe(0);

    // Left unmarked, so the next launch asks again.
    mockDevice.referrerHangs = false;
    await launchAllowing(ALLOW_BOTH);
    expect(count('Install Attribution')).toBe(1);
  });

  test('a referrer that cannot be read is tried again next launch, without repeats', async () => {
    mockDevice.referrerFails = true;
    await launchAllowing(ALLOW_BOTH);
    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(0);

    mockDevice.referrerFails = false;
    await launchAllowing(ALLOW_BOTH);

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
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

      await launchAllowing(ALLOW_BOTH);

      const split = parts();
      expect(split.map(({ key }) => key)).toEqual(
        Array.from({ length: expectedParts }, (_, i) => `referrer_${i}`),
      );
      expect(split.map(({ value }) => value).join('')).toBe(mockDevice.referrer);
      expect(Math.max(...split.map(({ value }) => value.length))).toBeLessThanOrEqual(200);
      // Exactly 200 each, and only the last may be shorter.
      expect(split.slice(0, -1).every(({ value }) => value.length === 200)).toBe(true);
    });

    test('the raw string is neither decoded nor parsed', async () => {
      mockDevice.referrer =
        'utm_source=apps.facebook.com&utm_content=%7B%22app%22%3A0%2C%22t%22%3A1%7D&x=a+b%20c';

      await launchAllowing(ALLOW_BOTH);

      expect(attributionCall()?.properties).toEqual({ referrer_0: mockDevice.referrer });
    });
  });
});

describe('Activated', () => {
  test('fires once, on the first completed session', async () => {
    const app = await launchAllowing(ANALYTICS_ONLY);

    await app.attribution.trackActivated();
    await app.attribution.trackActivated();

    const next = await launchAllowing(ANALYTICS_ONLY);
    await next.attribution.trackActivated();

    expect(count('Activated')).toBe(1);
  });

  test('fires once however the calls overlap', async () => {
    const app = await launchAllowing(ANALYTICS_ONLY);

    await Promise.all([app.attribution.trackActivated(), app.attribution.trackActivated()]);

    expect(count('Activated')).toBe(1);
  });

  test('needs analytics consent', async () => {
    const app = await launchAllowing(MEASUREMENT_ONLY);

    await app.attribution.trackActivated();

    expect(count('Activated')).toBe(0);
  });

  test('a session without consent is not marked, so a later one with consent counts', async () => {
    const first = await launchAllowing(REFUSE_BOTH);
    await first.attribution.trackActivated();

    const next = await launchAllowing(ANALYTICS_ONLY);
    await next.attribution.trackActivated();

    expect(count('Activated')).toBe(1);
  });

  // Defined as the first completed session, and theirs was long ago.
  test('never fires for an upgrade', async () => {
    mockDevice.installTime = NOW - 25 * HOUR;

    const app = await launchAllowing(ANALYTICS_ONLY);
    await app.attribution.trackActivated();

    expect(count('Activated')).toBe(0);
  });
});
