module.exports = {
  GestureHandlerRootView: 'GestureHandlerRootView',
  PanGestureHandler: 'PanGestureHandler',
  TapGestureHandler: 'TapGestureHandler',
  Gesture: {
    Pan: () => ({ onUpdate: () => ({}), onEnd: () => ({}) }),
    Tap: () => ({ onStart: () => ({}), onEnd: () => ({}) }),
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
