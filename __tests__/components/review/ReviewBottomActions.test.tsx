/**
 * ReviewBottomActions Component Tests
 *
 * Tests review action buttons (Don't Know, Know).
 * Note: Hint button was removed - hesitation detection replaces tap-to-reveal.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ReviewBottomActions } from '@/components/review/ReviewBottomActions';

// Mock themed text
jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  const React = require('react');
  return {
    ThemedText: ({ children, style }: { children: React.ReactNode; style?: object }) =>
      React.createElement(Text, { style }, children),
  };
});

// Mock theme hook
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory({
    error: '#F44336',
    success: '#4CAF50',
  }),
);

// Mock haptics
const mockLightFeedback = jest.fn();
jest.mock('@/utils/haptics', () => ({
  lightFeedback: () => mockLightFeedback(),
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(View, { testID: `icon-${name}` }),
  };
});

// Mock ReviewAction enum
jest.mock('@/types/enums', () => ({
  ReviewAction: {
    DONT_KNOW: "Don't Know",
    KNOW: 'Know',
  },
}));

// Mock tutorials constant
jest.mock('@/constants/tutorials', () => ({
  ContextualHelpType: {
    SWIPE_LEFT: 'swipe_left',
    SWIPE_RIGHT: 'swipe_right',
  },
}));

describe('ReviewBottomActions', () => {
  const mockOnShowContextualHelp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders two action indicators (left and right)', () => {
      const { getByText } = render(<ReviewBottomActions />);

      expect(getByText("Don't Know")).toBeTruthy();
      expect(getByText('Know')).toBeTruthy();
    });

    test('renders chevron icons for left and right actions', () => {
      const { getByTestId } = render(<ReviewBottomActions />);

      expect(getByTestId('icon-chevron-back')).toBeTruthy();
      expect(getByTestId('icon-chevron-forward')).toBeTruthy();
    });
  });

  describe("Left Indicator (Don't Know)", () => {
    test('calls onShowContextualHelp when pressed', () => {
      const { getByText } = render(
        <ReviewBottomActions onShowContextualHelp={mockOnShowContextualHelp} />,
      );

      fireEvent.press(getByText("Don't Know"));

      expect(mockOnShowContextualHelp).toHaveBeenCalledTimes(1);
    });

    test('does not trigger haptic feedback when pressed', () => {
      const { getByText } = render(
        <ReviewBottomActions onShowContextualHelp={mockOnShowContextualHelp} />,
      );

      fireEvent.press(getByText("Don't Know"));

      // Haptics removed for review interactions (2025 UX best practice)
      expect(mockLightFeedback).not.toHaveBeenCalled();
    });
  });

  describe('Right Indicator (Know)', () => {
    test('calls onShowContextualHelp when pressed', () => {
      const { getByText } = render(
        <ReviewBottomActions onShowContextualHelp={mockOnShowContextualHelp} />,
      );

      fireEvent.press(getByText('Know'));

      expect(mockOnShowContextualHelp).toHaveBeenCalledTimes(1);
    });

    test('does not trigger haptic feedback when pressed', () => {
      const { getByText } = render(
        <ReviewBottomActions onShowContextualHelp={mockOnShowContextualHelp} />,
      );

      fireEvent.press(getByText('Know'));

      // Haptics removed for review interactions (2025 UX best practice)
      expect(mockLightFeedback).not.toHaveBeenCalled();
    });
  });

  describe('No Handlers', () => {
    test('renders without handlers', () => {
      const { getByText } = render(<ReviewBottomActions />);

      // Should render without errors
      expect(getByText("Don't Know")).toBeTruthy();
      expect(getByText('Know')).toBeTruthy();
    });

    test('pressing buttons without handlers does not throw', () => {
      const { getByText } = render(<ReviewBottomActions />);

      // Should not throw
      fireEvent.press(getByText("Don't Know"));
      fireEvent.press(getByText('Know'));
    });
  });

  describe('Visual Elements', () => {
    test('renders with correct structure', () => {
      const { toJSON } = render(<ReviewBottomActions />);

      expect(toJSON()).toBeTruthy();
    });
  });
});
