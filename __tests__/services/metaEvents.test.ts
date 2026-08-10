const mockInitializeSDK = jest.fn();
const mockSettingsInitializeSDK = jest.fn();
const mockLogEvent = jest.fn();

jest.mock('react-native', () => ({
  NativeModules: { FBSettings: { initializeSDK: mockInitializeSDK } },
  Platform: { OS: 'android' },
  LogBox: { ignoreLogs: jest.fn() },
}));

jest.mock('react-native-fbsdk-next/lib/commonjs/FBSettings', () => {
  if (mockInitializeSDK.mock.calls.length === 0) {
    throw new Error('Facebook settings evaluated before native initialization');
  }

  return {
    default: {
      initializeSDK: mockSettingsInitializeSDK,
      setAdvertiserTrackingEnabled: jest.fn().mockResolvedValue(false),
    },
  };
});

jest.mock('react-native-fbsdk-next/lib/commonjs/FBAppEventsLogger', () => {
  if (mockSettingsInitializeSDK.mock.calls.length === 0) {
    throw new Error('App events evaluated before Settings.initializeSDK');
  }
  return { default: { logEvent: mockLogEvent } };
});

describe('metaEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('initializes the native SDK before evaluating the package barrel', () => {
    const { metaEvents } = require('@/services/metaEvents');

    expect(() => metaEvents.logTutorialComplete()).not.toThrow();
    expect(mockInitializeSDK).toHaveBeenCalledTimes(1);
    expect(mockSettingsInitializeSDK).toHaveBeenCalledTimes(1);
    expect(mockLogEvent).toHaveBeenCalledTimes(1);
  });
});
