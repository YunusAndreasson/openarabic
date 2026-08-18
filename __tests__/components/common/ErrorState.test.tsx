/**
 * ErrorState Component Tests
 *
 * Tests error display with retry functionality.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ErrorState } from '@/components/common/ErrorState';
import { STRINGS } from '@/constants/strings';

// Mock ThemedText
jest.mock('@/components/primitives/ThemedText', () => {
  const { Text } = require('react-native');
  const React = require('react');
  return {
    ThemedText: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Text, null, children),
  };
});

// Mock ThemedButton
jest.mock('@/components/primitives/ThemedButton', () => {
  const { Pressable, Text } = require('react-native');
  const React = require('react');
  return {
    ThemedButton: ({ title, onPress }: { title: string; onPress?: () => void }) =>
      React.createElement(
        Pressable,
        { onPress, testID: 'retry-button' },
        React.createElement(Text, null, title),
      ),
  };
});

describe('ErrorState', () => {
  const mockOnRetry = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders error message', () => {
      const { getByText } = render(<ErrorState message="Something went wrong" />);

      expect(getByText('Something went wrong')).toBeTruthy();
    });

    test('renders retry button when onRetry is provided', () => {
      const { getByTestId } = render(<ErrorState message="Error" onRetry={mockOnRetry} />);

      expect(getByTestId('retry-button')).toBeTruthy();
    });

    test('labels the retry button from STRINGS', () => {
      // Previously unasserted: the label came from `UiAction.REFRESH`, which this
      // suite supplied by whole-module-mocking '@/types/enums'. That mock outlived
      // the import it existed for — inert, and primed to blank out ToastType /
      // AppTab for anything ErrorState later renders.
      const { getByText } = render(<ErrorState message="Error" onRetry={mockOnRetry} />);

      expect(getByText(STRINGS.REFRESH)).toBeTruthy();
    });

    test('does not render retry button when onRetry is not provided', () => {
      const { queryByTestId } = render(<ErrorState message="Error" />);

      expect(queryByTestId('retry-button')).toBeNull();
    });
  });

  describe('Retry Interaction', () => {
    test('calls onRetry when retry button is pressed', () => {
      const { getByTestId } = render(<ErrorState message="Error" onRetry={mockOnRetry} />);

      fireEvent.press(getByTestId('retry-button'));

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    test('handles long error messages', () => {
      const longMessage =
        'This is a very long error message that might wrap to multiple lines and should still display correctly in the error state component.';

      const { getByText } = render(<ErrorState message={longMessage} />);

      expect(getByText(longMessage)).toBeTruthy();
    });

    test('handles empty message', () => {
      const { toJSON } = render(<ErrorState message="" />);

      expect(toJSON()).toBeTruthy();
    });
  });
});
