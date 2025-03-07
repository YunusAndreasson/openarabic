/**
 * @jest-environment node
 */

// eslint-disable-next-line no-undef
if (typeof global.jest === 'undefined') {
  global.jest = require('@jest/globals').jest;
}

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
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

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

// Fix TextEncoder issue in jest environment
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}
