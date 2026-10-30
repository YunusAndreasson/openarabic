const mockSetAutoLog = jest.fn();
const mockSetAdId = jest.fn();
const mockInitializeSDK = jest.fn();
const mockSetTracking = jest.fn();
const mockLogEvent = jest.fn();
const mockSetFlushBehavior = jest.fn();
const mockFlush = jest.fn();
const mockPlatform = { OS: 'android' };
const mockSdk = { initialized: false };

jest.mock('react-native', () => ({
  NativeModules: { FBSettings: {} },
  Platform: mockPlatform,
  LogBox: { ignoreLogs: jest.fn() },
}));

// Evaluating the package barrel is what crashed first-run analytics on Android:
// it pulls in an unrelated login tracker.
jest.mock('react-native-fbsdk-next', () => {
  throw new Error('package barrel evaluated');
});

jest.mock('react-native-fbsdk-next/lib/commonjs/FBSettings', () => ({
  default: {
    initializeSDK: (...args: unknown[]) => {
      mockSdk.initialized = true;
      mockInitializeSDK(...args);
    },
    setAutoLogAppEventsEnabled: mockSetAutoLog,
    setAdvertiserIDCollectionEnabled: mockSetAdId,
    setAdvertiserTrackingEnabled: (...args: unknown[]) => {
      mockSetTracking(...args);
      return Promise.resolve(false);
    },
  },
}));

jest.mock('react-native-fbsdk-next/lib/commonjs/FBAppEventsLogger', () => {
  if (!mockSdk.initialized) {
    throw new Error('App events evaluated before Settings.initializeSDK');
  }
  return {
    default: { logEvent: mockLogEvent, setFlushBehavior: mockSetFlushBehavior, flush: mockFlush },
  };
});

const callOrder = (...mocks: jest.Mock[]) =>
  mocks.map(mock => mock.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY);

/** A fresh copy of the service and of the choice it reads, as a new launch has. */
const load = async (choices: { analytics: boolean; measurement: boolean } | null) => {
  jest.resetModules();
  const consent = require('@/services/consent');
  if (choices) await consent.saveConsent(choices);
  const { metaEvents } = require('@/services/metaEvents');
  return { consent, metaEvents };
};

const ALLOWED = { analytics: false, measurement: true };
const REFUSED = { analytics: false, measurement: false };

