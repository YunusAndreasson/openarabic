/* global jest */

// Mock for react-native-gesture-handler
const gestureHandlerMock = {
  GestureHandlerRootView: ({ children }) => children,
  GestureDetector: ({ children }) => children,
  Gesture: {
    Pan: () => ({
      onUpdate: jest.fn(() => ({
        onEnd: jest.fn(),
      })),
      onEnd: jest.fn(),
      runOnJS: jest.fn(fn => fn),
      enabled: jest.fn(() => ({
        onUpdate: jest.fn(() => ({
          onEnd: jest.fn(),
        })),
        onEnd: jest.fn(),
      })),
      activateAfterLongPress: jest.fn(() => ({
        minDistance: jest.fn(() => ({
          onUpdate: jest.fn(),
          onEnd: jest.fn(),
        })),
      })),
    }),
    Tap: () => ({
      onEnd: jest.fn(),
      maxDuration: jest.fn(() => ({
        onEnd: jest.fn(),
      })),
    }),
    LongPress: () => ({
      onEnd: jest.fn(),
      minDuration: jest.fn(() => ({
        onEnd: jest.fn(),
      })),
    }),
  },
  State: {
    ACTIVE: 'ACTIVE',
    END: 'END',
  },
};

module.exports = gestureHandlerMock;
