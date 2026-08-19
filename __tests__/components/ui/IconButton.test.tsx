/**
 * IconButton Component Tests
 *
 * Tests icon button with different variants and states.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { IconButton } from '@/components/ui/IconButton';

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
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

jest.mock('@/utils/layoutUtils', () => ({
  createAndroidRipple: () => ({ color: 'rgba(0,0,0,0.1)' }),
}));

describe('IconButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders the requested icon at the token size', () => {
      const { getByTestId } = render(<IconButton icon="play" onPress={mockOnPress} />);

      expect(getByTestId('mock-icon-play')).toHaveProp('size', 20);
    });

    test('honors an explicit icon-size override', () => {
      const { getByTestId } = render(
        <IconButton icon="play" iconSize={32} onPress={mockOnPress} />,
      );

      expect(getByTestId('mock-icon-play')).toHaveProp('size', 32);
    });
  });

  describe('Tones', () => {
    test.each([
      ['default', '#ffffff'],
      ['destructive', '#ffffff'],
    ] as const)('uses the theme contrast color for the %s tone', (tone, expectedColor) => {
      const { getByTestId } = render(<IconButton icon="trash" tone={tone} onPress={mockOnPress} />);

      expect(getByTestId('mock-icon-trash')).toHaveProp('color', expectedColor);
    });
  });

  describe('Accessibility', () => {
    test('exposes the label an icon-only control has no text for', () => {
      const { UNSAFE_getByProps } = render(
        <IconButton accessibilityLabel="Delete word" icon="trash" onPress={mockOnPress} />,
      );

      expect(UNSAFE_getByProps({ accessibilityRole: 'button' }).props.accessibilityLabel).toBe(
        'Delete word',
      );
    });

    test('reports the disabled state', () => {
      const { UNSAFE_getByProps } = render(
        <IconButton disabled accessibilityLabel="Play" icon="play" onPress={mockOnPress} />,
      );

      expect(
        UNSAFE_getByProps({ accessibilityRole: 'button' }).props.accessibilityState,
      ).toMatchObject({ disabled: true });
    });
  });

  describe('Interactions', () => {
    test('fires the action and its default selection haptic once', () => {
      const { selectionFeedback } = require('@/utils/haptics');
      const { getByLabelText } = render(
        <IconButton accessibilityLabel="Play" icon="play" onPress={mockOnPress} />,
      );

      fireEvent.press(getByLabelText('Play'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(selectionFeedback).toHaveBeenCalledTimes(1);
    });

    test('a disabled button fires neither the action nor haptics', () => {
      const { selectionFeedback } = require('@/utils/haptics');
      const { getByLabelText } = render(
        <IconButton accessibilityLabel="Play" icon="play" disabled onPress={mockOnPress} />,
      );

      fireEvent.press(getByLabelText('Play'));

      expect(mockOnPress).not.toHaveBeenCalled();
      expect(selectionFeedback).not.toHaveBeenCalled();
    });
  });

  describe('Haptic Feedback', () => {
    test('uses the requested haptic pattern', () => {
      const { lightFeedback, selectionFeedback } = require('@/utils/haptics');
      const { getByLabelText } = render(
        <IconButton
          accessibilityLabel="Play"
          icon="play"
          hapticType="light"
          onPress={mockOnPress}
        />,
      );

      fireEvent.press(getByLabelText('Play'));

      expect(lightFeedback).toHaveBeenCalledTimes(1);
      expect(selectionFeedback).not.toHaveBeenCalled();
    });

    test('hapticType none remains silent while still invoking the action', () => {
      const haptics = require('@/utils/haptics');
      const { getByLabelText } = render(
        <IconButton
          accessibilityLabel="Play"
          icon="play"
          hapticType="none"
          onPress={mockOnPress}
        />,
      );

      fireEvent.press(getByLabelText('Play'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
      expect(haptics.lightFeedback).not.toHaveBeenCalled();
      expect(haptics.selectionFeedback).not.toHaveBeenCalled();
    });
  });

  describe('Custom Colors', () => {
    test('an explicit icon color overrides the tone contrast color', () => {
      const { getByTestId } = render(
        <IconButton icon="play" iconColor="#FFFFFF" onPress={mockOnPress} />,
      );

      expect(getByTestId('mock-icon-play')).toHaveProp('color', '#FFFFFF');
    });
  });
});
