// `resetMocks: true` (jest.config.js) wipes the implementation of EVERY
// jest.fn() before each test, the ones in the jest.mock factories below and in
// __mocks__/* included, so `jest.fn(impl)` there returns undefined inside a
// test. A mock whose implementation must hold is made with `mockStable(impl)`:
// the implementation is recorded and re-applied by the beforeEach below, which
// runs right after the reset. Its calls are still recorded and cleared per
// test, and a test can still override it (mockReturnValue, mockImplementation)
// for that one test.
//
// A global, so __mocks__/* can use it too; the `mock` prefix is what lets the
// hoisted jest.mock factories reference it (babel-plugin-jest-hoist).
const mockStableRegistry = [];
global.mockStable = impl => {
  const fn = jest.fn(impl);
  mockStableRegistry.push([fn, impl]);
  return fn;
};
beforeEach(() => {
  for (const [fn, impl] of mockStableRegistry) fn.mockImplementation(impl);
});

// TextEncoder/TextDecoder, structuredClone, performance, queueMicrotask and
// AbortController are not polyfilled here: jest-environment-node 30 copies
// Node's own into every test context.

// Mock Expo winter runtime globals to prevent import scope errors
if (typeof global.__ExpoImportMetaRegistry === 'undefined') {
  global.__ExpoImportMetaRegistry = {};
}

// Enhanced animation frame mocking for consistent timing
global.requestAnimationFrame = function (callback) {
  return global.setTimeout(callback, 16); // 60fps simulation
};

global.cancelAnimationFrame = function (id) {
  global.clearTimeout(id);
};

// AsyncStorage: nothing stored, every write accepted. The real module rejects
// a missing key and a null/undefined value; an empty string is a valid value.
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: mockStable(async (key, value) => {
    if (!key || value == null) throw new Error('AsyncStorage.setItem: Invalid key or value');
  }),
  getItem: mockStable(async key => {
    if (!key) throw new Error('AsyncStorage.getItem: Invalid key');
    return null;
  }),
  removeItem: mockStable(async key => {
    if (!key) throw new Error('AsyncStorage.removeItem: Invalid key');
  }),
  clear: mockStable(async () => undefined),
  getAllKeys: mockStable(async () => []),
  multiGet: mockStable(async () => []),
  multiSet: mockStable(async () => undefined),
  multiRemove: mockStable(async () => undefined),
}));

// AI-optimized timer configuration
jest.useFakeTimers({
  advanceTimers: true,
  doNotFake: ['nextTick', 'setImmediate'], // Keep these real for better async testing
});

// Mock expo-router/react-navigation: loading it pulls in MaskedViewNative which
// reaches getViewManagerConfig on react-native's NativeModules. Tests don't
// exercise this; stub the small surface the codebase actually imports.
//
// `useFocusEffect` behaves as it does on a focused screen: the effect runs
// after mount and again whenever the (memoised) callback changes, and its
// cleanup runs before that and on unmount.
jest.mock('expo-router/react-navigation', () => {
  const React = require('react');
  return {
    useFocusEffect: mockStable(callback => React.useEffect(callback, [callback])),
    useHeaderHeight: mockStable(() => 44),
    DarkTheme: { dark: true, colors: {} },
    DefaultTheme: { dark: false, colors: {} },
    ThemeProvider: ({ children }) => children,
  };
});

