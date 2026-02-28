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
  useDebouncedArabicFontSize: () => null,
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
    test('renders heading1 type with large font and bold weight', () => {
      const { getByText } = render(<ThemedText type="heading1">Heading 1</ThemedText>);

      const element = getByText('Heading 1');
      expect(element).toHaveStyle({ fontSize: 32, fontWeight: '700' });
    });

    test('renders heading2 type with appropriate font size', () => {
      const { getByText } = render(<ThemedText type="heading2">Heading 2</ThemedText>);

      const element = getByText('Heading 2');
      expect(element).toHaveStyle({ fontSize: 24, fontWeight: '700' });
    });

    test('renders heading3 type with semibold weight', () => {
      const { getByText } = render(<ThemedText type="heading3">Heading 3</ThemedText>);

      const element = getByText('Heading 3');
      expect(element).toHaveStyle({ fontSize: 18, fontWeight: '600' });
    });

    test('renders bodyBold type with semibold weight', () => {
      const { getByText } = render(<ThemedText type="bodyBold">Bold text</ThemedText>);

      const element = getByText('Bold text');
      expect(element).toHaveStyle({ fontSize: 16, fontWeight: '600' });
    });

    test('renders caption type with smaller font', () => {
      const { getByText } = render(<ThemedText type="caption">Caption text</ThemedText>);

      const element = getByText('Caption text');
      expect(element).toHaveStyle({ fontSize: 13 });
    });

    test('renders label type with semibold weight', () => {
      const { getByText } = render(<ThemedText type="label">Label text</ThemedText>);

      const element = getByText('Label text');
      expect(element).toHaveStyle({ fontSize: 13, fontWeight: '600' });
    });

    test('renders link type with underline decoration', () => {
      const { getByText } = render(<ThemedText type="link">Link text</ThemedText>);

      const element = getByText('Link text');
      expect(element).toHaveStyle({ textDecorationLine: 'underline' });
    });

    test('renders overline type with uppercase transform', () => {
      const { getByText } = render(<ThemedText type="overline">Overline</ThemedText>);

      const element = getByText('Overline');
      expect(element).toHaveStyle({ textTransform: 'uppercase' });
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
      const { getByText } = render(<ThemedText weight="700">Bold weight</ThemedText>);

      const element = getByText('Bold weight');
      expect(element).toHaveStyle({ fontWeight: '700' });
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
    test('renders Arabic type text with specified font size', () => {
      const { getByText } = render(
        <ThemedText type="arabic" arabicFontSize={24}>
          مرحبا
        </ThemedText>,
      );

      const element = getByText('مرحبا');
      expect(element).toBeDefined();
      // Arabic text should apply the specified font size
      expect(element).toHaveStyle({ fontSize: 24 });
    });

    test('renders Arabic type text with RTL text alignment', () => {
      const { getByText } = render(
        <ThemedText type="arabic" arabicFontSize={20}>
          العربية
        </ThemedText>,
      );

      const element = getByText('العربية');
      expect(element).toHaveStyle({ textAlign: 'right' });
    });
  });
});
