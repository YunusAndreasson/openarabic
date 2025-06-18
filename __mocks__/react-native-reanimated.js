const Easing = {
  out: fn => fn || (() => {}),
  quad: () => {},
  cubic: () => {},
  elastic: () => {},
  bezier: () => () => {},
  in: fn => fn || (() => {}),
  inOut: fn => fn || (() => {}),
};

module.exports = {
  __esModule: true,
  default: {
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    createAnimatedComponent: component => component,
    Easing,
  },
  useSharedValue: (initialValue = 0) => ({ value: initialValue }),
  useAnimatedStyle: styleCallback => ({}),
  withTiming: value => value,
  withSpring: value => value,
  interpolate: (value, inputRange, outputRange, extrapolate) => {
    // Simple linear interpolation for testing
    if (Array.isArray(inputRange) && Array.isArray(outputRange)) {
      return outputRange[0];
    }
    return value;
  },
  runOnUI: callback => callback,
  runOnJS: callback => callback,
  FadeIn: { duration: () => ({ delay: () => ({}) }) },
  FadeOut: { duration: () => ({ delay: () => ({}) }) },
  SlideInRight: { duration: () => ({ delay: () => ({}) }) },
  Layout: { duration: () => ({}) },
  Easing,
};