describe('metaEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPlatform.OS = 'android';
    mockSdk.initialized = false;
  });

  describe('once measurement is allowed', () => {
    test('initializes the native SDK before evaluating app events, never the barrel', async () => {
      const { metaEvents } = await load(ALLOWED);

      expect(() => metaEvents.logTutorialComplete()).not.toThrow();
      expect(mockInitializeSDK).toHaveBeenCalledTimes(1);
      expect(mockLogEvent).toHaveBeenCalledTimes(1);
      expect(mockLogEvent).toHaveBeenCalledWith('fb_mobile_tutorial_completion', {
        fb_success: '1',
      });
    });

    test('Android: turns the settings on before initializeSDK', async () => {
      const { metaEvents } = await load(ALLOWED);

      metaEvents.start();

      expect(mockSetAutoLog).toHaveBeenCalledWith(true);
      expect(mockSetAdId).toHaveBeenCalledWith(true);
      const [autoLog, adId, init] = callOrder(mockSetAutoLog, mockSetAdId, mockInitializeSDK);
      expect(autoLog).toBeLessThan(init!);
      expect(adId).toBeLessThan(init!);
    });

    test('Android: the iOS-only ATT setter is left alone', async () => {
      const { metaEvents } = await load(ALLOWED);

      metaEvents.start();

      expect(mockSetTracking).not.toHaveBeenCalled();
    });

    // Nothing starts the SDK on iOS until this call (the AppDelegate subscriber is
    // patched out), and iOS persists a setting only once it has been configured.
    test('iOS: initializes first, so the settings persist, and keeps AEM-only', async () => {
      mockPlatform.OS = 'ios';
      const { metaEvents } = await load(ALLOWED);

      metaEvents.start();

      expect(mockSetAutoLog).toHaveBeenCalledWith(true);
      expect(mockSetAdId).toHaveBeenCalledWith(true);
      expect(mockSetTracking).toHaveBeenCalledWith(false);
      const [init, autoLog, adId] = callOrder(mockInitializeSDK, mockSetAutoLog, mockSetAdId);
      expect(init).toBeLessThan(autoLog!);
      expect(init).toBeLessThan(adId!);
    });

    // The launch event is logged natively before JS is up, fails the "not fully
    // initialized" check and goes back to disk. Nothing else flushes it for someone
    // who only reads.
    test('Android: sends what the launch could not, once initialized', async () => {
      const { metaEvents } = await load(ALLOWED);

      metaEvents.start();

      expect(mockFlush).toHaveBeenCalledTimes(1);
      const [init, flush] = callOrder(mockInitializeSDK, mockFlush);
      expect(init).toBeLessThan(flush!);
    });

    test('iOS: has nothing waiting, so does not flush', async () => {
      mockPlatform.OS = 'ios';
      const { metaEvents } = await load(ALLOWED);

      metaEvents.start();

      expect(mockFlush).not.toHaveBeenCalled();
    });

    test('configures once, however many events follow', async () => {
      const { metaEvents } = await load(ALLOWED);

      metaEvents.start();
      metaEvents.logTutorialComplete();
      metaEvents.logPracticeSessionComplete(3);

      expect(mockInitializeSDK).toHaveBeenCalledTimes(1);
      expect(mockLogEvent).toHaveBeenCalledTimes(2);
    });

    test('logging alone configures it, if an event beats the restore', async () => {
      const { metaEvents } = await load(ALLOWED);

      metaEvents.logSignUp('apple');

      expect(mockInitializeSDK).toHaveBeenCalledTimes(1);
      expect(mockLogEvent).toHaveBeenCalledWith('fb_mobile_complete_registration', {
        fb_registration_method: 'apple',
      });
    });
  });

  describe.each(['android', 'ios'])('on %s, without consent', platform => {
    beforeEach(() => {
      mockPlatform.OS = platform;
    });

    const expectNoMetaCall = () => {
      expect(mockInitializeSDK).not.toHaveBeenCalled();
      expect(mockSetAutoLog).not.toHaveBeenCalled();
      expect(mockSetAdId).not.toHaveBeenCalled();
      expect(mockSetTracking).not.toHaveBeenCalled();
      expect(mockLogEvent).not.toHaveBeenCalled();
      expect(mockFlush).not.toHaveBeenCalled();
    };

    test('with no decision, nothing is configured or logged', async () => {
      const { metaEvents } = await load(null);

      metaEvents.start();
      metaEvents.logSignUp();
      metaEvents.logTutorialComplete();
      metaEvents.logPracticeSessionComplete(5);
      metaEvents.log('custom');

      expectNoMetaCall();
    });

    test('after refusing, nothing is configured or logged', async () => {
      const { metaEvents } = await load(REFUSED);

      metaEvents.start();
      metaEvents.logSignUp();

      expectNoMetaCall();
    });

    test('an event before the stored choice has loaded is dropped, not sent', async () => {
      jest.resetModules();
      const { metaEvents } = require('@/services/metaEvents');

      metaEvents.logTutorialComplete();

      expectNoMetaCall();
    });
  });

  describe('withdrawing', () => {
    test('turns both settings off and holds the queue', async () => {
      const { consent, metaEvents } = await load(ALLOWED);
      metaEvents.start();
      jest.clearAllMocks();

      await consent.saveConsent(REFUSED);
      metaEvents.stop();

      expect(mockSetAutoLog).toHaveBeenCalledWith(false);
      expect(mockSetAdId).toHaveBeenCalledWith(false);
      // Otherwise what is already queued still goes out, and on iOS a server-side
      // override can keep logging session events until the process ends.
      expect(mockSetFlushBehavior).toHaveBeenCalledWith('explicit_only');
    });

    test('stops events at once', async () => {
      const { consent, metaEvents } = await load(ALLOWED);
      metaEvents.logTutorialComplete();
      mockLogEvent.mockClear();

      await consent.saveConsent(REFUSED);
      metaEvents.stop();
      metaEvents.logTutorialComplete();

      expect(mockLogEvent).not.toHaveBeenCalled();
    });

    test('resets the latch, so a later grant configures again and releases the queue', async () => {
      const { consent, metaEvents } = await load(ALLOWED);
      metaEvents.start();
      await consent.saveConsent(REFUSED);
      metaEvents.stop();
      jest.clearAllMocks();

      await consent.saveConsent(ALLOWED);
      metaEvents.start();

      expect(mockSetAutoLog).toHaveBeenCalledWith(true);
      expect(mockSetAdId).toHaveBeenCalledWith(true);
      expect(mockInitializeSDK).toHaveBeenCalledTimes(1);
      expect(mockSetFlushBehavior).toHaveBeenCalledWith('auto');
    });

    test('a grant that follows nothing held does not touch the flush behaviour', async () => {
      const { metaEvents } = await load(ALLOWED);

      metaEvents.start();

      expect(mockSetFlushBehavior).not.toHaveBeenCalled();
    });

    test('Android: settings left on by an earlier launch can be turned off', async () => {
      const { metaEvents } = await load(REFUSED);

      metaEvents.stop();

      expect(mockSetAutoLog).toHaveBeenCalledWith(false);
      expect(mockSetAdId).toHaveBeenCalledWith(false);
      // Nothing to hold: this process never fully initialized the SDK.
      expect(mockSetFlushBehavior).not.toHaveBeenCalled();
    });

    test('iOS: a process that never started the SDK leaves it alone', async () => {
      mockPlatform.OS = 'ios';
      const { metaEvents } = await load(REFUSED);

      metaEvents.stop();

      expect(mockSetAutoLog).not.toHaveBeenCalled();
      expect(mockSetAdId).not.toHaveBeenCalled();
    });
  });

  describe('silent failure', () => {
    test('a setter that throws does not surface, or latch logging off in a loop', async () => {
      const { metaEvents } = await load(ALLOWED);
      mockSetAutoLog.mockImplementationOnce(() => {
        throw new Error('native module missing');
      });

      expect(() => metaEvents.start()).not.toThrow();
      expect(() => metaEvents.logTutorialComplete()).not.toThrow();
    });

    test('stopping when the SDK cannot be reached does not surface', async () => {
      const { metaEvents } = await load(REFUSED);
      mockSetAutoLog.mockImplementationOnce(() => {
        throw new Error('native module missing');
      });

      expect(() => metaEvents.stop()).not.toThrow();
    });
  });

  // What keeps the SDK off before JS runs is native configuration, which no other
  // test here can see. These three were each one edit, or one dependency bump, away
  // from sending data at launch for people who refused.
  describe('native configuration', () => {
    const { expo } = jest.requireActual<{
      expo: {
        plugins: unknown[];
        ios: { infoPlist?: Record<string, unknown>; privacyManifests?: Record<string, unknown> };
      };
    }>('../../app.json');
    const metaPlugin = (
      expo.plugins.find(
        plugin => Array.isArray(plugin) && plugin[0] === 'react-native-fbsdk-next',
      ) as [string, Record<string, unknown>]
    )[1];

    test.each(['isAutoInitEnabled', 'autoLogAppEventsEnabled', 'advertiserIDCollectionEnabled'])(
      'app.json turns %s off',
      flag => {
        expect(metaPlugin[flag]).toBe(false);
      },
    );

    test('the package does not start the SDK from the iOS AppDelegate', () => {
      const moduleConfig = jest.requireActual<{ ios: { appDelegateSubscribers?: string[] } }>(
        'react-native-fbsdk-next/expo-module.config.json',
      );

      expect(moduleConfig.ios.appDelegateSubscribers ?? []).toEqual([]);
    });

    test('never asks for ATT, and never lists a tracker as a tracking domain', () => {
      expect(metaPlugin['iosUserTrackingPermission']).toBeUndefined();
      expect(expo.ios.infoPlist?.['NSUserTrackingUsageDescription']).toBeUndefined();
      expect(expo.ios.privacyManifests?.['NSPrivacyTrackingDomains']).toBeUndefined();
    });
  });

  // The SDK's own attempt at its one-time install report always runs before JS can
  // allow it, so without this it fails on every launch, and nothing here would notice.
  test('Android repeats activateApp once the SDK is allowed to send', () => {
    const source = jest
      .requireActual<typeof import('node:fs')>('node:fs')
      .readFileSync(
        require.resolve('react-native-fbsdk-next/android/src/main/java/com/facebook/reactnative/androidsdk/FBSettingsModule.java'),
        'utf8',
      );

    expect(source).toContain('AppEventsLogger.activateApp');
  });

  // The whole service is built on a try/catch, so a setter missing from the path it
  // loads would turn the SDK off for everyone without a sound. The real file, then.
  test('the settings module it loads really has the setters it calls', () => {
    const { default: Settings } = jest.requireActual<{ default: Record<string, unknown> }>(
      'react-native-fbsdk-next/lib/commonjs/FBSettings',
    );

    expect(typeof Settings['setAutoLogAppEventsEnabled']).toBe('function');
    expect(typeof Settings['setAdvertiserIDCollectionEnabled']).toBe('function');
    expect(typeof Settings['setAdvertiserTrackingEnabled']).toBe('function');
    expect(typeof Settings['initializeSDK']).toBe('function');
  });

  test('the event logger module it loads really has what it calls', () => {
    const source = jest
      .requireActual<typeof import('node:fs')>('node:fs')
      .readFileSync(
        require.resolve('react-native-fbsdk-next/lib/commonjs/FBAppEventsLogger'),
        'utf8',
      );

    expect(source).toContain('setFlushBehavior(flushBehavior)');
    expect(source).toContain('flush()');
    expect(source).toContain('logEvent(eventName');
  });
});
