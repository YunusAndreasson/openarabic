/**
 * The whole gate: real consent, analytics, Meta, attribution and privacy services,
 * with only the two SDKs and the device faked. What matters here is what the SDKs
 * are asked to do, across relaunches, for each thing a person can decide.
 *
 * Plain objects and functions rather than jest.fn: resetMocks empties a jest.fn
 * implementation before each test. Every module is reloaded per "launch", so these
 * also stand in for what outlives a process: storage, Mixpanel's persisted opt-out
 * and its persisted super properties.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { STORAGE_KEYS } from '@/constants/storageKeys';

const mockStorage = new Map<string, string>();
const mockPlatform = { OS: 'ios' };
const mockInstall = { time: 0, referrer: '' };
const mockIds = { next: 1 };

const mockMixpanel = {
  constructed: 0,
  initArgs: [] as unknown[][],
  tracked: [] as { event: string; properties?: Record<string, unknown> }[],
  identified: [] as string[],
  people: [] as Record<string, unknown>[],
  resets: 0,
  optIns: 0,
  optOuts: 0,
  optedOut: false,
  failInit: false,
  superProperties: {} as Record<string, unknown>,
};

const mockMeta = {
  calls: [] as string[],
  events: [] as { name: string; params?: unknown }[],
};

jest.mock('react-native', () => ({
  Platform: mockPlatform,
  LogBox: { ignoreLogs: () => undefined },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: async (key: string) => mockStorage.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    mockStorage.set(key, value);
  },
}));

jest.mock('@/constants/analytics', () => ({
  ...jest.requireActual<Record<string, unknown>>('@/constants/analytics'),
  MIXPANEL_TOKEN: 'test-token-123',
}));

jest.mock('expo-application', () => ({
  getInstallationTimeAsync: async () => new Date(mockInstall.time),
  getInstallReferrerAsync: async () => mockInstall.referrer,
}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => `install-id-${mockIds.next++}`,
}));

// Behaves as the native SDK does where it matters here: an opted-out instance
// drops what it is given, and opting out or resetting clears the super properties.
jest.mock('mixpanel-react-native', () => ({
  Mixpanel: class {
    constructor() {
      mockMixpanel.constructed += 1;
    }
    async init(...args: unknown[]) {
      if (mockMixpanel.failInit) throw new Error('init failed');
      mockMixpanel.initArgs.push(args);
    }
    async identify(userId: string) {
      if (!mockMixpanel.optedOut) mockMixpanel.identified.push(userId);
    }
    async getPeople() {
      return { set: (properties: Record<string, unknown>) => mockMixpanel.people.push(properties) };
    }
    async track(event: string, properties?: Record<string, unknown>) {
      if (!mockMixpanel.optedOut) mockMixpanel.tracked.push({ event, properties });
    }
    reset() {
      mockMixpanel.resets += 1;
      mockMixpanel.superProperties = {};
    }
    registerSuperProperties(properties: Record<string, unknown>) {
      if (!mockMixpanel.optedOut) Object.assign(mockMixpanel.superProperties, properties);
    }
    async hasOptedOutTracking() {
      return mockMixpanel.optedOut;
    }
    optInTracking() {
      mockMixpanel.optIns += 1;
      mockMixpanel.optedOut = false;
    }
    optOutTracking() {
      mockMixpanel.optOuts += 1;
      mockMixpanel.optedOut = true;
      mockMixpanel.superProperties = {};
    }
  },
}));

jest.mock('react-native-fbsdk-next/lib/commonjs/FBSettings', () => ({
  default: {
    initializeSDK: () => mockMeta.calls.push('initializeSDK'),
    setAutoLogAppEventsEnabled: (enabled: boolean) =>
      mockMeta.calls.push(`autoLog:${String(enabled)}`),
    setAdvertiserIDCollectionEnabled: (enabled: boolean) =>
      mockMeta.calls.push(`adId:${String(enabled)}`),
    setAdvertiserTrackingEnabled: async (enabled: boolean) => {
      mockMeta.calls.push(`ate:${String(enabled)}`);
      return true;
    },
  },
}));

jest.mock('react-native-fbsdk-next/lib/commonjs/FBAppEventsLogger', () => ({
  default: {
    logEvent: (name: string, params?: unknown) => mockMeta.events.push({ name, params }),
    setFlushBehavior: (behavior: string) => mockMeta.calls.push(`flush:${behavior}`),
    flush: () => mockMeta.calls.push('flushNow'),
  },
}));

interface App {
  analytics: typeof import('@/services/analytics').analytics;
  consent: typeof import('@/services/consent');
  metaEvents: typeof import('@/services/metaEvents').metaEvents;
  privacy: typeof import('@/services/privacy');
  attribution: typeof import('@/services/installAttribution');
}

/** A fresh copy of every service, and the restore `app/_layout.tsx` runs at launch. */
const launch = async (): Promise<App> => {
  let app: App | undefined;
  jest.isolateModules(() => {
    app = {
      analytics: require('@/services/analytics').analytics,
      consent: require('@/services/consent'),
      metaEvents: require('@/services/metaEvents').metaEvents,
      privacy: require('@/services/privacy'),
      attribution: require('@/services/installAttribution'),
    };
  });
  await app!.privacy.restoreConsentChoices();
  return app!;
};

