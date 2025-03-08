/* global jest */

// Mock implementation for react-native-reanimated
const Reanimated = {
  // Core components
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  ScrollView: 'ScrollView',

  // Animations
  FadeIn: {
    duration: jest.fn(() => ({
      delay: jest.fn(() => 'FadeIn'),
    })),
  },
  FadeOut: {
    duration: jest.fn(() => 'FadeOut'),
  },
  Layout: {
    duration: jest.fn(() => 'Layout'),
  },
  SlideInRight: {
    duration: jest.fn(() => ({
      delay: jest.fn(() => 'SlideInRight'),
    })),
  },

  // Core functionalities
  useSharedValue: jest.fn(initial => ({ value: initial })),
  useAnimatedStyle: jest.fn(() => ({})),
  useAnimatedGestureHandler: jest.fn(() => ({})),
  useAnimatedReaction: jest.fn(),
  useDerivedValue: jest.fn(fn => ({ value: fn() })),
  useAnimatedRef: jest.fn(() => ({ current: null })),
  useAnimatedScrollHandler: jest.fn(() => jest.fn()),

  // Animation functions
  withTiming: jest.fn((toValue, config) => toValue),
  withSpring: jest.fn((toValue, config) => toValue),
  withDelay: jest.fn((delay, animation) => animation),
  withSequence: jest.fn((...animations) => animations[animations.length - 1]),
  withRepeat: jest.fn((animation, times) => animation),

  // Utility functions
  runOnJS: jest.fn(fn => fn),
  runOnUI: jest.fn(fn => fn),
  interpolate: jest.fn(() => 0),
  Easing: {
    linear: 'linear',
    ease: 'ease',
    bounce: 'bounce',
    bezier: jest.fn(() => 'bezier'),
  },

  // Required for worklets
  createAnimatedComponent: jest.fn(component => component),
};

// Add proper exports for CommonJS
module.exports = {
  ...Reanimated,
  __esModule: true,
  default: Reanimated,
};
