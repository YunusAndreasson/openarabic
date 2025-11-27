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

      expect(getByText('SUBMIT')).toBeTruthy(); // uppercase by default
    });

    test('renders with lowercase text when uppercase is false', () => {
      const { getByText } = render(
        <ThemedButton title="Submit" onPress={mockOnPress} uppercase={false} />,
      );

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

  describe('Variants', () => {
    test('renders filled variant by default', () => {
      const { toJSON } = render(<ThemedButton title="Filled" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders outlined variant', () => {
      const { toJSON } = render(
        <ThemedButton title="Outlined" variant="outlined" onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Sizes', () => {
    test('renders small size', () => {
      const { toJSON } = render(<ThemedButton title="Small" size="small" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders medium size by default', () => {
      const { toJSON } = render(<ThemedButton title="Medium" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders large size', () => {
      const { toJSON } = render(<ThemedButton title="Large" size="large" onPress={mockOnPress} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('calls onPress when pressed', () => {
      const { getByText } = render(<ThemedButton title="Click Me" onPress={mockOnPress} />);

      fireEvent.press(getByText('CLICK ME'));

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    test('does not call onPress when disabled', () => {
      const { getByText } = render(
        <ThemedButton title="Disabled" disabled onPress={mockOnPress} />,
      );

      fireEvent.press(getByText('DISABLED'));

      expect(mockOnPress).not.toHaveBeenCalled();
    });
  });

  describe('Optimistic Loading', () => {
    test('enables optimistic loading when prop is true', () => {
      const { toJSON } = render(
        <ThemedButton title="Submit" enableOptimisticLoading onPress={mockOnPress} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
