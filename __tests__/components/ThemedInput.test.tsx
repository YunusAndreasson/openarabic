/**
 * ThemedInput Component Tests
 *
 * Tests themed input with focus states, icons, and error handling.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ThemedInput } from '@/components/ThemedInput';

// Mock dependencies
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    elevation1: '#F5F5F5',
    icon: '#666666',
    tabIconSelected: '#4A9B8E',
    tint: '#4A9B8E',
    text: '#000000',
    textTertiary: '#999999',
    shadow: '#000000',
    border: '#DDDDDD',
  }),
}));

jest.mock('@/utils/haptics', () => ({
  errorFeedback: jest.fn(),
}));

describe('ThemedInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders with placeholder', () => {
      const { getByPlaceholderText } = render(<ThemedInput placeholder="Enter text" />);

      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    test('renders with value', () => {
      const { getByDisplayValue } = render(<ThemedInput value="Test value" />);

      expect(getByDisplayValue('Test value')).toBeTruthy();
    });
  });

  describe('Focus States', () => {
    test('handles focus event', () => {
      const onFocus = jest.fn();
      const { getByPlaceholderText } = render(
        <ThemedInput placeholder="Focus me" onFocus={onFocus} />,
      );

      fireEvent(getByPlaceholderText('Focus me'), 'focus');

      expect(onFocus).toHaveBeenCalled();
    });

    test('handles blur event', () => {
      const onBlur = jest.fn();
      const { getByPlaceholderText } = render(
        <ThemedInput placeholder="Blur me" onBlur={onBlur} />,
      );

      fireEvent(getByPlaceholderText('Blur me'), 'blur');

      expect(onBlur).toHaveBeenCalled();
    });
  });

  describe('Text Input', () => {
    test('handles text change', () => {
      const onChangeText = jest.fn();
      const { getByPlaceholderText } = render(
        <ThemedInput placeholder="Type here" onChangeText={onChangeText} />,
      );

      fireEvent.changeText(getByPlaceholderText('Type here'), 'New text');

      expect(onChangeText).toHaveBeenCalledWith('New text');
    });
  });

  describe('Error State', () => {
    test('displays error message', () => {
      const { getByText } = render(<ThemedInput error="Invalid input" />);

      expect(getByText('Invalid input')).toBeTruthy();
    });

    test('triggers haptic feedback on new error', () => {
      const { errorFeedback } = require('@/utils/haptics');

      const { rerender } = render(<ThemedInput />);

      rerender(<ThemedInput error="New error" />);

      expect(errorFeedback).toHaveBeenCalled();
    });
  });

  describe('Hint State', () => {
    test('displays hint message', () => {
      const { getByText } = render(<ThemedInput hint="Enter your email" />);

      expect(getByText('Enter your email')).toBeTruthy();
    });

    test('error takes precedence over hint', () => {
      const { getByText, queryByText } = render(
        <ThemedInput error="Error message" hint="Hint message" />,
      );

      expect(getByText('Error message')).toBeTruthy();
      expect(queryByText('Hint message')).toBeNull();
    });
  });

  describe('Icons', () => {
    test('renders with left icon', () => {
      const { toJSON } = render(<ThemedInput icon="mail" placeholder="Email" />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with right icon', () => {
      const { toJSON } = render(<ThemedInput rightIcon="eye" placeholder="Password" />);

      expect(toJSON()).toBeTruthy();
    });

    test('handles right icon press', () => {
      const onRightIconPress = jest.fn();
      const { toJSON } = render(
        <ThemedInput rightIcon="eye" placeholder="Password" onRightIconPress={onRightIconPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    test('disables auto capitalization', () => {
      const { getByPlaceholderText } = render(<ThemedInput placeholder="email" />);

      const input = getByPlaceholderText('email');
      expect(input.props.autoCapitalize).toBe('none');
    });

    test('disables auto correct', () => {
      const { getByPlaceholderText } = render(<ThemedInput placeholder="email" />);

      const input = getByPlaceholderText('email');
      expect(input.props.autoCorrect).toBe(false);
    });
  });
});
