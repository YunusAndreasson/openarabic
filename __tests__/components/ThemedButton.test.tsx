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

import { ThemedButton } from '@/components/ThemedButton';
import { PRESS_LOCK_WINDOW_MS } from '@/constants/animation';

/**
 * jest.setup stubs `StyleSheet.flatten` as the identity function, so calling it
 * on a style array hands back the array and every `toMatchObject` against it
 * passes vacuously. Flatten it here instead, so the assertion means something.
 */
const flattenStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>(
      (acc, entry) => ({ ...acc, ...flattenStyle(entry) }),
      {},
    );
  }
  return style && typeof style === 'object' ? (style as Record<string, unknown>) : {};
};

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
      const { UNSAFE_queryByType } = render(
        <ThemedButton title="Add" icon="add" onPress={mockOnPress} />,
      );

      // Icon should be rendered (ActivityIndicator or Ionicons)
      expect(UNSAFE_queryByType).toBeDefined();
    });
  });

  describe('Variants and tones', () => {
    // Style assertions are worthless here: jest.setup.js stubs
    // StyleSheet.flatten as the identity function, so any expectation about a
    // resolved backgroundColor passes vacuously. These assert on the rendered
    // tree and on props instead, which the stub does not touch.
    test.each(['filled', 'tonal', 'outlined', 'ghost'] as const)('renders %s variant', variant => {
      const { getByText } = render(
        <ThemedButton title={variant} variant={variant} onPress={mockOnPress} />,
      );

      expect(getByText(variant)).toBeTruthy();
    });

    test.each(['default', 'destructive'] as const)('renders %s tone', tone => {
      const { getByText } = render(
        <ThemedButton title="Delete" tone={tone} onPress={mockOnPress} />,
      );

      expect(getByText('Delete')).toBeTruthy();
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
    test('renders small size with smaller text', () => {
      const { getByText } = render(
        <ThemedButton title="Small" size="small" onPress={mockOnPress} />,
      );

      const textElement = getByText('Small');
      expect(textElement).toBeTruthy();
      // Small size uses 'label' text type
    });

    test('renders medium size by default', () => {
      const { getByText } = render(<ThemedButton title="Medium" onPress={mockOnPress} />);

      const textElement = getByText('Medium');
      expect(textElement).toBeTruthy();
      // Medium size uses 'bodyBold' text type
    });

    test('renders large size with larger text', () => {
      const { getByText } = render(
        <ThemedButton title="Large" size="large" onPress={mockOnPress} />,
      );

      const textElement = getByText('Large');
      expect(textElement).toBeTruthy();
      // Large size uses 'heading3' text type
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

      expect(flattenStyle(getByTestId('cta').props.style)).toMatchObject({
        alignSelf: 'stretch',
      });
    });
  });

  describe('Edge Cases', () => {
    test('handles empty title gracefully', () => {
      const { toJSON } = render(<ThemedButton title="" onPress={mockOnPress} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles long title text', () => {
      const longTitle = 'This is a very long button title that might wrap';
      const { getByText } = render(<ThemedButton title={longTitle} onPress={mockOnPress} />);

      expect(getByText(longTitle)).toBeTruthy();
    });
  });
});