/** Everything that would send, as the running app calls it. */
const useTheApp = async ({ analytics, metaEvents }: App) => {
  await analytics.track(ANALYTICS_EVENTS.APP_OPENED);
  await analytics.trackError('Some_Error');
  await analytics.identify('user-1', { last_active: 'now' });
  await analytics.trackSignIn('apple');
  await analytics.reset();
  metaEvents.logSignUp('apple');
  metaEvents.logTutorialComplete();
  metaEvents.logPracticeSessionComplete(5);
};

const expectMixpanelUntouched = () => {
  expect(mockMixpanel.constructed).toBe(0);
  expect(mockMixpanel.initArgs).toEqual([]);
  expect(mockMixpanel.tracked).toEqual([]);
  expect(mockMixpanel.identified).toEqual([]);
  expect(mockMixpanel.people).toEqual([]);
  expect(mockMixpanel.resets).toBe(0);
  expect(mockMixpanel.optOuts).toBe(0);
  expect(mockMixpanel.superProperties).toEqual({});
};

const expectMetaUntouched = () => {
  expect(mockMeta.calls).toEqual([]);
  expect(mockMeta.events).toEqual([]);
};

const trackedEvents = () => mockMixpanel.tracked.map(({ event }) => event);

const ALLOW_BOTH = { analytics: true, measurement: true };
const REFUSE_BOTH = { analytics: false, measurement: false };
const NOW = new Date('2026-10-30T12:00:00.000Z').getTime();

beforeEach(() => {
  jest.setSystemTime(NOW);
  mockStorage.clear();
  mockPlatform.OS = 'ios';
  // A new install unless a test says otherwise.
  mockInstall.time = NOW - 60 * 60 * 1000;
  mockInstall.referrer = '';
  mockIds.next = 1;
  Object.assign(mockMixpanel, {
    constructed: 0,
    initArgs: [],
    tracked: [],
    identified: [],
    people: [],
    resets: 0,
    optIns: 0,
    optOuts: 0,
    optedOut: false,
    failInit: false,
    superProperties: {},
  });
  mockMeta.calls = [];
  mockMeta.events = [];
});

