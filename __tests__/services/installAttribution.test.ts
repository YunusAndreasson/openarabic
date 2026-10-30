/**
 * The contract with the system that reads these events from Mixpanel: the names,
 * once per install, and nothing for someone who was already here.
 *
 * Plain objects and functions rather than jest.fn: resetMocks empties a jest.fn
 * implementation before each test. `launch` reloads the modules; storage and the
 * recorders outlive it, as a device does.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { STORAGE_KEYS } from '@/constants/storageKeys';

const mockStorage = new Map<string, string>();
const mockPlatform = { OS: 'android' };
const mockDevice = {
  installTime: 0,
  installTimeFails: false,
  referrer: 'utm_source=meta',
  referrerFails: false,
  referrerHangs: false,
  referrerReads: 0,
  ids: 0,
};
const mockAnalytics = {
  calls: [] as { event: string; properties?: Record<string, string> }[],
  registered: [] as string[],
  order: [] as string[],
};

jest.mock('react-native', () => ({ Platform: mockPlatform }));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => mockStorage.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    mockStorage.set(key, value);
  },
}));

jest.mock('expo-application', () => ({
  getInstallationTimeAsync: async () => {
    if (mockDevice.installTimeFails) throw new Error('no install time');
    return new Date(mockDevice.installTime);
  },
  getInstallReferrerAsync: async () => {
    mockDevice.referrerReads += 1;
    if (mockDevice.referrerFails) throw new Error('service unavailable');
    if (mockDevice.referrerHangs) await new Promise(() => undefined);
    return mockDevice.referrer;
  },
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => {
    mockDevice.ids += 1;
    return `install-id-${mockDevice.ids}`;
  },
}));

jest.mock('@/services/analytics', () => ({
  analytics: {
    track: async (event: string, properties?: Record<string, string>) => {
      mockAnalytics.calls.push({ event, properties });
      mockAnalytics.order.push(event);
    },
    registerInstallId: async (id: string) => {
      mockAnalytics.registered.push(id);
      mockAnalytics.order.push('registerInstallId');
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

const count = (event: string) => mockAnalytics.calls.filter(call => call.event === event).length;
const attributionCall = () => mockAnalytics.calls.find(c => c.event === 'Install Attribution');

/** A launch with this choice in force, then attribution started, as services/privacy does. */
const launchAllowing = async (choices: { analytics: boolean; measurement: boolean }) => {
  const app = launch();
  await app.consent.saveConsent(choices);
  await app.attribution.startInstallAttribution();
  return app;
};

beforeEach(() => {
  jest.setSystemTime(NOW);
  mockStorage.clear();
  mockPlatform.OS = 'android';
  Object.assign(mockDevice, {
    installTime: NOW - HOUR,
    installTimeFails: false,
    referrer: 'utm_source=meta',
    referrerFails: false,
    referrerHangs: false,
    referrerReads: 0,
    ids: 0,
  });
  Object.assign(mockAnalytics, { calls: [], registered: [], order: [] });
});

