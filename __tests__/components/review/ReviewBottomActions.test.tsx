/**
 * ReviewBottomActions Component Tests
 *
 * Tests the full-width action buttons that mirror the swipe gestures.
 * Tap = submit answer (haptic feedback). Long-press = surface contextual help.
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

// Mock haptics — capture the actual functions invoked by the component
const mockLightFeedback = jest.fn();
const mockSelectionFeedback = jest.fn();
jest.mock('@/utils/haptics', () => ({
  lightFeedback: () => mockLightFeedback(),
  selectionFeedback: () => mockSelectionFeedback(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  errorFeedback: jest.fn(),
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
  const mockOnPressLeft = jest.fn();
  const mockOnPressRight = jest.fn();
  const mockOnShowContextualHelp = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders two labeled action buttons', () => {
      const { getByText } = render(<ReviewBottomActions />);

      expect(getByText("Don't Know")).toBeTruthy();
      expect(getByText('Know')).toBeTruthy();
    });

    test('renders close and checkmark icons for the action buttons', () => {
      const { getByTestId } = render(<ReviewBottomActions />);

      expect(getByTestId('icon-close')).toBeTruthy();
      expect(getByTestId('icon-checkmark')).toBeTruthy();
    });
  });

  describe("Left button (Don't Know)", () => {
    test('calls onPressLeft when pressed', () => {
      const { getByText } = render(<ReviewBottomActions onPressLeft={mockOnPressLeft} />);

      fireEvent.press(getByText("Don't Know"));

      expect(mockOnPressLeft).toHaveBeenCalledTimes(1);
    });

    test('triggers light haptic feedback on press', () => {
      const { getByText } = render(<ReviewBottomActions onPressLeft={mockOnPressLeft} />);

      fireEvent.press(getByText("Don't Know"));

      expect(mockLightFeedback).toHaveBeenCalledTimes(1);
    });

    test('long-press surfaces SWIPE_LEFT contextual help', () => {
      const { getByText } = render(
        <ReviewBottomActions onShowContextualHelp={mockOnShowContextualHelp} />,
      );

      fireEvent(getByText("Don't Know"), 'longPress');

      expect(mockOnShowContextualHelp).toHaveBeenCalledWith('swipe_left');
    });
  });

  describe('Right button (Know)', () => {
    test('calls onPressRight when pressed', () => {
      const { getByText } = render(<ReviewBottomActions onPressRight={mockOnPressRight} />);

      fireEvent.press(getByText('Know'));

      expect(mockOnPressRight).toHaveBeenCalledTimes(1);
    });

    test('triggers selection haptic feedback on press', () => {
      const { getByText } = render(<ReviewBottomActions onPressRight={mockOnPressRight} />);

      fireEvent.press(getByText('Know'));

      expect(mockSelectionFeedback).toHaveBeenCalledTimes(1);
    });

    test('long-press surfaces SWIPE_RIGHT contextual help', () => {
      const { getByText } = render(
        <ReviewBottomActions onShowContextualHelp={mockOnShowContextualHelp} />,
      );

      fireEvent(getByText('Know'), 'longPress');

      expect(mockOnShowContextualHelp).toHaveBeenCalledWith('swipe_right');
    });
  });

  describe('Disabled state', () => {
    test('does not call onPressLeft when disabled', () => {
      const { getByText } = render(<ReviewBottomActions onPressLeft={mockOnPressLeft} disabled />);

      fireEvent.press(getByText("Don't Know"));

      expect(mockOnPressLeft).not.toHaveBeenCalled();
    });

    test('does not call onPressRight when disabled', () => {
      const { getByText } = render(
        <ReviewBottomActions onPressRight={mockOnPressRight} disabled />,
      );

      fireEvent.press(getByText('Know'));

      expect(mockOnPressRight).not.toHaveBeenCalled();
    });
  });

  describe('No handlers', () => {
    test('renders without handlers', () => {
      const { getByText } = render(<ReviewBottomActions />);

      expect(getByText("Don't Know")).toBeTruthy();
      expect(getByText('Know')).toBeTruthy();
    });

    test('pressing buttons without handlers does not throw', () => {
      const { getByText } = render(<ReviewBottomActions />);

      fireEvent.press(getByText("Don't Know"));
      fireEvent.press(getByText('Know'));
    });
  });
});
