import { TextDecoder, TextEncoder } from 'util';

import { jest } from '@jest/globals';
if (typeof global.jest === 'undefined') {
  global.jest = jest;
}

// Mock Expo winter runtime globals to prevent import scope errors
if (typeof global.__ExpoImportMetaRegistry === 'undefined') {
  global.__ExpoImportMetaRegistry = {};
}

// Mock structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = value => JSON.parse(JSON.stringify(value));
}

// Mock other potential missing globals
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
  };
}

if (typeof global.queueMicrotask === 'undefined') {
  global.queueMicrotask = callback => setTimeout(callback, 0);
}

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

// Mock expo-system-ui for system UI customization
jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn().mockResolvedValue(undefined),
  setStatusBarStyle: jest.fn().mockResolvedValue(undefined),
  getBackgroundColorAsync: jest.fn().mockResolvedValue('#000000'),
}));

// Mock expo-file-system for file operations
jest.mock('expo-file-system', () => ({
  Paths: {
    cache: {
      uri: 'file:///mock/cache/',
    },
    document: {
      uri: 'file:///mock/document/',
    },
  },
  Directory: {
    create: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
  },
  File: {
    create: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    exists: jest.fn().mockResolvedValue(true),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue(''),
    copy: jest.fn().mockResolvedValue(undefined),
  },
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///mock/downloaded.mp3' }),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024, isDirectory: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock audio cache service
jest.mock('@/services/audioCache', () => ({
  audioCache: {
    getAudio: jest.fn().mockImplementation(url => {
      // Return a mock local path that preserves the filename for test assertions
      const filename = url.split('/').pop() || 'audio.mp3';
      return Promise.resolve(`file:///mock/cache/${filename}`);
    }),
    cacheAudio: jest.fn().mockResolvedValue(undefined),
    clearCache: jest.fn().mockResolvedValue(undefined),
    getCacheSize: jest.fn().mockResolvedValue(0),
  },
  AudioCacheManager: {
    getInstance: jest.fn(() => ({
      getAudio: jest.fn().mockImplementation(url => {
        const filename = url.split('/').pop() || 'audio.mp3';
        return Promise.resolve(`file:///mock/cache/${filename}`);
      }),
      cacheAudio: jest.fn().mockResolvedValue(undefined),
      clearCache: jest.fn().mockResolvedValue(undefined),
      getCacheSize: jest.fn().mockResolvedValue(0),
    })),
  },
}));

// Mock react-native-worklets for thread scheduling
jest.mock('react-native-worklets', () => ({
  scheduleOnRN: jest.fn(callback => {
    // Execute callback immediately in test environment (no threading)
    if (typeof callback === 'function') {
      return (...args) => callback(...args);
    }
    return callback;
  }),
  scheduleOnUI: jest.fn((callback, ...args) => {
    // Execute callback immediately in test environment (no threading)
    if (typeof callback === 'function') {
      callback(...args);
    }
  }),
  createWorklet: jest.fn(callback => callback),
  isWorklet: jest.fn(() => false),
}));

// Comprehensive react-native-reanimated mock for AI predictability
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  return {
    // Cancellation
    cancelAnimation: jest.fn(() => undefined),
    // Core animation values
    useSharedValue: (initialValue = 0) => {
      // Use React's useRef to maintain a stable reference across re-renders
      const React = require('react');
      const ref = React.useRef({ value: initialValue, modify: jest.fn() });
      return ref.current;
    },
    useAnimatedStyle: styleCallback => {
      try {
        return styleCallback() || {};
      } catch {
        return {};
      }
    },
    useDerivedValue: callback => ({ value: callback() }),
    useAnimatedProps: callback => callback(),
    useAnimatedReaction: (prepare, react) => {
      // Execute the reaction immediately in tests
      try {
        const prepared = prepare();
        react(prepared, prepared);
      } catch {
        // Ignore errors in test environment
      }
    },

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

    // Entering animations with springify chain to mirror builder API
    FadeIn: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
    },
    FadeOut: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
    },
    SlideInRight: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
    },
    SlideInLeft: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
    },
    ZoomIn: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
    },
    ZoomOut: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
    },
    SlideOutRight: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
    },
    SlideOutLeft: {
      duration: ms => ({
        duration: ms,
        delay: _ms => ({ delay: _ms, springify: () => ({}) }),
        springify: () => ({}),
      }),
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
    createAnimatedComponent: component =>
      React.forwardRef((props, ref) => React.createElement(component, { ...props, ref })),
    default: {
      View: React.forwardRef((props, ref) => React.createElement('View', { ...props, ref })),
      Text: React.forwardRef((props, ref) => React.createElement('Text', { ...props, ref })),
      ScrollView: React.forwardRef((props, ref) =>
        React.createElement('ScrollView', { ...props, ref }),
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
    // Interaction manager
    InteractionManager: {
      runAfterInteractions: jest.fn(cb => {
        try {
          if (typeof cb === 'function') cb();
        } catch {
          // ignore
        }
      }),
    },
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
    from: jest.fn(_table => {
      // Create a mock query builder that can return realistic data
      const mockQueryBuilder = {
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
        single: jest.fn().mockResolvedValue({
          data: { id: 1, title: 'Test Article', content: 'Test content' },
          error: null,
        }),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { id: 1, title: 'Test Article', content: 'Test content' },
          error: null,
        }),
        then: jest.fn().mockResolvedValue({
          data: [
            { id: 1, title: 'Test Article 1', content: 'Test content 1' },
            { id: 2, title: 'Test Article 2', content: 'Test content 2' },
          ],
          error: null,
        }),
      };

      return mockQueryBuilder;
    }),
    rpc: jest.fn().mockResolvedValue({
      data: { result: 'success' },
      error: null,
    }),
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
    useQuery: jest.fn().mockImplementation(({ queryKey, queryFn, enabled = true, initialData }) => {
      if (!enabled) {
        return {
          data: initialData,
          isLoading: false,
          isFetching: false,
          isError: false,
          error: null,
          refetch: jest.fn().mockResolvedValue({ data: initialData }),
          remove: jest.fn(),
          queryKey,
          isSuccess: false,
          isIdle: true,
          status: 'idle',
        };
      }

      // Actually call the query function to test real logic
      try {
        let data;
        if (queryFn) {
          // Handle both sync and async query functions
          const result = queryFn();
          if (result instanceof Promise) {
            // For async functions, we can't await in the mock, so return a default structure
            data = initialData || new Map();
          } else {
            data = result;
          }
        } else {
          data = initialData || [];
        }

        return {
          data,
          isLoading: false,
          isFetching: false,
          isError: false,
          error: null,
          refetch: jest.fn().mockResolvedValue({ data }),
          remove: jest.fn(),
          queryKey,
          isSuccess: true,
          isIdle: false,
          status: 'success',
        };
      } catch (error) {
        return {
          data: initialData,
          isLoading: false,
          isFetching: false,
          isError: true,
          error,
          refetch: jest.fn().mockRejectedValue(error),
          remove: jest.fn(),
          queryKey,
          isSuccess: false,
          isIdle: false,
          status: 'error',
        };
      }
    }),
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

// Patterns to suppress (known non-actionable warnings)
const suppressedPatterns = [
  /not wrapped in act/,
  /Warning: ReactDOM.render is no longer supported/,
  /Warning: An update to .* inside a test was not wrapped in act/,
  /Warning: You called act/,
  /Warning: The current testing environment is not configured to support act/,
  /Query data cannot be undefined/,
  /Affected query key/,
];

const shouldSuppress = message => {
  if (typeof message !== 'string') return false;
  return suppressedPatterns.some(pattern => pattern.test(message));
};

global.console = {
  ...originalConsole,
  log: process.env.NODE_ENV === 'test' ? jest.fn() : originalConsole.log,
  error: (...args) => {
    // Filter out known React testing warnings
    if (args.length > 0 && shouldSuppress(args[0])) {
      return;
    }
    originalConsole.error(...args);
  },
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
  useSafeAreaInsets: () => ({
    top: 44,
    right: 0,
    bottom: 34,
    left: 0,
  }),
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
  }),
);

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', reason => {
  // Handle unhandled promise rejections silently in tests
  throw new Error(`Unhandled promise rejection: ${reason}`);
});

// Optimized test timeout for AI efficiency
jest.setTimeout(15000); // Reduced from default

// React 19 + react-test-renderer compatibility fixes
global.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
