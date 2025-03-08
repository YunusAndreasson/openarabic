import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

// Mock for React Native Skia
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Path: 'Path',
  Line: 'Line',
  Circle: 'Circle',
  Group: 'Group',
  BlurMask: 'BlurMask',
  LinearGradient: 'LinearGradient',
  vec: jest.fn((x, y) => ({ x, y })),
  Skia: {
    Path: {
      Make: () => ({}),
    },
  },
}));

// Mock for React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = jest.requireActual('react-native-reanimated/mock');
  Reanimated.FadeIn = { duration: jest.fn(() => ({ delay: jest.fn() })) };
  Reanimated.FadeOut = { duration: jest.fn() };
  return Reanimated;
});

// Mock for React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: 'GestureHandlerRootView',
  GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  Gesture: {
    Pan: () => ({
      activateAfterLongPress: () => ({
        minDistance: () => ({
          onUpdate: () => {},
          onEnd: () => {},
        }),
      }),
    }),
  },
}));

// Mock for Redux store
jest.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => children,
  useSelector: jest.fn(),
  useDispatch: jest.fn(() => jest.fn()),
}));

// A simple component that wouldn't be affected by the imports
const TestComponent = () => (
  <View testID="test-component">
    <Text>Test Component</Text>
  </View>
);

describe('Mocking Setup', () => {
  it('should render a component without errors', () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId('test-component')).toBeTruthy();
  });
});
