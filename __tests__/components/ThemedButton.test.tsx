/**
 * ThemedButton Component Tests
 *
 * Tests themed button with different variants, sizes, and states.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { StyleSheet } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { PRESS_LOCK_WINDOW_MS } from '@/constants/animation';
import { tonalSurface } from '@/utils/colorUtils';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';

// Use shared mock factories from componentMocks.tsx
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useThemeDetection', () =>
  require('@/__tests__/helpers/componentMocks').useThemeDetectionMockFactory(),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
}));

describe('ThemedButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders with title text', () => {
      const { getByText } = render(<ThemedButton title="Submit" onPress={mockOnPress} />);

      expect(getByText('Submit')).toBeTruthy();
    });

    test('renders with icon', () => {
      const { getByTestId } = render(<ThemedButton title="Add" icon="add" onPress={mockOnPress} />);

      expect(getByTestId('mock-icon-add')).toHaveProp('name', 'add');
      expect(getByTestId('mock-icon-add')).toHaveProp('size', 20);
    });
  });

  describe('Variants and tones', () => {
    test.each([
      ['filled', { backgroundColor: '#4a7c59', borderColor: '#4a7c59' }],
      ['tonal', tonalSurface('#EEEEEE', '#4a7c59')],
      ['outlined', { backgroundColor: 'transparent', borderColor: '#4a7c59' }],
      ['ghost', { backgroundColor: 'transparent' }],
    ] as const)('paints the %s variant surface', (variant, expectedStyle) => {
      const { UNSAFE_getByProps } = render(
        <ThemedButton title={variant} variant={variant} onPress={mockOnPress} />,
      );

      expect(
        StyleSheet.flatten(UNSAFE_getByProps({ accessibilityRole: 'button' }).props.style),
      ).toMatchObject(expectedStyle);
    });

    test.each([
      ['default', '#4a7c59'],
      ['destructive', '#F44336'],
    ] as const)('uses the %s tone hue', (tone, expectedHue) => {
      const { UNSAFE_getByProps } = render(
        <ThemedButton title="Delete" tone={tone} onPress={mockOnPress} />,
      );

      expect(
        StyleSheet.flatten(UNSAFE_getByProps({ accessibilityRole: 'button' }).props.style),
      ).toMatchObject({
        backgroundColor: expectedHue,
        borderColor: expectedHue,
      });
    });

    test('a destructive ghost is still announced as a button', () => {
      const { UNSAFE_getByProps } = render(
        <ThemedButton title="Ghost" tone="destructive" variant="ghost" onPress={mockOnPress} />,
      );

      expect(UNSAFE_getByProps({ accessibilityRole: 'button' })).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    // `getByRole` can't be used here: the Pressable comes from the reanimated
    // mock, so it is not a host element and RNTL's role query never matches it.
    // The props themselves are what ship, so assert on those.
    test('defaults to the button role without the caller passing one', () => {
      const { UNSAFE_getByProps } = render(<ThemedButton title="Save" onPress={mockOnPress} />);

      expect(UNSAFE_getByProps({ accessibilityRole: 'button' })).toBeTruthy();
    });

    test('reports the disabled state', () => {
      const { UNSAFE_getByProps } = render(
        <ThemedButton disabled title="Save" onPress={mockOnPress} />,
      );

      expect(
        UNSAFE_getByProps({ accessibilityRole: 'button' }).props.accessibilityState,
      ).toMatchObject({ disabled: true });
    });

    test('reports busy while loading, and stays disabled', () => {
      const { UNSAFE_getByProps } = render(
        <ThemedButton loading title="Save" onPress={mockOnPress} />,
      );

      expect(
        UNSAFE_getByProps({ accessibilityRole: 'button' }).props.accessibilityState,
      ).toMatchObject({ busy: true, disabled: true });
    });

    test('keeps the label visible while loading', () => {
      const { getByText } = render(<ThemedButton loading title="Saving" onPress={mockOnPress} />);

      // The spinner takes the icon slot; replacing the label instead made the
      // button resize on every press.
      expect(getByText('Saving')).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    test('renders small size with 13pt text', () => {
      const { getByText } = render(
        <ThemedButton title="Small" size="small" onPress={mockOnPress} />,
      );

      expect(StyleSheet.flatten(getByText('Small').props.style)).toMatchObject({ fontSize: 13 });
    });

    test('renders medium size with 16pt text by default', () => {
      const { getByText } = render(<ThemedButton title="Medium" onPress={mockOnPress} />);

      expect(StyleSheet.flatten(getByText('Medium').props.style)).toMatchObject({ fontSize: 16 });
    });

    test('renders large size with 18pt text', () => {
      const { getByText } = render(
        <ThemedButton title="Large" size="large" onPress={mockOnPress} />,
      );

      expect(StyleSheet.flatten(getByText('Large').props.style)).toMatchObject({ fontSize: 18 });
    });
  });

  describe('Interactions', () => {
    test('calls onPress when pressed', () => {
      const { getByText } = render(<ThemedButton title="Click Me" onPress={mockOnPress} />);

      fireEvent.press(getByText('Click Me'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('does not call onPress when disabled', () => {
      const { getByText } = render(
        <ThemedButton title="Disabled" disabled onPress={mockOnPress} />,
      );

      fireEvent.press(getByText('Disabled'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Haptics', () => {
    // A plain press is tier 0 of the ladder in utils/haptics. The default used
    // to be `light` — tier 1, an outcome — so every button outweighed the result
    // it led to.
    test('a plain press fires the selection tick, not an outcome', () => {
      const { getByText } = render(<ThemedButton title="Continue" onPress={mockOnPress} />);

      fireEvent.press(getByText('Continue'));

      expect(selectionFeedback).toHaveBeenCalledTimes(1);
      expect(lightFeedback).not.toHaveBeenCalled();
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('a caller can still ask for the outcome tier', () => {
      const { getByText } = render(
        <ThemedButton hapticType="light" title="Save" onPress={mockOnPress} />,
      );

      fireEvent.press(getByText('Save'));

      expect(lightFeedback).toHaveBeenCalledTimes(1);
      expect(selectionFeedback).not.toHaveBeenCalled();
    });
  });

  describe('Press lock', () => {
    // The regression test for the bug that motivated usePressLock: the previous
    // guard lived in state, so both halves of a double-tap read the pre-commit
    // value and both fired.
    test('ignores a second press inside the lock window', () => {
      const { getByText } = render(<ThemedButton title="Start" onPress={mockOnPress} />);

      fireEvent.press(getByText('Start'));
      fireEvent.press(getByText('Start'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('accepts a press again once the window has passed', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      const { getByText } = render(<ThemedButton title="Start" onPress={mockOnPress} />);

      fireEvent.press(getByText('Start'));
      jest.advanceTimersByTime(PRESS_LOCK_WINDOW_MS + 1);
      fireEvent.press(getByText('Start'));

      expect(mockOnPress).toHaveBeenCalledTimes(2);

      jest.useRealTimers();
    });
  });

  describe('Layout', () => {
    test('fullWidth stretches the button', () => {
      const { getByTestId } = render(
        <ThemedButton fullWidth testID="cta" title="Continue" onPress={mockOnPress} />,
      );

      expect(StyleSheet.flatten(getByTestId('cta').props.style)).toMatchObject({
        alignSelf: 'stretch',
      });
    });
  });

  describe('Edge Cases', () => {
    test('keeps long titles to one line', () => {
      const longTitle = 'This is a very long button title that might wrap';
      const { getByText } = render(<ThemedButton title={longTitle} onPress={mockOnPress} />);

      expect(getByText(longTitle)).toHaveProp('numberOfLines', 1);
    });
  });
});