describe.each(['ios', 'android'])('on %s', platform => {
  beforeEach(() => {
    mockPlatform.OS = platform;
  });

  describe('with no decision', () => {
    test('Mixpanel is never constructed and no Meta call happens', async () => {
      await useTheApp(await launch());

      expectMixpanelUntouched();
      expectMetaUntouched();
    });

    test('including after a relaunch', async () => {
      await useTheApp(await launch());
      await useTheApp(await launch());

      expectMixpanelUntouched();
      expectMetaUntouched();
    });

    test('an event from before the decision is dropped, not queued for after it', async () => {
      const app = await launch();

      await app.analytics.track(ANALYTICS_EVENTS.APP_OPENED);
      await app.privacy.applyConsentChoices(ALLOW_BOTH);

      expect(trackedEvents()).not.toContain(ANALYTICS_EVENTS.APP_OPENED);
    });
  });

  describe('after refusing', () => {
    test('Mixpanel is never constructed and no Meta call happens', async () => {
      const app = await launch();

      await app.privacy.applyConsentChoices(REFUSE_BOTH);
      await useTheApp(app);

      expectMixpanelUntouched();
      expectMetaUntouched();
    });

    test('including after a relaunch', async () => {
      await (await launch()).privacy.applyConsentChoices(REFUSE_BOTH);

      await useTheApp(await launch());

      expectMixpanelUntouched();
      expectMetaUntouched();
    });
  });

  describe('a stored choice that does not count', () => {
    const stale = (choices: Record<string, unknown>) =>
      mockStorage.set(
        STORAGE_KEYS.PRIVACY_CONSENT,
        JSON.stringify({ ...choices, version: 0, decidedAt: '2025-01-01T00:00:00.000Z' }),
      );

    test('an old version counts as no decision, whatever it said', async () => {
      stale(ALLOW_BOTH);

      const app = await launch();
      await useTheApp(app);

      expect(app.consent.getConsent()).toBeNull();
      expect(app.consent.getConsentState().isLoaded).toBe(true);
      expectMixpanelUntouched();
      expect(mockMeta.events).toEqual([]);
      expect(mockMeta.calls).not.toContain('initializeSDK');
      expect(mockMeta.calls).not.toContain('autoLog:true');
    });

    test('corrupt consent counts as no decision', async () => {
      mockStorage.set(STORAGE_KEYS.PRIVACY_CONSENT, '{"analytics":tr');

      const app = await launch();
      await useTheApp(app);

      expect(app.consent.getConsent()).toBeNull();
      expectMixpanelUntouched();
      expect(mockMeta.events).toEqual([]);
      expect(mockMeta.calls).not.toContain('initializeSDK');
      expect(mockMeta.calls).not.toContain('autoLog:true');
    });

    test('an old version that refused measurement makes no Meta call at all', async () => {
      stale({ analytics: true, measurement: false });

      await launch();

      expectMetaUntouched();
    });
  });

  describe('allowing', () => {
    test('starts both, and each gets what it was allowed', async () => {
      const app = await launch();

      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      await app.analytics.track(ANALYTICS_EVENTS.APP_RESUMED);
      app.metaEvents.logTutorialComplete();

      expect(mockMixpanel.constructed).toBe(1);
      expect(mockMixpanel.initArgs).toHaveLength(1);
      expect(trackedEvents()).toContain(ANALYTICS_EVENTS.APP_RESUMED);
      expect(mockMeta.calls).toEqual(expect.arrayContaining(['initializeSDK', 'autoLog:true']));
      expect(mockMeta.events.map(({ name }) => name)).toEqual(['fb_mobile_tutorial_completion']);
    });

    test('is restored on the next launch without asking', async () => {
      await (await launch()).privacy.applyConsentChoices(ALLOW_BOTH);
      mockMixpanel.constructed = 0;
      mockMeta.calls = [];

      const app = await launch();

      expect(app.consent.isAllowed('analytics')).toBe(true);
      expect(mockMixpanel.constructed).toBe(1);
      expect(mockMeta.calls).toContain('initializeSDK');
    });

    test('Mixpanel is not initialised twice however the calls overlap', async () => {
      await (await launch()).privacy.applyConsentChoices(ALLOW_BOTH);
      mockMixpanel.constructed = 0;

      const app = await launch();
      await Promise.all([
        app.analytics.track(ANALYTICS_EVENTS.APP_OPENED),
        app.analytics.identify('user-1'),
        app.privacy.restoreConsentChoices(),
      ]);

      expect(mockMixpanel.constructed).toBe(1);
    });
  });

  describe('withdrawing', () => {
    test('stops Mixpanel and opts out, and nothing more is sent', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      mockMixpanel.tracked = [];

      await app.privacy.applyConsentChoices({ analytics: false, measurement: true });
      await app.analytics.track(ANALYTICS_EVENTS.APP_RESUMED);
      await app.analytics.identify('user-2');

      expect(mockMixpanel.optOuts).toBe(1);
      expect(mockMixpanel.tracked).toEqual([]);
      expect(mockMixpanel.identified).not.toContain('user-2');
    });

    test('turns both Meta settings off, holds the queue, and nothing more is logged', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      mockMeta.calls = [];
      mockMeta.events = [];

      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });
      app.metaEvents.logTutorialComplete();

      expect(mockMeta.calls).toEqual(['autoLog:false', 'adId:false', 'flush:explicit_only']);
      expect(mockMeta.events).toEqual([]);
    });

    test('a later grant in the same launch configures Meta again and releases the queue', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      await app.privacy.applyConsentChoices(REFUSE_BOTH);
      mockMeta.calls = [];

      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      app.metaEvents.logTutorialComplete();

      expect(mockMeta.calls).toEqual(
        expect.arrayContaining(['autoLog:true', 'adId:true', 'initializeSDK', 'flush:auto']),
      );
      expect(mockMeta.events).toHaveLength(1);
    });

    test('a later grant in the same launch opts back in', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      await app.privacy.applyConsentChoices(REFUSE_BOTH);
      mockMixpanel.tracked = [];

      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      await app.analytics.track(ANALYTICS_EVENTS.APP_RESUMED);

      expect(mockMixpanel.optIns).toBe(1);
      expect(trackedEvents()).toEqual([ANALYTICS_EVENTS.APP_RESUMED]);
    });

    test('after a relaunch, Mixpanel stays untouched and Meta stays off', async () => {
      const first = await launch();
      await first.privacy.applyConsentChoices(ALLOW_BOTH);
      await first.privacy.applyConsentChoices(REFUSE_BOTH);
      mockMixpanel.constructed = 0;
      mockMixpanel.tracked = [];
      mockMeta.calls = [];
      mockMeta.events = [];

      await useTheApp(await launch());

      expect(mockMixpanel.constructed).toBe(0);
      expect(mockMixpanel.tracked).toEqual([]);
      expectMetaUntouched();
    });

    test('the opt-out outlives the process, so a grant on a later launch opts back in', async () => {
      const first = await launch();
      await first.privacy.applyConsentChoices(ALLOW_BOTH);
      await first.privacy.applyConsentChoices(REFUSE_BOTH);
      mockMixpanel.tracked = [];

      const app = await launch();
      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      await app.analytics.track(ANALYTICS_EVENTS.APP_RESUMED);

      expect(mockMixpanel.optIns).toBe(1);
      expect(trackedEvents()).toEqual([ANALYTICS_EVENTS.APP_RESUMED]);
    });

    test('someone who never opted out is not opted in, which would log an event', async () => {
      await (await launch()).privacy.applyConsentChoices(ALLOW_BOTH);

      expect(mockMixpanel.optIns).toBe(0);
    });

    test('whoever signed in while it was off is identified once it is allowed', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices(REFUSE_BOTH);
      await app.analytics.identify('user-1');
      expect(mockMixpanel.identified).toEqual([]);

      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });

      expect(mockMixpanel.identified).toEqual(['user-1']);
    });

    test('whoever signed out while it was off is not', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices(REFUSE_BOTH);
      await app.analytics.identify('user-1');
      await app.analytics.reset();

      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });

      expect(mockMixpanel.identified).toEqual([]);
    });
  });

  describe('analytics and measurement are independent', () => {
    test('analytics alone starts Mixpanel and leaves Meta untouched', async () => {
      const app = await launch();

      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });
      await app.analytics.track(ANALYTICS_EVENTS.APP_RESUMED);
      app.metaEvents.logTutorialComplete();

      expect(mockMixpanel.constructed).toBe(1);
      expect(trackedEvents()).toContain(ANALYTICS_EVENTS.APP_RESUMED);
      expectMetaUntouched();
    });

    test('measurement alone starts Meta and leaves Mixpanel untouched', async () => {
      const app = await launch();

      await app.privacy.applyConsentChoices({ analytics: false, measurement: true });
      await app.analytics.track(ANALYTICS_EVENTS.APP_RESUMED);
      app.metaEvents.logTutorialComplete();

      expectMixpanelUntouched();
      expect(mockMeta.calls).toContain('initializeSDK');
      expect(mockMeta.events).toHaveLength(1);
    });

    test('withdrawing one leaves the other running', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      mockMixpanel.tracked = [];
      mockMeta.events = [];

      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });
      await app.analytics.track(ANALYTICS_EVENTS.APP_RESUMED);
      app.metaEvents.logTutorialComplete();

      expect(mockMixpanel.optOuts).toBe(0);
      expect(trackedEvents()).toContain(ANALYTICS_EVENTS.APP_RESUMED);
      expect(mockMeta.events).toEqual([]);
    });
  });

  describe('install_id', () => {
    test('Mixpanel gets it as a super property, and before the first contract event', async () => {
      const app = await launch();

      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });

      expect(mockMixpanel.superProperties['install_id']).toBe('install-id-1');
      expect(trackedEvents()).toContain(ANALYTICS_EVENTS.FIRST_OPEN);
    });

    test('is created once and survives a relaunch', async () => {
      await (await launch()).privacy.applyConsentChoices({ analytics: true, measurement: false });
      mockMixpanel.superProperties = {};

      await launch();

      expect(mockMixpanel.superProperties['install_id']).toBe('install-id-1');
      expect(mockIds.next).toBe(2);
    });

    test('is not made at all without analytics consent', async () => {
      const app = await launch();

      await app.privacy.applyConsentChoices({ analytics: false, measurement: true });

      expect(mockIds.next).toBe(1);
      expect(mockMixpanel.superProperties).toEqual({});
    });

    test('survives a sign-out, which clears the super properties', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });

      await app.analytics.reset();

      expect(mockMixpanel.resets).toBe(1);
      expect(mockMixpanel.superProperties['install_id']).toBe('install-id-1');
    });

    test('survives withdrawing and allowing again, which clears them too', async () => {
      const app = await launch();
      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });
      await app.privacy.applyConsentChoices(REFUSE_BOTH);
      expect(mockMixpanel.superProperties).toEqual({});

      await app.privacy.applyConsentChoices({ analytics: true, measurement: false });

      expect(mockMixpanel.superProperties['install_id']).toBe('install-id-1');
    });

    test('Meta never receives it', async () => {
      const app = await launch();

      await app.privacy.applyConsentChoices(ALLOW_BOTH);
      await useTheApp(app);
      await app.attribution.trackActivated();

      const sentToMeta = JSON.stringify([mockMeta.calls, mockMeta.events]);
      expect(mockMeta.events.length).toBeGreaterThan(0);
      expect(sentToMeta).not.toContain('install-id');
      expect(sentToMeta).not.toContain('install_id');
    });
  });
});

