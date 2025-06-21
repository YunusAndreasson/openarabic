import { TextEncoder, TextDecoder } from 'util';

import { jest } from '@jest/globals';
import { configure } from 'reassure';

// Configure Reassure for performance testing (AI agents benefit from performance insights)
if (typeof global.jest === 'undefined') {
  global.jest = jest;
}

configure({
  testingLibrary: 'react-native',
  // AI-optimized performance testing configuration
  runs: 5, // Reduced runs for faster CI/CD cycles
  warmupRuns: 1, // Minimal warmup for efficiency
  outputFile: './coverage/performance-results.json',
});

// Enhanced animation frame mocking for consistent timing
global.requestAnimationFrame = function (callback) {
  return global.setTimeout(callback, 16); // 60fps simulation
};

global.cancelAnimationFrame = function (id) {
  global.clearTimeout(id);
};

// Comprehensive AsyncStorage mock with AI-friendly error handling
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn().mockImplementation(async (key, value) => {
    if (!key || !value) throw new Error(`AsyncStorage.setItem: Invalid key or value`);
    const promise = Promise.resolve();
    // Ensure redux-persist compatibility by adding catch method
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
  getItem: jest.fn().mockImplementation(async key => {
    if (!key) throw new Error(`AsyncStorage.getItem: Invalid key`);
    const promise = Promise.resolve(null);
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
  removeItem: jest.fn().mockImplementation(async key => {
    if (!key) throw new Error(`AsyncStorage.removeItem: Invalid key`);
    const promise = Promise.resolve();
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
  clear: jest.fn().mockImplementation(() => {
    const promise = Promise.resolve(undefined);
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
  getAllKeys: jest.fn().mockImplementation(() => {
    const promise = Promise.resolve([]);
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
  multiGet: jest.fn().mockImplementation(() => {
    const promise = Promise.resolve([]);
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
  multiSet: jest.fn().mockImplementation(() => {
    const promise = Promise.resolve(undefined);
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
  multiRemove: jest.fn().mockImplementation(() => {
    const promise = Promise.resolve(undefined);
    promise.catch = jest.fn(() => promise);
    return promise;
  }),
}));

// AI-optimized timer configuration
jest.useFakeTimers({
  advanceTimers: true,
  doNotFake: ['nextTick', 'setImmediate'], // Keep these real for better async testing
});

// Enhanced expo-haptics mock with feedback validation
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockImplementation(async style => {
    if (!['Light', 'Medium', 'Heavy'].includes(style)) {
      throw new Error(`Invalid haptic style: ${style}`);
    }
    return Promise.resolve();
  }),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockImplementation(async type => {
    if (!['Success', 'Warning', 'Error'].includes(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }
    return Promise.resolve();
  }),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: {
    Success: 'Success',
    Warning: 'Warning',
    Error: 'Error',
  },
}));

// Comprehensive react-native-reanimated mock for AI predictability
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  return {
    // Core animation values
    useSharedValue: (initialValue = 0) => ({
      value: initialValue,
      modify: jest.fn(),
    }),
    useAnimatedStyle: styleCallback => {
      try {
        return styleCallback() || {};
      } catch {
        return {};
      }
    },
    useDerivedValue: callback => ({ value: callback() }),
    useAnimatedProps: callback => callback(),

    // Animation functions
    withTiming: (value, _config, callback) => {
      if (callback) global.setTimeout(callback, 0);
      return value;
    },
    withSpring: (value, _config, callback) => {
      if (callback) global.setTimeout(callback, 0);
      return value;
    },
    withDelay: (_delay, animation) => animation,
    withRepeat: (animation, _numberOfReps) => animation,
    withSequence: (...animations) => animations[animations.length - 1],

    // Interpolation
    interpolate: (value, inputRange, outputRange, _extrapolate) => {
      if (!Array.isArray(inputRange) || !Array.isArray(outputRange)) return value;
      if (inputRange.length !== outputRange.length) return value;

      // Simple linear interpolation for testing
      const ratio = (value - inputRange[0]) / (inputRange[1] - inputRange[0]);
      return outputRange[0] + ratio * (outputRange[1] - outputRange[0]);
    },
    interpolateColor: (value, inputRange, outputRange) => outputRange[0],

    // Gesture handling
    runOnUI: callback => callback,
    runOnJS:
      callback =>
      (...args) =>
        callback(...args),

    // Layout animations
    Layout: {
      duration: ms => ({ duration: ms }),
      delay: ms => ({ delay: ms }),
      springify: () => ({}),
      damping: value => ({ damping: value }),
      mass: value => ({ mass: value }),
      stiffness: value => ({ stiffness: value }),
    },

    // Entering animations
    FadeIn: {
      duration: ms => ({ duration: ms, delay: ms => ({ delay: ms }) }),
    },
    FadeOut: {
      duration: ms => ({ duration: ms, delay: ms => ({ delay: ms }) }),
    },
    SlideInRight: {
      duration: ms => ({ duration: ms, delay: ms => ({ delay: ms }) }),
    },
    SlideInLeft: {
      duration: ms => ({ duration: ms, delay: ms => ({ delay: ms }) }),
    },
    ZoomIn: {
      duration: ms => ({ duration: ms, delay: ms => ({ delay: ms }) }),
    },

    // Easing functions
    Easing: {
      linear: jest.fn(t => t),
      ease: jest.fn(t => t),
      quad: jest.fn(t => t * t),
      cubic: jest.fn(t => t * t * t),
      bezier: jest.fn(() => jest.fn(t => t)),
      circle: jest.fn(t => 1 - Math.sqrt(1 - t * t)),
      back: jest.fn(t => t),
      bounce: jest.fn(t => t),
      elastic: jest.fn(t => t),
      sin: jest.fn(t => Math.sin((t * Math.PI) / 2)),
      exp: jest.fn(t => Math.pow(2, 10 * (t - 1))),
      out: jest.fn(fn => fn),
      in: jest.fn(fn => fn),
      inOut: jest.fn(fn => fn),
    },

    // Animated components
    default: {
      View: React.forwardRef((props, ref) => React.createElement('View', { ...props, ref })),
      Text: React.forwardRef((props, ref) => React.createElement('Text', { ...props, ref })),
      ScrollView: React.forwardRef((props, ref) =>
        React.createElement('ScrollView', { ...props, ref })
      ),
      Image: React.forwardRef((props, ref) => React.createElement('Image', { ...props, ref })),
      createAnimatedComponent: component =>
        React.forwardRef((props, ref) => React.createElement(component, { ...props, ref })),
    },
  };
});

// Enhanced React Native mock with comprehensive API coverage
jest.mock('react-native', () => {
  return {
    // App state management
    AppState: {
      addEventListener: jest.fn((_event, _callback) => ({
        remove: jest.fn(),
      })),
      removeEventListener: jest.fn(),
      currentState: 'active',
    },

    // Device information
    Dimensions: {
      get: jest.fn(dimension => {
        const dimensions = {
          window: { width: 375, height: 812, scale: 2, fontScale: 1 },
          screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
        };
        return dimensions[dimension] || dimensions.window;
      }),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },

    // Theme detection
    useColorScheme: jest.fn(() => 'light'),
    useWindowDimensions: jest.fn(() => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    })),

    // Platform detection
    Platform: {
      OS: 'ios',
      Version: '15.0',
      select: jest.fn(obj => obj.ios || obj.default),
      isPad: false,
      isTesting: true,
    },

    // Styling
    StyleSheet: {
      create: jest.fn(styles => styles),
      flatten: jest.fn(style => style),
      absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      hairlineWidth: 1,
    },

    // Animation (legacy)
    Animated: {
      Value: jest.fn(_value => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        interpolate: jest.fn(() => ({ interpolate: jest.fn() })),
      })),
      timing: jest.fn(() => ({ start: jest.fn() })),
      spring: jest.fn(() => ({ start: jest.fn() })),
      decay: jest.fn(() => ({ start: jest.fn() })),
      sequence: jest.fn(() => ({ start: jest.fn() })),
      parallel: jest.fn(() => ({ start: jest.fn() })),
      stagger: jest.fn(() => ({ start: jest.fn() })),
      loop: jest.fn(() => ({ start: jest.fn() })),
      View: 'Animated.View',
      Text: 'Animated.Text',
      ScrollView: 'Animated.ScrollView',
      Image: 'Animated.Image',
      createAnimatedComponent: jest.fn(component => component),
    },

    // Core components
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Image: 'Image',
    TextInput: 'TextInput',
    Pressable: 'Pressable',
    TouchableOpacity: 'TouchableOpacity',
    TouchableHighlight: 'TouchableHighlight',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    FlatList: 'FlatList',
    SectionList: 'SectionList',
    VirtualizedList: 'VirtualizedList',
    Modal: 'Modal',
    Switch: 'Switch',
    Button: 'Button',

    // User interaction
    Alert: {
      alert: jest.fn((title, message, buttons, _options) => {
        // Simulate pressing the first button or OK
        if (buttons && buttons[0] && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }),
      prompt: jest.fn(),
    },

    // Keyboard
    Keyboard: {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn(),
    },

    // Layout measurement
    PixelRatio: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn(size => size * 2),
      roundToNearestPixel: jest.fn(size => Math.round(size)),
    },

    // Status bar
    StatusBar: {
      setBarStyle: jest.fn(),
      setBackgroundColor: jest.fn(),
      setHidden: jest.fn(),
      setTranslucent: jest.fn(),
      currentHeight: 20,
    },

    // Vibration
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },

    // Linking
    Linking: {
      openURL: jest.fn().mockResolvedValue(true),
      canOpenURL: jest.fn().mockResolvedValue(true),
      getInitialURL: jest.fn().mockResolvedValue(null),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },

    // BackHandler
    BackHandler: {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },

    // Share
    Share: {
      share: jest.fn().mockResolvedValue({ action: 'sharedAction' }),
    },

    // Clipboard
    Clipboard: {
      getString: jest.fn().mockResolvedValue(''),
      setString: jest.fn(),
    },

    // PanResponder
    PanResponder: {
      create: jest.fn(() => ({
        panHandlers: {},
      })),
    },
  };
});

// Enhanced Supabase mock with realistic API simulation
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(_table => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      rangeGt: jest.fn().mockReturnThis(),
      rangeGte: jest.fn().mockReturnThis(),
      rangeLt: jest.fn().mockReturnThis(),
      rangeLte: jest.fn().mockReturnThis(),
      rangeAdjacent: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn().mockResolvedValue({ data: [], error: null }),
    })),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: null }),
        download: jest.fn().mockResolvedValue({ data: null, error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        list: jest.fn().mockResolvedValue({ data: [], error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://example.com/file.jpg' },
        }),
      })),
    },
  })),
}));

