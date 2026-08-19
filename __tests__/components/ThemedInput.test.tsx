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

import { ThemedInput } from '@/components/primitives/ThemedInput';

// Use shared mock factory from componentMocks.tsx
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

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
      const { getByPlaceholderText, getByTestId } = render(
        <ThemedInput icon="mail" placeholder="Focus me" onFocus={onFocus} />,
      );
      const input = getByPlaceholderText('Focus me');

      expect(getByTestId('mock-icon-mail')).toHaveProp('color', '#666666');

      fireEvent(input, 'focus');

      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(getByTestId('mock-icon-mail')).toHaveProp('color', '#4a7c59');
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
    test('renders the requested left icon', () => {
      const { getByTestId } = render(<ThemedInput icon="mail" placeholder="Email" />);

      expect(getByTestId('mock-icon-mail')).toHaveProp('name', 'mail');
    });

    test('exposes the right-icon action to screen readers', () => {
      const { getByLabelText, getByTestId } = render(
        <ThemedInput
          rightIcon="eye"
          rightIconAccessibilityLabel="Show password"
          placeholder="Password"
        />,
      );

      expect(getByTestId('mock-icon-eye')).toHaveProp('name', 'eye');
      expect(getByLabelText('Show password')).toHaveProp('accessibilityRole', 'button');
    });

    test('invokes the right-icon action when pressed', () => {
      const onRightIconPress = jest.fn();
      const { getByLabelText } = render(
        <ThemedInput
          rightIcon="eye"
          rightIconAccessibilityLabel="Show password"
          placeholder="Password"
          onRightIconPress={onRightIconPress}
        />,
      );

      fireEvent.press(getByLabelText('Show password'));

      expect(onRightIconPress).toHaveBeenCalledTimes(1);
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
      expect(input.props.autoCorrect).toBeFalsy();
    });
  });
});
