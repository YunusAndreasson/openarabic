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
import { View } from 'react-native';

import { Toggle } from '@/components/ui/Toggle';

// Use shared mock factories from componentMocks.tsx
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

describe('Toggle', () => {
  const mockOnValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('exposes its label and checked state to accessibility services', () => {
      const { getByLabelText, rerender } = render(
        <Toggle
          accessibilityLabel="Smart reminders"
          value={false}
          onValueChange={mockOnValueChange}
        />,
      );

      expect(getByLabelText('Smart reminders').props.accessibilityState).toEqual({
        checked: false,
      });

      rerender(
        <Toggle
          accessibilityLabel="Smart reminders"
          value={true}
          onValueChange={mockOnValueChange}
        />,
      );
      expect(getByLabelText('Smart reminders').props.accessibilityState).toEqual({ checked: true });
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
    test('switches the track and handle to their on-state colors', () => {
      const { UNSAFE_getAllByType, rerender } = render(
        <Toggle value={false} onValueChange={mockOnValueChange} />,
      );
      const backgroundColors = () =>
        UNSAFE_getAllByType(View).map(view => {
          const styles = Array.isArray(view.props.style)
            ? view.props.style.flat(Number.POSITIVE_INFINITY)
            : [view.props.style];
          return Object.assign({}, ...styles.filter(Boolean)).backgroundColor;
        });

      expect(backgroundColors()).toEqual(expect.arrayContaining(['#DDDDDD', '#EEEEEE']));

      rerender(<Toggle value={true} onValueChange={mockOnValueChange} />);

      expect(backgroundColors()).toEqual(expect.arrayContaining(['#4a7c59', '#FFFFFF']));
    });
  });
});
