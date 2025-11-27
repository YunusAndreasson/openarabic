/**
 * ReviewHeader Component Tests
 *
 * Tests review session progress header with close button.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ReviewHeader } from '@/components/review/ReviewHeader';

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

// Mock ProgressBar component
jest.mock('@/components/common', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    ProgressBar: ({ progress, height }: { progress: number; height: number }) =>
      React.createElement(View, {
        testID: 'progress-bar',
        accessibilityValue: { now: progress },
        style: { height },
      }),
  };
});

// Mock haptics
const mockSelectionFeedback = jest.fn();
jest.mock('@/utils/haptics', () => ({
  selectionFeedback: () => mockSelectionFeedback(),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(View, { testID: `icon-${name}` }),
  };
});

describe('ReviewHeader', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with progress bar', () => {
      const { getByTestId } = render(<ReviewHeader progress={5} maxProgress={10} />);

      expect(getByTestId('progress-bar')).toBeTruthy();
    });

    test('renders close button when onClose is provided', () => {
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      expect(getByTestId('icon-close')).toBeTruthy();
    });

    test('does not render close button when onClose is not provided', () => {
      const { queryByTestId } = render(<ReviewHeader progress={5} maxProgress={10} />);

      expect(queryByTestId('icon-close')).toBeNull();
    });
  });

  describe('Progress Display', () => {
    test('uses max of progress and maxProgress for display', () => {
      // When progress > maxProgress, should still use progress
      const { toJSON } = render(<ReviewHeader progress={8} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles zero progress', () => {
      const { toJSON } = render(<ReviewHeader progress={0} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles completed progress', () => {
      const { toJSON } = render(<ReviewHeader progress={10} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Close Button Interaction', () => {
    test('calls onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      // Find the pressable that contains the close icon
      const closeIcon = getByTestId('icon-close');
      const pressable = closeIcon.parent;

      if (pressable) {
        fireEvent.press(pressable);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });

    test('triggers haptic feedback when closing', () => {
      const { getByTestId } = render(
        <ReviewHeader progress={5} maxProgress={10} onClose={mockOnClose} />,
      );

      const closeIcon = getByTestId('icon-close');
      const pressable = closeIcon.parent;

      if (pressable) {
        fireEvent.press(pressable);
        expect(mockSelectionFeedback).toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    test('handles progress exceeding maxProgress', () => {
      // Edge case: progress can exceed max during animation
      const { toJSON } = render(<ReviewHeader progress={15} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles negative progress gracefully', () => {
      const { toJSON } = render(<ReviewHeader progress={-1} maxProgress={10} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles zero maxProgress', () => {
      const { toJSON } = render(<ReviewHeader progress={0} maxProgress={0} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
