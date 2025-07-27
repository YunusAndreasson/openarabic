const React = require('react');
const { View } = require('react-native');

function createChainableMock() {
  const chain = {};
  chain.springify = () => () => chain;
  chain.delay = () => chain;
  return chain;
}

function duration() {
  return createChainableMock();
}

module.exports = {
  __esModule: true,
  default: {
    View: props => React.createElement(View, props),
  },
  ZoomIn: { duration },
  ZoomOut: { duration },
  Easing: {
    out: () => ({}),
    quad: {},
    cubic: {},
    bezier: () => ({}),
  },
  useSharedValue: initialValue => ({ value: initialValue }),
  useAnimatedStyle: () => ({}),
  withSpring: value => value,
  withTiming: value => value,
  runOnJS: fn => fn,
};
