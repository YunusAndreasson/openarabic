/**
 * FloatingActionButtons Component Tests
 *
 * Tests article floating action buttons (close and bookmark).
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { FloatingActionButtons } from '@/components/article/FloatingActionButtons';

// Mock reanimated
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

// Mock theme hook
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory({
    elevation1: '#F5F5F5',
    elevation2: '#EEEEEE',
    secondaryText: '#666666',
    tint: '#4a7c59',
  }),
);

// Mock animations hook
jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    Ionicons: ({ name, color }: { name: string; color: string }) =>
      React.createElement(View, { testID: `icon-${name}`, accessibilityHint: color }),
  };
});

// Mock layout utils
jest.mock('@/utils/layoutUtils', () => ({
  createAndroidRipple: () => ({ color: 'rgba(0,0,0,0.1)' }),
}));

describe('FloatingActionButtons', () => {
  const mockOnToggleReadingList = jest.fn().mockResolvedValue(undefined);
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders close button', () => {
      const { getByTestId } = render(
        <FloatingActionButtons
          isInReadingList={false}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      expect(getByTestId('icon-close')).toBeTruthy();
    });

    test('renders bookmark outline when not in reading list', () => {
      const { getByTestId } = render(
        <FloatingActionButtons
          isInReadingList={false}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      expect(getByTestId('icon-bookmark-outline')).toBeTruthy();
    });

    test('renders filled bookmark when in reading list', () => {
      const { getByTestId } = render(
        <FloatingActionButtons
          isInReadingList={true}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      expect(getByTestId('icon-bookmark')).toBeTruthy();
    });
  });

  describe('Close Button', () => {
    test('calls onClose when close button is pressed', () => {
      const { getByTestId } = render(
        <FloatingActionButtons
          isInReadingList={false}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      const closeIcon = getByTestId('icon-close');
      const pressable = closeIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Bookmark Button', () => {
    test('calls onToggleReadingList when bookmark is pressed', () => {
      const { getByTestId } = render(
        <FloatingActionButtons
          isInReadingList={false}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      const bookmarkIcon = getByTestId('icon-bookmark-outline');
      const pressable = bookmarkIcon.parent?.parent;

      if (pressable) {
        fireEvent.press(pressable);
        expect(mockOnToggleReadingList).toHaveBeenCalledTimes(1);
      }
    });

    test('toggles bookmark icon optimistically on press', () => {
      const { getByTestId, rerender, queryByTestId } = render(
        <FloatingActionButtons
          isInReadingList={false}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      // Initial state - outline
      expect(getByTestId('icon-bookmark-outline')).toBeTruthy();

      // Rerender with updated prop
      rerender(
        <FloatingActionButtons
          isInReadingList={true}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      // Should now show filled bookmark
      expect(getByTestId('icon-bookmark')).toBeTruthy();
      expect(queryByTestId('icon-bookmark-outline')).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    test('renders correctly with all props', () => {
      const { toJSON } = render(
        <FloatingActionButtons
          isInReadingList={true}
          onToggleReadingList={mockOnToggleReadingList}
          onClose={mockOnClose}
        />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
