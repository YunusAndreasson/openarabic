/**
 * ReviewBottomActions Component Tests
 *
 * Tests review action buttons (Don't Know, Hint, Know).
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
    warning: '#FF9800',
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

describe('ReviewBottomActions', () => {
  const mockOnVague = jest.fn();
  const mockOnShowContextualHelp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders three action indicators', () => {
      const { getByText } = render(<ReviewBottomActions />);

      expect(getByText("Don't Know")).toBeTruthy();
      expect(getByText('Hint')).toBeTruthy();
      expect(getByText('Know')).toBeTruthy();
    });

    test('renders chevron icons for left and right actions', () => {
      const { getByTestId } = render(<ReviewBottomActions />);

      expect(getByTestId('icon-chevron-back')).toBeTruthy();
      expect(getByTestId('icon-chevron-forward')).toBeTruthy();
    });

    test('renders fingerprint icon for hint action', () => {
      const { getByTestId } = render(<ReviewBottomActions />);

      expect(getByTestId('icon-finger-print')).toBeTruthy();
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

  describe('Center Button (Hint)', () => {
    test('calls onShowContextualHelp when pressed if available', () => {
      const { getByText } = render(
        <ReviewBottomActions
          onVague={mockOnVague}
          onShowContextualHelp={mockOnShowContextualHelp}
        />,
      );

      fireEvent.press(getByText('Hint'));

      expect(mockOnShowContextualHelp).toHaveBeenCalledTimes(1);
      expect(mockOnVague).not.toHaveBeenCalled();
    });

    test('calls onVague when pressed if onShowContextualHelp not provided', () => {
      const { getByText } = render(<ReviewBottomActions onVague={mockOnVague} />);

      fireEvent.press(getByText('Hint'));

      expect(mockOnVague).toHaveBeenCalledTimes(1);
    });

    test('does not trigger haptic feedback when pressed', () => {
      const { getByText } = render(<ReviewBottomActions onVague={mockOnVague} />);

      fireEvent.press(getByText('Hint'));

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
      expect(getByText('Hint')).toBeTruthy();
      expect(getByText('Know')).toBeTruthy();
    });

    test('pressing buttons without handlers does not throw', () => {
      const { getByText } = render(<ReviewBottomActions />);

      // Should not throw
      fireEvent.press(getByText("Don't Know"));
      fireEvent.press(getByText('Hint'));
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
