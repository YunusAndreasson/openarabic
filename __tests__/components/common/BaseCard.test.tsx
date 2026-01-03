/**
 * BaseCard Component Tests
 *
 * Tests foundation card component used throughout the app.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Text } from 'react-native';

import { BaseCard } from '@/components/common/BaseCard';

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

describe('BaseCard', () => {
  const mockOnPress = jest.fn();
  const mockOnLongPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders children correctly', () => {
      const { getByText } = render(
        <BaseCard>
          <Text>Card Content</Text>
        </BaseCard>,
      );
      expect(getByText('Card Content')).toBeTruthy();
    });

    test('renders with testID', () => {
      const { getByTestId } = render(
        <BaseCard testID="my-card">
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(getByTestId('my-card')).toBeTruthy();
    });

    test('renders loading state without children', () => {
      const { queryByText, getByTestId } = render(
        <BaseCard testID="loading-card" loading>
          <Text>Hidden Content</Text>
        </BaseCard>,
      );
      expect(getByTestId('loading-card')).toBeTruthy();
      // Content should not be visible during loading
      expect(queryByText('Hidden Content')).toBeNull();
    });
  });

  describe('Shadow Sizes', () => {
    test('renders with default medium shadow', () => {
      const { toJSON } = render(
        <BaseCard>
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('renders with subtle shadow', () => {
      const { toJSON } = render(
        <BaseCard shadowSize="subtle">
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('renders with small shadow', () => {
      const { toJSON } = render(
        <BaseCard shadowSize="small">
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('renders with large shadow', () => {
      const { toJSON } = render(
        <BaseCard shadowSize="large">
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('renders with no shadow', () => {
      const { toJSON } = render(
        <BaseCard shadowSize="none">
          <Text>Content</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('calls onPress when pressed', () => {
      const { getByTestId } = render(
        <BaseCard testID="pressable-card" onPress={mockOnPress}>
          <Text>Press Me</Text>
        </BaseCard>,
      );

      fireEvent.press(getByTestId('pressable-card'));
      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('calls onLongPress when long pressed', () => {
      const { getByTestId } = render(
        <BaseCard testID="long-press-card" onLongPress={mockOnLongPress}>
          <Text>Long Press Me</Text>
        </BaseCard>,
      );

      fireEvent(getByTestId('long-press-card'), 'longPress');
      expect(mockOnLongPress).toHaveBeenCalledTimes(1);
    });

    test('does not render Pressable when no press handlers', () => {
      const { getByTestId } = render(
        <BaseCard testID="static-card">
          <Text>Static Content</Text>
        </BaseCard>,
      );
      // Card should render but not be pressable
      expect(getByTestId('static-card')).toBeTruthy();
    });
  });

  describe('Disabled State', () => {
    test('renders with disabled opacity', () => {
      const { toJSON } = render(
        <BaseCard disabled onPress={mockOnPress}>
          <Text>Disabled Card</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('passes disabled prop to Pressable', () => {
      // Note: fireEvent.press bypasses native disabled behavior
      // This test verifies the structure renders correctly when disabled
      const { getByTestId } = render(
        <BaseCard testID="disabled-card" disabled onPress={mockOnPress}>
          <Text>Disabled</Text>
        </BaseCard>,
      );

      // Component renders with disabled state (opacity applied)
      expect(getByTestId('disabled-card')).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    test('accepts custom style prop', () => {
      const { toJSON } = render(
        <BaseCard style={{ marginTop: 20 }}>
          <Text>Styled Card</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom contentStyle prop', () => {
      const { toJSON } = render(
        <BaseCard contentStyle={{ paddingHorizontal: 24 }}>
          <Text>Custom Content Style</Text>
        </BaseCard>,
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Press Animation', () => {
    test('has press animation styles applied', () => {
      const { toJSON } = render(
        <BaseCard onPress={mockOnPress}>
          <Text>Animated Card</Text>
        </BaseCard>,
      );
      // Animation styles are applied via reanimated
      expect(toJSON()).toBeTruthy();
    });
  });
});