// Mock top-level expo-router: SDK 56 deprecates many expo-router/react-navigation
// re-exports in favor of the typed top-level paths. Loading the real module
// pulls in expo-constants (EXDevLauncher) which fails under jest. Stub the
// surface the codebase imports — anything not listed here will be undefined.
jest.mock('expo-router', () => {
  const React = require('react');
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: mockStable(() => true),
    // An undefined answer here reads as "nothing to dismiss to" and reroutes
    // every close. A test that needs `false` overrides it for that test.
    canDismiss: mockStable(() => true),
    setParams: jest.fn(),
    navigate: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
  };
  const Stack = Object.assign(({ children }) => children, {
    Screen: () => null,
    Protected: ({ children }) => children,
    // Renders null in the real module too — it only folds its props into the
    // parent Stack's header options. Without it, any test rendering a screen
    // with a search bar throws on an undefined JSX type.
    SearchBar: () => null,
  });
  return {
    router,
    useRouter: () => router,
    useFocusEffect: mockStable(callback => React.useEffect(callback, [callback])),
    useIsFocused: () => true,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      setOptions: jest.fn(),
      addListener: jest.fn(() => () => {}),
    }),
    useNavigationContainerRef: () => ({ current: null }),
    useSegments: () => [],
    useLocalSearchParams: () => ({}),
    usePathname: () => '/',
    Stack,
    Tabs: Object.assign(({ children }) => children, { Screen: () => null }),
    Link: ({ children }) => children,
    Redirect: () => null,
    DarkTheme: { dark: true, colors: {} },
    DefaultTheme: { dark: false, colors: {} },
    ThemeProvider: ({ children }) => children,
    useTheme: () => ({ dark: false, colors: {} }),
  };
});

// Mock expo-system-ui for system UI customization
jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: mockStable(() => Promise.resolve(undefined)),
  setStatusBarStyle: mockStable(() => Promise.resolve(undefined)),
  getBackgroundColorAsync: mockStable(() => Promise.resolve('#000000')),
}));

// Mock expo-keep-awake. The review session and the article reader hold a wake
// lock (hooks/common/useKeepScreenAwake) while mounted, and jest-expo does not
// stub the native module, so importing either screen threw "Cannot find native
// module 'ExpoKeepAwake'" before the suite could render anything.
//
// The promises must hold in every test: the hook chains `.catch()` on
// activateKeepAwakeAsync. The lock's own behaviour (tag identity, release on
// unmount, release on going inactive) is covered by
// __tests__/hooks/common/useKeepScreenAwake.test.ts.
jest.mock('expo-keep-awake', () => ({
  useKeepAwake: mockStable(() => undefined),
  activateKeepAwakeAsync: mockStable(() => Promise.resolve()),
  deactivateKeepAwake: mockStable(() => Promise.resolve()),
  isAvailableAsync: mockStable(() => Promise.resolve(true)),
  ExpoKeepAwakeTag: 'ExpoKeepAwakeDefaultTag',
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
  // create/delete/list/info are SYNCHRONOUS — they return values and throw;
  // they never resolve or reject. Mocking them as async lets a test pass
  // against behaviour the real module cannot produce, which is exactly how an
  // unhandled rejection hid here before. write/text/copy/move are the async
  // ones (write since SDK 58). `exists` is a getter, not a method.
  Directory: {
    create: jest.fn(),
    delete: jest.fn(),
    list: mockStable(() => []),
    exists: true,
  },
  File: {
    create: jest.fn(),
    delete: jest.fn(),
    write: jest.fn(),
    text: mockStable(() => ''),
    copy: jest.fn(),
    exists: true,
    size: 1024,
  },
  // NOTE: the legacy function API (downloadAsync/getInfoAsync/makeDirectoryAsync/
  // deleteAsync/readAsStringAsync/writeAsStringAsync) is deliberately absent.
  // It was removed in SDK 54 and now throws at runtime, so mocking it would let a
  // test pass against behaviour the real module cannot produce. Only the
  // Directory/File/Paths API above exists — see services/audioCache.ts.
}));

// Mini-player visibility hook is a thin wrapper over useGlobalAudioState which
// pulls in the full audio + playlist + toast stack. Tests don't exercise the
// player; stub it to false so layouts that gate on it stay inert.
// Icons render as `mock-icon-<name>` text everywhere (see __mocks__/app-icon.js);
// __tests__/components/ui/Icon.test.tsx tests the real component.
jest.mock('@/components/ui/Icon', () => require('./__mocks__/app-icon.js'));

jest.mock('@/hooks/audio/useShouldShowMiniPlayer', () => ({
  useShouldShowMiniPlayer: () => false,
}));

