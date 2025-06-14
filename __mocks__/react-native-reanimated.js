module.exports = {
  default: {
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    createAnimatedComponent: component => component,
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
};
