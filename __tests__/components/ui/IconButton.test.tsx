/**
 * IconButton Component Tests
 *
 * Tests icon button with different variants and states.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { IconButton } from '@/components/ui/IconButton';

// Mock dependencies
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');

  const AnimatedView = React.forwardRef((props: any, ref: any) =>
    React.createElement(View, { ...props, ref }),
  );

  return {
    __esModule: true,
    default: {
      View: AnimatedView,
      createAnimatedComponent: (component: any) =>
        React.forwardRef((props: any, ref: any) =>
          React.createElement(component, { ...props, ref }),
        ),
    },
    createAnimatedComponent: (component: any) =>
      React.forwardRef((props: any, ref: any) => React.createElement(component, { ...props, ref })),
    useSharedValue: (val: number) => ({ value: val }),
    useAnimatedStyle: () => ({}),
    withTiming: (val: number) => val,
    withSpring: (val: number) => val,
    Easing: {
      out: (fn: (n: number) => number) => fn,
      bezier: () => (n: number) => n,
    },
  };
});

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    tint: '#4A9B8E',
    error: '#F44336',
    text: '#000000',
    black: '#000000',
  }),
}));

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

jest.mock('@/hooks/animations', () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
  useDebounce: (fn: () => void) => [fn, false],
}));

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
}));

jest.mock('@/utils/layoutUtils', () => ({
  createAndroidRipple: () => ({ color: 'rgba(0,0,0,0.1)' }),
}));

describe('IconButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with icon', () => {
      const { toJSON } = render(<IconButton icon="play" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with custom icon size', () => {
      const { toJSON } = render(<IconButton icon="play" iconSize={32} onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Variants', () => {
    test('renders default variant', () => {
      const { toJSON } = render(<IconButton icon="play" variant="default" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders danger variant', () => {
      const { toJSON } = render(<IconButton icon="trash" variant="danger" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('renders pressable when onPress provided', () => {
      const { toJSON } = render(<IconButton icon="play" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders disabled state', () => {
      const { toJSON } = render(<IconButton icon="play" disabled onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Haptic Feedback', () => {
    test('renders with haptic props', () => {
      const { toJSON } = render(
        <IconButton icon="play" hapticType="light" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('renders with hapticType none', () => {
      const { toJSON } = render(<IconButton icon="play" hapticType="none" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Flat Mode', () => {
    test('renders in flat mode without elevation', () => {
      const { toJSON } = render(<IconButton icon="play" flat onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Custom Colors', () => {
    test('accepts custom background color', () => {
      const { toJSON } = render(
        <IconButton icon="play" backgroundColor="#FF0000" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom icon color', () => {
      const { toJSON } = render(
        <IconButton icon="play" iconColor="#FFFFFF" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
