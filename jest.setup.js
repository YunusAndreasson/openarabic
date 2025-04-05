/**
 * @jest-environment node
 */

import { TextEncoder, TextDecoder } from 'util';

import { jest } from '@jest/globals';

// eslint-disable-next-line no-undef
if (typeof global.jest === 'undefined') {
  global.jest = jest;
}

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = function (callback) {
  return setTimeout(callback, 0);
};

global.cancelAnimationFrame = function (id) {
  clearTimeout(id);
};

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

// Mock timers
jest.useFakeTimers();

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => ({
  FadeIn: {
    duration: () => ({
      delay: () => ({}),
    }),
  },
  FadeOut: {
    duration: () => ({
      delay: () => ({}),
    }),
  },
  Layout: {
    duration: () => ({}),
  },
  SlideInRight: {
    duration: () => ({
      delay: () => ({}),
    }),
  },
  default: {
    View: 'View',
    Text: 'Text',
    Image: 'Image',
    ScrollView: 'ScrollView',
    createAnimatedComponent: component => component,
    call: () => {},
    addWhitelistedNativeProps: () => {},
    Value: jest.fn(() => ({
      setValue: jest.fn(),
    })),
  },
}));

// Mock React Native
jest.mock('react-native', () => {
  return {
    AppState: {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      currentState: 'active',
    },
    Dimensions: {
      get: jest.fn().mockReturnValue({ width: 375, height: 812 }),
    },
    NativeModules: {},
    Platform: {
      OS: 'ios',
      select: jest.fn(obj => obj.ios),
    },
    StyleSheet: {
      create: jest.fn(styles => styles),
      flatten: jest.fn(style => style),
    },
    Animated: {
      Value: jest.fn(() => ({
        interpolate: jest.fn(),
      })),
      View: 'View',
      Text: 'Text',
    },
    View: 'View',
    Text: 'Text',
    TouchableOpacity: 'TouchableOpacity',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    ScrollView: 'ScrollView',
    Image: 'Image',
    TextInput: 'TextInput',
    Alert: {
      alert: jest.fn(),
    },
  };
});

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn(),
  })),
}));

// Mock useQuery and other React Query hooks
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    useQuery: jest.fn().mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    }),
    useMutation: jest.fn().mockImplementation(({ mutationFn }) => ({
      mutate: async params => mutationFn(params),
      isLoading: false,
      reset: jest.fn(),
    })),
    useQueryClient: jest.fn().mockReturnValue({
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
      getQueryData: jest.fn(),
    }),
  };
});

// Suppress console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Add a global fetch mock
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({}),
  text: jest.fn().mockResolvedValue(''),
});

// Mock DateTimeFormat for consistent date handling
global.Intl = {
  DateTimeFormat: () => ({
    resolvedOptions: () => ({ timeZone: 'UTC' }),
    format: date => new Date(date).toISOString(),
  }),
};

if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  SafeAreaProvider: 'SafeAreaProvider',
  useSafeAreaInsets: jest.fn().mockReturnValue({
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }),
  SafeAreaConsumer: ({ children }) => children({ top: 0, right: 0, bottom: 0, left: 0 }),
  Edge: {
    top: 'top',
    right: 'right',
    bottom: 'bottom',
    left: 'left',
  },
}));

// Reduce the default timeout from 5000ms to 1000ms
jest.setTimeout(10000);

// Mock expo-av for audio tests
jest.mock('expo-av', () => {
  const mockSound = {
    playAsync: jest.fn().mockResolvedValue({}),
    pauseAsync: jest.fn().mockResolvedValue({}),
    stopAsync: jest.fn().mockResolvedValue({}),
    unloadAsync: jest.fn().mockResolvedValue({}),
    setPositionAsync: jest.fn().mockResolvedValue({}),
    getStatusAsync: jest.fn().mockResolvedValue({
      isLoaded: true,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 100000,
      isBuffering: false,
      didJustFinish: false,
    }),
  };

  return {
    Audio: {
      Sound: {
        createAsync: jest.fn().mockResolvedValue({
          sound: mockSound,
          status: {
            isLoaded: true,
          },
        }),
      },
      setAudioModeAsync: jest.fn().mockResolvedValue({}),
    },
  };
});

// Mock for static file imports
jest.mock('react-native/Libraries/Image/resolveAssetSource', () => () => ({
  uri: 'test-file-stub',
}));
