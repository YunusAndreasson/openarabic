const React = require('react');
const { View, Pressable } = require('react-native');

function createChainableMock() {
  const chain = {};
  chain.springify = () => chain;
  chain.delay = () => chain;
  chain.duration = () => chain;
  return chain;
}

function duration() {
  return createChainableMock();
}

// Create Animated.View as a React component
const AnimatedView = React.forwardRef((props, ref) => {
  return React.createElement(View, { ...props, ref });
});
AnimatedView.displayName = 'Animated.View';

// Create Animated.Pressable as a React component
const AnimatedPressable = React.forwardRef((props, ref) => {
  return React.createElement(Pressable, { ...props, ref });
});
AnimatedPressable.displayName = 'Animated.Pressable';

const Animated = {
  View: AnimatedView,
  Pressable: AnimatedPressable,
  createAnimatedComponent: Component =>
    React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref })),
};

module.exports = {
  __esModule: true,
  default: Animated,
  ZoomIn: { duration },
  ZoomOut: { duration },
  SlideInRight: { duration },
  SlideInLeft: { duration },
  SlideOutRight: { duration },
  SlideOutLeft: { duration },
  FadeInUp: { duration },
  FadeOutDown: { duration },
  Easing: {
    out: () => ({}),
    quad: {},
    cubic: {},
    bezier: () => ({}),
  },
  useSharedValue: initialValue => {
    const sv = {
      value: initialValue,
      get() {
        return this.value;
      },
      set(next) {
        this.value = typeof next === 'function' ? next(this.value) : next;
      },
    };
    return sv;
  },
  useAnimatedStyle: () => ({}),
  withSpring: value => value,
  withTiming: value => value,
  runOnJS: fn => fn,
  cubicBezier: () => 'linear',
};
