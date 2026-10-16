function createChain() {
  const chain = { _config: {}, _handlers: {} };

  for (const name of [
    'onBegin',
    'onStart',
    'onUpdate',
    'onChange',
    'onEnd',
    'onTouchesDown',
    'onTouchesUp',
    'onFinalize',
  ]) {
    chain[name] = callback => {
      chain._handlers[name] = callback;
      return chain;
    };
  }

  for (const name of ['enabled', 'minDistance', 'activeOffsetX', 'failOffsetY', 'withTestId']) {
    chain[name] = value => {
      chain._config[name] = value;
      return chain;
    };
  }

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
  // Hook API (Gesture Handler 3): a plain function, not a jest.fn, so
  // `resetMocks` cannot strip it. Tests reach the callbacks through `_config`.
  useTapGesture: config => ({ _config: config ?? {} }),
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