// The app must work the same whichever way this goes, and whatever the SDKs do.
describe('when an SDK fails', () => {
  test('applying a choice does not throw, and the choice still stands', async () => {
    mockMixpanel.failInit = true;
    const app = await launch();

    await expect(app.privacy.applyConsentChoices(ALLOW_BOTH)).resolves.toBeUndefined();

    expect(app.consent.isAllowed('analytics')).toBe(true);
    expect(mockMixpanel.tracked).toEqual([]);
  });

  test('restoring does not throw', async () => {
    mockStorage.set(STORAGE_KEYS.PRIVACY_CONSENT, 'garbage');
    mockMixpanel.failInit = true;

    await expect(launch()).resolves.toBeDefined();
  });
});

describe('a grant from an older consent version', () => {
  const staleGrant = () =>
    mockStorage.set(
      STORAGE_KEYS.PRIVACY_CONSENT,
      JSON.stringify({
        analytics: false,
        measurement: true,
        version: 0,
        decidedAt: '2025-01-01T00:00:00.000Z',
      }),
    );

  // Meta's native settings persist on the device and outlive the choice that set
  // them, so on Android the SDK would go on logging at every launch. The latch
  // alone would miss it: nothing has started the SDK in this process.
  test('on Android, the persisted Meta settings are turned off at launch', async () => {
    mockPlatform.OS = 'android';
    staleGrant();

    await launch();

    expect(mockMeta.calls).toEqual(['autoLog:false', 'adId:false']);
    expect(mockMeta.events).toEqual([]);
  });

  test('on iOS, nothing starts the SDK, so nothing needs turning off', async () => {
    mockPlatform.OS = 'ios';
    staleGrant();

    await launch();

    expectMetaUntouched();
  });

  test('stays off when the person then refuses', async () => {
    mockPlatform.OS = 'android';
    staleGrant();
    const app = await launch();
    mockMeta.calls = [];

    await app.privacy.applyConsentChoices(REFUSE_BOTH);

    expect(mockMeta.calls).toEqual(['autoLog:false', 'adId:false']);
    expect(mockMeta.events).toEqual([]);
  });
});