// Mock react-native-url-polyfill to prevent BlobModule issues
jest.mock('react-native-url-polyfill/auto', () => {});

// Mock redux-persist to prevent AsyncStorage issues
jest.mock('redux-persist', () => {
  const actual = jest.requireActual('redux-persist');
  return {
    ...actual,
    persistStore: jest.fn(() => ({
      dispatch: jest.fn(),
      subscribe: jest.fn(),
      getState: jest.fn(() => ({})),
      replaceReducer: jest.fn(),
      purge: jest.fn(() => Promise.resolve()),
      flush: jest.fn(() => Promise.resolve()),
      pause: jest.fn(),
      persist: jest.fn(),
    })),
    persistReducer: jest.fn((config, reducer) => reducer),
  };
});

// Enhanced React Query mock with realistic data flow
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');

  return {
    ...originalModule,
    useQuery: jest.fn().mockImplementation(({ queryKey, queryFn: _queryFn, enabled = true }) => ({
      data: enabled ? [] : undefined,
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: jest.fn().mockResolvedValue({ data: [] }),
      remove: jest.fn(),
      queryKey,
      isSuccess: enabled,
      isIdle: !enabled,
      status: enabled ? 'success' : 'idle',
    })),
    useMutation: jest.fn().mockImplementation(({ mutationFn, onSuccess, onError }) => ({
      mutate: jest.fn().mockImplementation(async variables => {
        try {
          const result = await mutationFn(variables);
          if (onSuccess) onSuccess(result, variables);
          return result;
        } catch (error) {
          if (onError) onError(error, variables);
          throw error;
        }
      }),
      mutateAsync: jest.fn().mockImplementation(async variables => {
        try {
          const result = await mutationFn(variables);
          if (onSuccess) onSuccess(result, variables);
          return result;
        } catch (error) {
          if (onError) onError(error, variables);
          throw error;
        }
      }),
      isLoading: false,
      isError: false,
      error: null,
      reset: jest.fn(),
      variables: undefined,
      data: undefined,
    })),
    useQueryClient: jest.fn().mockReturnValue({
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
      setQueryData: jest.fn(),
      getQueryData: jest.fn().mockReturnValue(undefined),
      removeQueries: jest.fn(),
      cancelQueries: jest.fn().mockResolvedValue(undefined),
      refetchQueries: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
    }),
    QueryClient: jest.fn().mockImplementation(() => ({
      invalidateQueries: jest.fn().mockResolvedValue(undefined),
      setQueryData: jest.fn(),
      getQueryData: jest.fn().mockReturnValue(undefined),
      removeQueries: jest.fn(),
      cancelQueries: jest.fn().mockResolvedValue(undefined),
      refetchQueries: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn(),
    })),
    QueryClientProvider: ({ children }) => children,
  };
});

