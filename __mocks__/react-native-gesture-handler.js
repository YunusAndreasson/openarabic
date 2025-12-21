function createChain() {
  const chain = {};
  chain.onBegin = () => chain;
  chain.onStart = () => chain;
  chain.onUpdate = () => chain;
  chain.onChange = () => chain;
  chain.onEnd = () => chain;
  chain.onTouchesDown = () => chain;
  chain.onTouchesUp = () => chain;
  chain.onFinalize = () => chain;
  chain.withTestId = () => chain;
  return chain;
}

// Re-export Pressable from react-native for tests
const { Pressable } = require('react-native');

module.exports = {
  Pressable,
  GestureHandlerRootView: 'GestureHandlerRootView',
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  Gesture: {
    Pan: () => createChain(),
    Tap: () => createChain(),
  },
  GestureDetector: ({ children }) => children,
  State: {
    BEGAN: 'BEGAN',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
    ACTIVE: 'ACTIVE',
    END: 'END',
  },
  gestureHandlerRootHOC: component => component,
};
