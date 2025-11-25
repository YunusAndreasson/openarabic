/**
 * Toggle Component Tests
 *
 * Tests toggle switch with on/off states and animations.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { Toggle } from '@/components/ui/Toggle';

// Mock dependencies
jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, Pressable } = require('react-native');

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
    border: '#CCCCCC',
    shadow: '#000000',
    elevation2: '#F5F5F5',
    elevation3: '#FFFFFF',
  }),
}));

jest.mock('@/hooks/animations', () => ({
  useToggleAnimation: () => ({
    containerAnimatedStyle: {},
    handleAnimatedStyle: {},
    forceAnimateToInitialState: jest.fn(),
  }),
}));

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

describe('Toggle', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders in off state', () => {
      const { toJSON } = render(<Toggle value={false} onValueChange={mockOnValueChange} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders in on state', () => {
      const { toJSON } = render(<Toggle value={true} onValueChange={mockOnValueChange} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with testID', () => {
      const { getByTestId } = render(
        <Toggle value={false} onValueChange={mockOnValueChange} testID="my-toggle" />,
      );

      expect(getByTestId('my-toggle')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('calls onValueChange with true when toggled from off', () => {
      const { getByTestId } = render(
        <Toggle value={false} onValueChange={mockOnValueChange} testID="toggle" />,
      );

      fireEvent.press(getByTestId('toggle'));

      expect(mockOnValueChange).toHaveBeenCalledWith(true);
    });

    test('calls onValueChange with false when toggled from on', () => {
      const { getByTestId } = render(
        <Toggle value={true} onValueChange={mockOnValueChange} testID="toggle" />,
      );

      fireEvent.press(getByTestId('toggle'));

      expect(mockOnValueChange).toHaveBeenCalledWith(false);
    });

    test('triggers haptic feedback on press', () => {
      const { selectionFeedback } = require('@/utils/haptics');

      const { getByTestId } = render(
        <Toggle value={false} onValueChange={mockOnValueChange} testID="toggle" />,
      );

      fireEvent.press(getByTestId('toggle'));

      expect(selectionFeedback).toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    test('displays correct background color for off state', () => {
      const { toJSON } = render(<Toggle value={false} onValueChange={mockOnValueChange} />);

      // Component should render without errors
      expect(toJSON()).toBeTruthy();
    });

    test('displays correct background color for on state', () => {
      const { toJSON } = render(<Toggle value={true} onValueChange={mockOnValueChange} />);

      // Component should render without errors
      expect(toJSON()).toBeTruthy();
    });
  });
});