// AI-optimized console configuration (selective logging)
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.log,
  error: originalConsole.error, // Keep errors visible for AI debugging
  warn: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.warn,
  info: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.info,
  debug: jest.fn(), // Always suppress debug
};

// Enhanced fetch mock with realistic network simulation
global.fetch = jest.fn().mockImplementation(async (url, _options = {}) => {
  // Simulate network delay for more realistic testing
  await new Promise(resolve => global.setTimeout(resolve, 10));

  const mockResponse = {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new global.Headers(),
    url,
    json: jest.fn().mockResolvedValue({}),
    text: jest.fn().mockResolvedValue(''),
    blob: jest.fn().mockResolvedValue(new global.Blob()),
    arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
    clone: jest.fn().mockReturnThis(),
  };

  return mockResponse;
});

// Enhanced date/time mocking for consistent testing
const mockDate = new Date('2024-01-15T12:00:00.000Z');
global.Date = class extends Date {
  constructor(...args) {
    if (args.length === 0) {
      super(mockDate);
    } else {
      super(...args);
    }
  }

  static now() {
    return mockDate.getTime();
  }
};

// Intl polyfill for consistent internationalization
global.Intl = {
  ...global.Intl,
  DateTimeFormat: jest.fn().mockImplementation((locale, options) => ({
    format: jest.fn(date => new Date(date).toISOString()),
    formatToParts: jest.fn(() => []),
    resolvedOptions: jest.fn(() => ({
      locale: locale || 'en-US',
      timeZone: 'UTC',
      ...options,
    })),
  })),
  NumberFormat: jest.fn().mockImplementation((locale, options) => ({
    format: jest.fn(number => number.toString()),
    formatToParts: jest.fn(() => []),
    resolvedOptions: jest.fn(() => ({
      locale: locale || 'en-US',
      ...options,
    })),
  })),
};