describe('First Open', () => {
  test('uses the exact name in the contract', async () => {
    await launchAllowing(ANALYTICS_ONLY);

    expect(mockAnalytics.calls.map(call => call.event)).toEqual(['First Open']);
  });

  test('fires once for a new install, across calls and relaunches', async () => {
    const app = await launchAllowing(ALLOW_BOTH);
    await app.attribution.startInstallAttribution();

    const next = launch();
    await next.consent.loadConsent();
    await next.attribution.startInstallAttribution();

    expect(count('First Open')).toBe(1);
  });

  test('fires once however the calls overlap', async () => {
    const app = launch();
    await app.consent.saveConsent(ALLOW_BOTH);

    await Promise.all([
      app.attribution.startInstallAttribution(),
      app.attribution.startInstallAttribution(),
      app.attribution.startInstallAttribution(),
    ]);

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
  });

  test('never fires for an upgrade older than 24 hours, and is marked as sent', async () => {
    mockDevice.installTime = NOW - 25 * HOUR;

    await launchAllowing(ALLOW_BOTH);
    expect(count('First Open')).toBe(0);
    expect(JSON.parse(mockStorage.get(STORAGE_KEYS.INSTALL_ATTRIBUTION)!)).toMatchObject({
      firstOpenDone: true,
    });

    // Marked, not merely skipped: it stays silent if the check could later pass.
    mockDevice.installTime = NOW - HOUR;
    const next = launch();
    await next.consent.loadConsent();
    await next.attribution.startInstallAttribution();

    expect(count('First Open')).toBe(0);
  });

  test('fires for an install just inside the 24 hours', async () => {
    mockDevice.installTime = NOW - 24 * HOUR;

    await launchAllowing(ANALYTICS_ONLY);

    expect(count('First Open')).toBe(1);
  });

  test('needs analytics consent', async () => {
    const app = launch();
    await app.attribution.startInstallAttribution();
    expect(mockAnalytics.calls).toEqual([]);

    await launchAllowing(MEASUREMENT_ONLY);
    expect(mockAnalytics.calls).toEqual([]);
    expect(mockAnalytics.registered).toEqual([]);
  });

  // Judged when the code first runs, not when consent first comes: someone who
  // refused and changed their mind days later is still a new install.
  test('refusing and allowing days later still counts as a new install', async () => {
    const first = launch();
    await first.consent.saveConsent({ analytics: false, measurement: false });
    await first.attribution.startInstallAttribution();

    jest.setSystemTime(NOW + 72 * HOUR);
    await launchAllowing(ALLOW_BOTH);

    expect(count('First Open')).toBe(1);
    expect(count('Install Attribution')).toBe(1);
  });

  test('an upgrade with no decision yet stays an upgrade once it allows', async () => {
    mockDevice.installTime = NOW - 72 * HOUR;
    const first = launch();
    await first.attribution.startInstallAttribution();

    await launchAllowing(ALLOW_BOTH);

    expect(mockAnalytics.calls).toEqual([]);
  });

  test('deciding new or upgrade writes only to the device', async () => {
    const app = launch();

    await app.attribution.startInstallAttribution();

    expect(mockAnalytics.calls).toEqual([]);
    expect(mockAnalytics.registered).toEqual([]);
    expect(mockDevice.ids).toBe(0);
    expect(JSON.parse(mockStorage.get(STORAGE_KEYS.INSTALL_ATTRIBUTION)!)).toEqual({
      classified: true,
      installId: '',
      firstOpenDone: false,
      installAttributionDone: false,
      activatedDone: false,
    });
  });

  test('an install time that cannot be read sends nothing and is tried next launch', async () => {
    mockDevice.installTimeFails = true;
    await launchAllowing(ANALYTICS_ONLY);
    expect(mockAnalytics.calls).toEqual([]);

    mockDevice.installTimeFails = false;
    await launchAllowing(ANALYTICS_ONLY);
    expect(count('First Open')).toBe(1);
  });

  test('state that cannot be read sends nothing and makes no new ID', async () => {
    mockStorage.set(STORAGE_KEYS.INSTALL_ATTRIBUTION, '{"firstOpenDone":tr');

    await launchAllowing(ALLOW_BOTH);

    expect(mockAnalytics.calls).toEqual([]);
    expect(mockDevice.ids).toBe(0);
  });
});

describe('install_id', () => {
  test('is registered before the first event goes out', async () => {
    await launchAllowing(ANALYTICS_ONLY);

    expect(mockAnalytics.order).toEqual(['registerInstallId', 'First Open']);
    expect(mockAnalytics.registered).toEqual(['install-id-1']);
  });

  test('is created once and kept across launches', async () => {
    await launchAllowing(ANALYTICS_ONLY);
    await launchAllowing(ANALYTICS_ONLY);

    expect(mockDevice.ids).toBe(1);
    expect(mockAnalytics.registered).toEqual(['install-id-1', 'install-id-1']);
  });

  test('an upgrading user gets one too, for the events that do go out', async () => {
    mockDevice.installTime = NOW - 72 * HOUR;

    await launchAllowing(ANALYTICS_ONLY);

    expect(mockAnalytics.registered).toEqual(['install-id-1']);
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
    const activated = app.attribution.trackActivated();
    await jest.advanceTimersByTimeAsync(10 * 1000);
    await Promise.all([started, activated]);

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
    const first = await launchAllowing({ analytics: false, measurement: false });
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

  test('carries install_id even if attribution has not started this launch', async () => {
    const app = launch();
    await app.consent.saveConsent(ANALYTICS_ONLY);

    await app.attribution.trackActivated();

    expect(mockAnalytics.order).toEqual(['registerInstallId', 'Activated']);
  });
});
