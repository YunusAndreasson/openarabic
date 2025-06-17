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
  useSharedValue: () => ({ value: 0 }),
  useAnimatedStyle: () => ({}),
  withTiming: value => value,
  withSpring: value => value,
  runOnJS: () => {},
  FadeIn: { duration: () => ({ delay: () => ({}) }) },
  FadeOut: { duration: () => ({ delay: () => ({}) }) },
  SlideInRight: { duration: () => ({ delay: () => ({}) }) },
  Layout: { duration: () => ({}) },
  Easing,
};
