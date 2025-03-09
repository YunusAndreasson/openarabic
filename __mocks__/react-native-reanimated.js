/* global jest */

const mockWithTiming = (toValue, config, callback) => {
  if (callback) {
    callback(true);
  }
  return toValue;
};

const mockWithSpring = (toValue, config, callback) => {
  if (callback) {
    callback(true);
  }
  return toValue;
};

const mockWithDelay = (delay, animation) => animation;

const mockUseSharedValue = initialValue => ({
  value: initialValue,
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

const mockUseAnimatedStyle = styleCallback => {
  return styleCallback();
};

const mockRunOnJS =
  fn =>
  (...args) =>
    fn(...args);

const mockUseAnimatedGestureHandler = handlers => handlers;

const mockScrollTo = jest.fn();

const mockWithSequence = (...animations) => animations[animations.length - 1];

const mockWithRepeat = (animation, config) => animation;

module.exports = {
  useSharedValue: mockUseSharedValue,
  useAnimatedStyle: mockUseAnimatedStyle,
  useDerivedValue: callback => mockUseSharedValue(callback()),
  useAnimatedScrollHandler: handlers => handlers,
  useAnimatedGestureHandler: mockUseAnimatedGestureHandler,
  useAnimatedReaction: jest.fn(),
  useAnimatedRef: () => ({
    current: {
      scrollTo: mockScrollTo,
      measure: jest.fn().mockReturnValue({ width: 100, height: 100, x: 0, y: 0 }),
    },
  }),
  withTiming: mockWithTiming,
  withSpring: mockWithSpring,
  withDelay: mockWithDelay,
  withSequence: mockWithSequence,
  withRepeat: mockWithRepeat,
  runOnJS: mockRunOnJS,
  Easing: {
    bezier: jest.fn().mockReturnValue(jest.fn()),
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
    sin: jest.fn(),
    circle: jest.fn(),
    exp: jest.fn(),
    in: jest.fn(),
    out: jest.fn(),
    inOut: jest.fn(),
  },
  Extrapolation: {
    CLAMP: 'clamp',
    EXTEND: 'extend',
    IDENTITY: 'identity',
  },
  FadeIn: {
    duration: jest.fn().mockReturnValue({
      delay: jest.fn().mockReturnValue({}),
    }),
  },
  FadeOut: {
    duration: jest.fn().mockReturnValue({
      delay: jest.fn().mockReturnValue({}),
    }),
  },
  SlideInRight: {
    duration: jest.fn().mockReturnValue({
      delay: jest.fn().mockReturnValue({}),
    }),
  },
  Layout: {
    duration: jest.fn().mockReturnValue({}),
    springify: jest.fn().mockReturnValue({}),
  },
  createAnimatedComponent: component => component,
  interpolate: jest.fn().mockImplementation((value, input, output) => output[0]),
  Animated: {
    View: 'View',
    Text: 'Text',
    Image: 'Image',
    ScrollView: 'ScrollView',
    FlatList: 'FlatList',
  },
};