// Mock audio cache service. Lookups hand back a local path that keeps the
// file name, so a test can tell which file was asked for.
jest.mock('@/services/audioCache', () => {
  const mockLocalPath = url =>
    Promise.resolve(`file:///mock/cache/${url.split('/').pop() || 'audio.mp3'}`);
  const mockCacheApi = () => ({
    getAudio: mockStable(mockLocalPath),
    // Cache-hit-only lookup. Defaults to a HIT so existing suites keep seeing a
    // local path; miss-path tests override with mockResolvedValue(null).
    getCachedPath: mockStable(mockLocalPath),
    prefetch: mockStable(() => Promise.resolve(undefined)),
    cacheAudio: mockStable(() => Promise.resolve(undefined)),
    invalidate: mockStable(() => Promise.resolve(undefined)),
    clearCache: mockStable(() => Promise.resolve(undefined)),
    getCacheSize: mockStable(() => Promise.resolve(0)),
  });
  return {
    audioCache: mockCacheApi(),
    AudioCacheManager: { getInstance: mockStable(mockCacheApi) },
  };
});

// Mock react-native-worklets for thread scheduling
jest.mock('react-native-worklets', () => ({
  // Runs the callback immediately (no threading in tests). The trailing args
  // must be forwarded and the call must actually happen: this used to return an
  // uninvoked closure and drop the args, so every `scheduleOnRN(fn, value)` in
  // the app — the swipe commit arm, the verdict tone, AnimatedCount, the sheet
  // backdrop — was a silent no-op under test and anything downstream of one
  // passed vacuously.
  scheduleOnRN: mockStable((callback, ...args) => {
    if (typeof callback === 'function') {
      return callback(...args);
    }
    return callback;
  }),
  scheduleOnUI: mockStable((callback, ...args) => {
    // Execute callback immediately in test environment (no threading)
    if (typeof callback === 'function') {
      callback(...args);
    }
  }),
}));

