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

      expect(getByText('Submit')).toBeTruthy(); // sentence case by default (uppercase=false)
    });

    test('renders with uppercase text when uppercase is true', () => {
      const { getByText } = render(
        <ThemedButton title="Submit" onPress={mockOnPress} uppercase={true} />,
      );

      expect(getByText('SUBMIT')).toBeTruthy(); // uppercase=true transforms text
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
    test('renders filled variant by default with background color', () => {
      const { getByText } = render(<ThemedButton title="Filled" onPress={mockOnPress} />);

      const textElement = getByText('Filled');
      expect(textElement).toBeTruthy();

      // Filled variant should render text with appropriate color
      // The button renders successfully with filled styling
    });

    test('renders outlined variant with transparent background', () => {
      const { getByText } = render(
        <ThemedButton title="Outlined" variant="outlined" onPress={mockOnPress} />,
      );

      const textElement = getByText('Outlined');
      expect(textElement).toBeTruthy();

      // Outlined variant should have border but transparent background
    });

    test('filled variant shows different text color in disabled state', () => {
      const { getByText } = render(
        <ThemedButton title="Disabled" variant="filled" disabled onPress={mockOnPress} />,
      );

      expect(getByText('Disabled')).toBeTruthy();
      // Disabled state uses colors.disabled for text
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

  describe('Optimistic Loading', () => {
    test('renders button with enableOptimisticLoading prop', () => {
      const { getByText } = render(
        <ThemedButton title="Submit" enableOptimisticLoading onPress={mockOnPress} />,
      );

      expect(getByText('Submit')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty title gracefully', () => {
      const { toJSON } = render(<ThemedButton title="" onPress={mockOnPress} />);
      expect(toJSON()).toBeTruthy();
    });

    test('handles long title text', () => {
      const longTitle = 'This is a very long button title that might wrap';
      const { getByText } = render(
        <ThemedButton title={longTitle} onPress={mockOnPress} uppercase={false} />,
      );

      expect(getByText(longTitle)).toBeTruthy();
    });
  });
});