// Enhanced safe area context mock
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
  SafeAreaProvider: ({ children }) => children,
  useSafeAreaInsets: jest.fn(() => ({
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  })),
  SafeAreaConsumer: ({ children }) =>
    children({
      top: 44,
      right: 0,
      bottom: 34,
      left: 0,
    }),
  initialWindowMetrics: {
    insets: { top: 44, right: 0, bottom: 34, left: 0 },
    frame: { x: 0, y: 0, width: 375, height: 812 },
  },
}));

// Comprehensive expo-audio mock
jest.mock('expo-audio', () => {
  const createMockSound = () => ({
    playAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
    pauseAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
    stopAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
    unloadAsync: jest.fn().mockResolvedValue({ status: 'unloaded' }),
    setPositionAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
    setRateAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
    setVolumeAsync: jest.fn().mockResolvedValue({ status: 'loaded' }),
    getStatusAsync: jest.fn().mockResolvedValue({
      isLoaded: true,
      isPlaying: false,
      positionMillis: 0,
      durationMillis: 100000,
      rate: 1.0,
      volume: 1.0,
      isBuffering: false,
      didJustFinish: false,
    }),
    setOnPlaybackStatusUpdate: jest.fn(),
  });

  return {
    Audio: {
      Sound: {
        createAsync: jest.fn().mockResolvedValue(createMockSound()),
      },
      setAudioModeAsync: jest.fn().mockResolvedValue({}),
      RecordingOptionsPresets: {
        HIGH_QUALITY: {},
      },
    },
    AudioPlayer: {
      create: jest.fn().mockResolvedValue(createMockSound()),
    },
    InterruptionModeIOS: {
      MixWithOthers: 0,
      DoNotMix: 1,
      DuckOthers: 2,
    },
    InterruptionModeAndroid: {
      DoNotMix: 1,
      DuckOthers: 2,
    },
  };
});

// Mock for static file imports with better error handling
jest.mock('react-native/Libraries/Image/resolveAssetSource', () =>
  jest.fn(source => {
    if (!source) return null;
    return {
      uri: typeof source === 'string' ? source : 'test-file-stub',
      width: 100,
      height: 100,
      scale: 1,
    };
  })
);

// Global error handler for unhandled promise rejections (AI debugging)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Optimized test timeout for AI efficiency
jest.setTimeout(15000); // Reduced from default

if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
