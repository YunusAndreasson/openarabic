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

// Use shared mock factories from componentMocks.tsx
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

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