// Comprehensive react-native-reanimated mock for AI predictability
jest.mock('react-native-reanimated', () => {
  const React = require('react');

  // Chainable layout-animation builder: every builder method returns the chain
  // so call orders like ZoomIn.duration(x).springify().withCallback(cb) work.
  const createLayoutBuilderMock = () => {
    const chain = {};
    chain.duration = () => chain;
    chain.delay = () => chain;
    chain.springify = () => chain;
    chain.damping = () => chain;
    chain.dampingRatio = () => chain;
    chain.stiffness = () => chain;
    chain.withCallback = () => chain;
    return chain;
  };

  return {
    // Without this, Babel's interop ignores the `default` key below and hands a
    // default import the whole exports object — so `Animated.View` is undefined
    // and any component rendering one fails with "Element type is invalid".
    // The __mocks__ copy of this mock already sets it; the two must agree.
    __esModule: true,
    // The real enum's values. Hooks pass `ReduceMotion.Never` to the
    // animations that are opacity only (useCardVerdict, useOpacityAnimation).
    ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
    // Cancellation
    cancelAnimation: jest.fn(),
    // Core animation values
    useSharedValue: (initialValue = 0) => {
      // Use React's useRef to maintain a stable reference across re-renders
      const React = require('react');
      const ref = React.useRef(null);
      if (ref.current === null) {
        const sv = {
          value: initialValue,
          modify: jest.fn(),
          get() {
            return this.value;
          },
          set(next) {
            this.value = typeof next === 'function' ? next(this.value) : next;
          },
        };
        ref.current = sv;
      }
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
    // The device setting, not an animation value. `false` is the honest default
    // for a test environment: components branch on it to swap a looping
    // animation for a still frame, and reporting "reduced" would render every
    // such component in its fallback shape and quietly stop testing the real
    // one. Absent until the first test rendered `PulsatingLoader`, which reads
    // it — the failure is "useReducedMotion is not a function", one layer below
    // whatever component pulled the loader in.
    useReducedMotion: () => false,
    useAnimatedProps: callback => callback(),
    useAnimatedReaction: (prepare, react) => {
      // Runs after every commit. Reanimated starts its mapper from an effect, so
      // a reaction never runs during render; running it there here made any
      // reaction that sets React state through scheduleOnRN re-render forever.
      // `previous` is what Reanimated passes: null on the first run, then the
      // last prepared value. Passing `prepared` twice made every
      // `current !== previous` guard false, so a reaction that only acts on a
      // change never ran under test.
      const React = require('react');
      const previousRef = React.useRef(null);
      React.useEffect(() => {
        try {
          const prepared = prepare();
          const previous = previousRef.current;
          previousRef.current = prepared;
          react(prepared, previous);
        } catch {
          // Ignore errors in test environment
        }
      });
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

    // Entering animations with a chainable builder to mirror the real API
    // (duration/delay/springify/withCallback all return the builder)
    FadeIn: createLayoutBuilderMock(),
    FadeOut: createLayoutBuilderMock(),
    SlideInRight: createLayoutBuilderMock(),
    SlideInLeft: createLayoutBuilderMock(),
    ZoomIn: createLayoutBuilderMock(),
    ZoomOut: createLayoutBuilderMock(),
    SlideOutRight: createLayoutBuilderMock(),
    SlideOutLeft: createLayoutBuilderMock(),

    // Easing functions
    Easing: {
      linear: mockStable(t => t),
      ease: mockStable(t => t),
      quad: mockStable(t => t * t),
      cubic: mockStable(t => t * t * t),
      bezier: mockStable(() => t => t),
      circle: mockStable(t => 1 - Math.sqrt(1 - t * t)),
      back: mockStable(() => t => t),
      bounce: mockStable(t => t),
      elastic: mockStable(() => t => t),
      sin: mockStable(t => Math.sin((t * Math.PI) / 2)),
      exp: mockStable(t => Math.pow(2, 10 * (t - 1))),
      out: mockStable(fn => fn),
      in: mockStable(fn => fn),
      inOut: mockStable(fn => fn),
    },

    // CSS-style easing helper used at module scope (e.g. ProgressBar.tsx)
    cubicBezier: mockStable(() => 'linear'),

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
  // Every `addEventListener` hands back a subscription, as the real ones do, so
  // an effect cleaning up with `subscription.remove()` works under test.
  const mockSubscription = () => ({ remove: jest.fn() });

  // react-native's own flattenStyle: falsy and non-object entries drop out,
  // nested arrays merge left to right, and a plain object comes back as is.
  const mockFlattenStyle = style => {
    if (style === null || typeof style !== 'object') return undefined;
    if (!Array.isArray(style)) return style;
    const result = {};
    for (const entry of style) {
      const flat = mockFlattenStyle(entry);
      if (flat) Object.assign(result, flat);
    }
    return result;
  };

  return {
    // App state management
    AppState: {
      addEventListener: mockStable(mockSubscription),
      removeEventListener: jest.fn(),
      currentState: 'active',
    },

    // Accessibility settings
    AccessibilityInfo: {
      isReduceTransparencyEnabled: mockStable(() => Promise.resolve(false)),
      isReduceMotionEnabled: mockStable(() => Promise.resolve(false)),
      isScreenReaderEnabled: mockStable(() => Promise.resolve(false)),
      addEventListener: mockStable(mockSubscription),
      announceForAccessibility: jest.fn(),
    },

    // Device information
    Dimensions: {
      get: mockStable(dimension => {
        const dimensions = {
          window: { width: 375, height: 812, scale: 2, fontScale: 1 },
          screen: { width: 375, height: 812, scale: 2, fontScale: 1 },
        };
        return dimensions[dimension] || dimensions.window;
      }),
      addEventListener: mockStable(mockSubscription),
      removeEventListener: jest.fn(),
    },

    // Theme detection
    useColorScheme: mockStable(() => 'light'),
    useWindowDimensions: mockStable(() => ({
      width: 375,
      height: 812,
      scale: 2,
      fontScale: 1,
    })),

    // Platform detection. `select` resolves as the real one does on iOS: the
    // `ios` key, then `native`, then `default`, so a falsy `ios` value is kept.
    Platform: {
      OS: 'ios',
      Version: '15.0',
      select: mockStable(obj =>
        'ios' in obj ? obj.ios : 'native' in obj ? obj.native : obj.default,
      ),
      isPad: false,
      isTesting: true,
    },

    // Dev-tooling: metaEvents.ts calls LogBox.ignoreLogs() at module load time
    // to suppress a known-safe native exception, so any test that transitively
    // imports it needs this to exist even without touching metaEvents directly.
    LogBox: {
      ignoreLogs: jest.fn(),
      ignoreAllLogs: jest.fn(),
    },

    // Styling
    StyleSheet: {
      create: mockStable(styles => styles),
      flatten: mockStable(mockFlattenStyle),
      absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
      hairlineWidth: 1,
    },

    Animated: {
      Value: mockStable(_value => ({
        setValue: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        interpolate: jest.fn(() => ({ interpolate: jest.fn() })),
      })),
      timing: mockStable(() => ({ start: jest.fn() })),
      spring: mockStable(() => ({ start: jest.fn() })),
      decay: mockStable(() => ({ start: jest.fn() })),
      sequence: mockStable(() => ({ start: jest.fn() })),
      parallel: mockStable(() => ({ start: jest.fn() })),
      stagger: mockStable(() => ({ start: jest.fn() })),
      loop: mockStable(() => ({ start: jest.fn() })),
      View: 'Animated.View',
      Text: 'Animated.Text',
      ScrollView: 'Animated.ScrollView',
      Image: 'Animated.Image',
      createAnimatedComponent: mockStable(component => component),
    },

    // Core components
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    Image: 'Image',
    TextInput: 'TextInput',
    Pressable: 'Pressable',
    // Was missing, so rendering any component in a loading state threw
    // "Element type is invalid ... got: undefined" instead of failing usefully.
    ActivityIndicator: 'ActivityIndicator',
    TouchableOpacity: 'TouchableOpacity',
    TouchableHighlight: 'TouchableHighlight',
    TouchableWithoutFeedback: 'TouchableWithoutFeedback',
    FlatList: 'FlatList',
    SectionList: 'SectionList',
    VirtualizedList: 'VirtualizedList',
    Modal: 'Modal',
    Switch: 'Switch',
    Button: 'Button',

    // User interaction. A recorder only, like the real dialog until someone
    // presses a button: a test presses one itself, through the buttons in
    // `Alert.alert.mock.calls`. (This used to "press" the first button, which
    // is usually Cancel; resetMocks had silently switched that off for every
    // test, and the suites are written against the recorder.)
    Alert: {
      alert: jest.fn(),
      prompt: jest.fn(),
    },

    // Keyboard
    Keyboard: {
      addListener: mockStable(mockSubscription),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn(),
    },

    // Layout measurement
    PixelRatio: {
      get: mockStable(() => 2),
      getFontScale: mockStable(() => 1),
      getPixelSizeForLayoutSize: mockStable(size => size * 2),
      // Snaps to the device-pixel grid of a 2x screen, as the real one does.
      roundToNearestPixel: mockStable(size => Math.round(size * 2) / 2),
    },

    // Status bar
    StatusBar: {
      setBarStyle: jest.fn(),
      setHidden: jest.fn(),
      currentHeight: 20,
    },

    // Vibration
    Vibration: {
      vibrate: jest.fn(),
      cancel: jest.fn(),
    },

    // Linking
    Linking: {
      openURL: mockStable(() => Promise.resolve(true)),
      canOpenURL: mockStable(() => Promise.resolve(true)),
      getInitialURL: mockStable(() => Promise.resolve(null)),
      addEventListener: mockStable(mockSubscription),
      removeEventListener: jest.fn(),
    },

    // BackHandler
    BackHandler: {
      addEventListener: mockStable(mockSubscription),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    },

    // Share
    Share: {
      share: mockStable(() => Promise.resolve({ action: 'sharedAction' })),
    },

    // Clipboard
    Clipboard: {
      getString: mockStable(() => Promise.resolve('')),
      setString: jest.fn(),
    },

    // PanResponder
    PanResponder: {
      create: mockStable(() => ({
        panHandlers: {},
      })),
    },
  };
});

// Supabase: a database with nothing in it. Every query resolves (a list to
// `[]`, a single row to `null`) and no session is signed in; a suite that needs
// rows mocks '@/services/supabase' itself. The client is created at import
// time, before the first reset, so its methods are mockStable; a query builder
// is made per `from()` call, so its methods can stay plain jest.fn()s.
jest.mock('@supabase/supabase-js', () => {
  const mockResult = data => ({ data, error: null });
  const mockQueryBuilder = () => {
    const builder = {};
    for (const name of [
      'select',
      'insert',
      'upsert',
      'update',
      'delete',
      'eq',
      'neq',
      'gt',
      'lt',
      'gte',
      'lte',
      'like',
      'ilike',
      'is',
      'in',
      'contains',
      'containedBy',
      'rangeGt',
      'rangeGte',
      'rangeLt',
      'rangeLte',
      'rangeAdjacent',
      'overlaps',
      'textSearch',
      'match',
      'not',
      'or',
      'filter',
      'order',
      'limit',
      'range',
      'abortSignal',
    ]) {
      builder[name] = jest.fn(() => builder);
    }
    builder.single = jest.fn(() => Promise.resolve(mockResult(null)));
    builder.maybeSingle = jest.fn(() => Promise.resolve(mockResult(null)));
    // A real thenable: `await supabase.from(...).select()` settles.
    builder.then = jest.fn((onFulfilled, onRejected) =>
      Promise.resolve(mockResult([])).then(onFulfilled, onRejected),
    );
    return builder;
  };
  return {
    createClient: mockStable(() => ({
      auth: {
        getUser: mockStable(() => Promise.resolve(mockResult({ user: null }))),
        getSession: mockStable(() => Promise.resolve(mockResult({ session: null }))),
        signInWithPassword: mockStable(() => Promise.resolve(mockResult({ user: null }))),
        signUp: mockStable(() => Promise.resolve(mockResult({ user: null }))),
        signOut: mockStable(() => Promise.resolve({ error: null })),
        onAuthStateChange: mockStable(() => ({
          data: { subscription: { unsubscribe: jest.fn() } },
        })),
      },
      from: mockStable(mockQueryBuilder),
      rpc: mockStable(() => Promise.resolve(mockResult(null))),
      storage: {
        from: mockStable(() => ({
          upload: jest.fn(() => Promise.resolve(mockResult(null))),
          download: jest.fn(() => Promise.resolve(mockResult(null))),
          remove: jest.fn(() => Promise.resolve(mockResult(null))),
          list: jest.fn(() => Promise.resolve(mockResult([]))),
          getPublicUrl: jest.fn(() => ({
            data: { publicUrl: 'https://example.com/file.jpg' },
          })),
        })),
      },
    })),
  };
});

// Mock redux-persist to prevent AsyncStorage issues
jest.mock('redux-persist', () => {
  const actual = jest.requireActual('redux-persist');
  return {
    ...actual,
    // Called when the store module loads, before the first reset.
    persistStore: mockStable(() => ({
      dispatch: jest.fn(),
      subscribe: mockStable(() => () => {}),
      getState: mockStable(() => ({})),
      replaceReducer: jest.fn(),
      purge: mockStable(() => Promise.resolve()),
      flush: mockStable(() => Promise.resolve()),
      pause: jest.fn(),
      persist: jest.fn(),
    })),
    persistReducer: mockStable((config, reducer) => reducer),
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
global.fetch = mockStable(async (url, _options = {}) => {
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

// No Intl stand-in: the real one is there, and `toLocaleDateString` and
// friends never read the global binding anyway.

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
  mockStable(source => {
    if (!source) return null;
    return {
      uri: typeof source === 'string' ? source : 'test-file-stub',
      width: 100,
      height: 100,
      scale: 1,
    };
  }),
);

// expo-haptics is mocked globally for every suite through jest.config.js
// `moduleNameMapper` → __mocks__/expo-haptics.js, whose promise-returning
// implementations are mockStable: utils/haptics chains .catch() on them to
// swallow "A haptics engine is not available on this device" (the top
// production error). A suite that adds its own `jest.mock('expo-haptics', …)`
// shadows that with a second mock object, so production code chaining .catch()
// breaks unless the local factory returns promises too.
//
// The same trap applies to `jest.mock('@/utils/haptics', …)`: that module
// replaces the real one wholesale, so ANY export omitted from the factory is
// `undefined` at the call site rather than a no-op, and the component under
// test dies with "is not a function".

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', reason => {
  // Handle unhandled promise rejections silently in tests
  throw new Error(`Unhandled promise rejection: ${reason}`);
});
