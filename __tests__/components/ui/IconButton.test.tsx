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
    test('renders with icon', () => {
      const { toJSON } = render(<IconButton icon="play" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with custom icon size', () => {
      const { toJSON } = render(<IconButton icon="play" iconSize={32} onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Tones', () => {
    test.each(['default', 'destructive'] as const)('renders %s tone', tone => {
      const { UNSAFE_getByProps } = render(
        <IconButton accessibilityLabel="Action" icon="trash" tone={tone} onPress={mockOnPress} />,
      );

      expect(UNSAFE_getByProps({ accessibilityRole: 'button' })).toBeTruthy();
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
    test('renders pressable when onPress provided', () => {
      const { toJSON } = render(<IconButton icon="play" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders disabled state', () => {
      const { toJSON } = render(<IconButton icon="play" disabled onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Haptic Feedback', () => {
    test('renders with haptic props', () => {
      const { toJSON } = render(
        <IconButton icon="play" hapticType="light" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('renders with hapticType none', () => {
      const { toJSON } = render(<IconButton icon="play" hapticType="none" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Custom Colors', () => {
    test('accepts custom background color', () => {
      const { toJSON } = render(
        <IconButton icon="play" backgroundColor="#FF0000" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom icon color', () => {
      const { toJSON } = render(
        <IconButton icon="play" iconColor="#FFFFFF" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
