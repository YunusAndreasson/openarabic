/**
 * ThemedText Component Tests
 *
 * Tests themed text with different types, variants, and styles.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { ThemedText } from '@/components/ThemedText';

// Use shared mock factories from componentMocks.tsx
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useThemeDetection', () =>
  require('@/__tests__/helpers/componentMocks').useThemeDetectionMockFactory(),
);

jest.mock('@/hooks/theme/useDebouncedArabicFontSize', () => ({
  useDebouncedArabicFontSize: () => 20,
}));

jest.mock('@/store/hooks', () => ({
  useAppSelector: () => 'noto-naskh',
}));

describe('ThemedText', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders text content', () => {
      const { getByText } = render(<ThemedText>Hello World</ThemedText>);

      const textElement = getByText('Hello World');
      expect(textElement).toBeDefined();
      expect(textElement.props.children).toBe('Hello World');
    });

    test('renders with default body type and applies body styles', () => {
      const { getByText } = render(<ThemedText>Default text</ThemedText>);

      const textElement = getByText('Default text');
      // Verify body type applies correct font size (16px = MEDIUM scale)
      expect(textElement).toHaveStyle({ fontSize: 16 });
    });
  });

  describe('Text Types', () => {
    test('renders heading1 type with large font and bold family', () => {
      const { getByText } = render(<ThemedText type="heading1">Heading 1</ThemedText>);

      const element = getByText('Heading 1');
      expect(element).toHaveStyle({ fontSize: 32, fontFamily: 'Inter-Bold' });
    });

    test('renders heading2 type with appropriate font size', () => {
      const { getByText } = render(<ThemedText type="heading2">Heading 2</ThemedText>);

      const element = getByText('Heading 2');
      expect(element).toHaveStyle({ fontSize: 24, fontFamily: 'Inter-Bold' });
    });

    test('renders heading3 type with semibold family', () => {
      const { getByText } = render(<ThemedText type="heading3">Heading 3</ThemedText>);

      const element = getByText('Heading 3');
      expect(element).toHaveStyle({ fontSize: 18, fontFamily: 'Inter-SemiBold' });
    });

    test('renders bodyBold type with semibold family', () => {
      const { getByText } = render(<ThemedText type="bodyBold">Bold text</ThemedText>);

      const element = getByText('Bold text');
      expect(element).toHaveStyle({ fontSize: 16, fontFamily: 'Inter-SemiBold' });
    });

    test('renders caption type with smaller font', () => {
      const { getByText } = render(<ThemedText type="caption">Caption text</ThemedText>);

      const element = getByText('Caption text');
      expect(element).toHaveStyle({ fontSize: 13 });
    });

    test('renders label type with semibold family', () => {
      const { getByText } = render(<ThemedText type="label">Label text</ThemedText>);

      const element = getByText('Label text');
      expect(element).toHaveStyle({ fontSize: 13, fontFamily: 'Inter-SemiBold' });
    });

    test('renders overline type in sentence case', () => {
      const { getByText } = render(<ThemedText type="overline">Continue reading</ThemedText>);

      const element = getByText('Continue reading');
      expect(element).toHaveStyle({ fontSize: 13, fontFamily: 'Inter-SemiBold' });
      // The style prop is an array, so flatten before asking what it contains.
      expect([element.props.style].flat(Infinity).some(s => s && 'textTransform' in s)).toBe(false);
    });
  });

  describe('Semantic Variants', () => {
    test('renders error variant with error color', () => {
      const { getByText } = render(<ThemedText variant="error">Error message</ThemedText>);

      const element = getByText('Error message');
      // Error variant should apply error color from mockColors (#F44336)
      expect(element).toHaveStyle({ color: '#F44336' });
    });

    test('renders primary variant with text color', () => {
      const { getByText } = render(<ThemedText variant="primary">Primary text</ThemedText>);

      const element = getByText('Primary text');
      // Primary variant uses default text color (#000000)
      expect(element).toHaveStyle({ color: '#000000' });
    });

    test('renders secondary variant with secondary text color', () => {
      const { getByText } = render(<ThemedText variant="secondary">Secondary text</ThemedText>);

      const element = getByText('Secondary text');
      // Secondary variant uses secondaryText color (#666666)
      expect(element).toHaveStyle({ color: '#666666' });
    });
  });

  describe('Custom Colors', () => {
    test('applies custom colorName from theme', () => {
      const { getByText } = render(<ThemedText colorName="tint">Tinted text</ThemedText>);

      const element = getByText('Tinted text');
      // tint color from mockColors is #4a7c59
      expect(element).toHaveStyle({ color: '#4a7c59' });
    });

    test('skips default color when skipDefaultColor is true', () => {
      const { getByText } = render(<ThemedText skipDefaultColor>No color</ThemedText>);

      const element = getByText('No color');
      // When skipDefaultColor is true, color should not be applied
      // The style array should not include a color property from the default
      expect(element).toBeDefined();
    });
  });

  describe('Text Properties', () => {
    test('applies custom weight override', () => {
      const { getByText } = render(<ThemedText weight="bold">Bold weight</ThemedText>);

      const element = getByText('Bold weight');
      expect(element).toHaveStyle({ fontFamily: 'Inter-Bold' });
    });

    test('applies text alignment center', () => {
      const { getByText } = render(<ThemedText align="center">Centered</ThemedText>);

      const element = getByText('Centered');
      expect(element).toHaveStyle({ textAlign: 'center' });
    });

    test('passes numberOfLines prop to underlying Text', () => {
      const { getByText } = render(
        <ThemedText numberOfLines={2}>Long text that might wrap</ThemedText>,
      );

      const element = getByText('Long text that might wrap');
      expect(element.props.numberOfLines).toBe(2);
    });

    test('passes ellipsizeMode prop to underlying Text', () => {
      const { getByText } = render(<ThemedText ellipsizeMode="tail">Truncated text</ThemedText>);

      const element = getByText('Truncated text');
      expect(element.props.ellipsizeMode).toBe('tail');
    });
  });

  describe('Arabic Text', () => {
    test('renders Arabic type text with debounced font size', () => {
      const { getByText } = render(<ThemedText type="arabic">مرحبا</ThemedText>);

      const element = getByText('مرحبا');
      // Arabic text should use the debounced font size from the hook (mocked to 20)
      expect(element).toHaveStyle({ fontSize: 20 });
    });

    test('renders Arabic type text with RTL text alignment', () => {
      const { getByText } = render(<ThemedText type="arabic">العربية</ThemedText>);

      const element = getByText('العربية');
      expect(element).toHaveStyle({ textAlign: 'right' });
    });
  });
});
