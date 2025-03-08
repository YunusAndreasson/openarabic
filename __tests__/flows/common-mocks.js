/* global jest, describe, it, expect */

// Common mock implementations for tests
// Import this file in your test files before any other imports

// Mock expo-blur
jest.mock('expo-blur', () => ({
  BlurView: ({ children }) => children,
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: ({ style }) => null,
  setStatusBarHidden: jest.fn(),
  setStatusBarStyle: jest.fn(),
}));

// Mock expo-av
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
    mockSound, // Export for test assertions
  };
});

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }) => children,
}));

// Mock expo-image
jest.mock('expo-image', () => {
  const { Image } = require('react-native');
  return {
    Image,
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  FontAwesome: () => null,
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const RN = require('react-native');
  return {
    Gesture: {
      Pan: jest.fn().mockReturnValue({
        onStart: jest.fn().mockReturnThis(),
        onUpdate: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        onFinalize: jest.fn().mockReturnThis(),
        runOnJS: jest.fn().mockReturnThis(),
      }),
      Tap: jest.fn().mockReturnValue({
        onStart: jest.fn().mockReturnThis(),
        onEnd: jest.fn().mockReturnThis(),
        runOnJS: jest.fn().mockReturnThis(),
      }),
    },
    GestureDetector: ({ children }) => children,
    GestureHandlerRootView: ({ children }) => children,
    PanGestureHandler: RN.View,
    TapGestureHandler: RN.View,
    ScrollView: RN.ScrollView,
    Swipeable: RN.View,
    DrawerLayout: RN.View,
    State: {
      BEGAN: 'BEGAN',
      ACTIVE: 'ACTIVE',
      END: 'END',
    },
  };
});

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Animated = require('react-native').Animated;
  return {
    ...Animated,
    useSharedValue: jest.fn().mockReturnValue(0),
    useAnimatedStyle: jest.fn().mockReturnValue({}),
    useAnimatedScrollHandler: jest.fn().mockReturnValue({}),
    useDerivedValue: jest.fn().mockReturnValue(0),
    useAnimatedRef: jest.fn().mockReturnValue({}),
    useAnimatedGestureHandler: jest.fn().mockReturnValue({}),
    useAnimatedReaction: jest.fn(),
    FadeIn: jest.fn().mockReturnValue({}),
    FadeOut: jest.fn().mockReturnValue({}),
    FadeInDown: jest.fn().mockReturnValue({}),
    SlideInRight: jest.fn().mockReturnValue({}),
    withTiming: jest.fn().mockImplementation(toValue => toValue),
    withSpring: jest.fn().mockImplementation(toValue => toValue),
    withDelay: jest.fn().mockImplementation((_, animation) => animation),
    withSequence: jest
      .fn()
      .mockImplementation((...animations) => animations[animations.length - 1]),
    withRepeat: jest.fn().mockImplementation(animation => animation),
    runOnJS: jest.fn().mockImplementation(fn => fn),
    default: {
      createAnimatedComponent: component => component,
    },
  };
});

// Add a dummy test so Jest doesn't complain about no tests in this file
describe('Mocks', () => {
  it('initializes correctly', () => {
    expect(true).toBe(true);
  });
});
