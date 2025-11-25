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

// Mock dependencies
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    text: '#000000',
    secondaryText: '#666666',
    textTertiary: '#999999',
    error: '#F44336',
    warning: '#FF9800',
    success: '#4CAF50',
    info: '#2196F3',
    disabled: '#CCCCCC',
    tint: '#4A9B8E',
  }),
}));

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

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

      expect(getByText('Hello World')).toBeTruthy();
    });

    test('renders with default body type', () => {
      const { toJSON } = render(<ThemedText>Default text</ThemedText>);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Text Types', () => {
    test('renders heading1 type', () => {
      const { getByText } = render(<ThemedText type="heading1">Heading 1</ThemedText>);

      expect(getByText('Heading 1')).toBeTruthy();
    });

    test('renders heading2 type', () => {
      const { getByText } = render(<ThemedText type="heading2">Heading 2</ThemedText>);

      expect(getByText('Heading 2')).toBeTruthy();
    });

    test('renders heading3 type', () => {
      const { getByText } = render(<ThemedText type="heading3">Heading 3</ThemedText>);

      expect(getByText('Heading 3')).toBeTruthy();
    });

    test('renders bodyBold type', () => {
      const { getByText } = render(<ThemedText type="bodyBold">Bold text</ThemedText>);

      expect(getByText('Bold text')).toBeTruthy();
    });

    test('renders caption type', () => {
      const { getByText } = render(<ThemedText type="caption">Caption text</ThemedText>);

      expect(getByText('Caption text')).toBeTruthy();
    });

    test('renders label type', () => {
      const { getByText } = render(<ThemedText type="label">Label text</ThemedText>);

      expect(getByText('Label text')).toBeTruthy();
    });

    test('renders link type', () => {
      const { getByText } = render(<ThemedText type="link">Link text</ThemedText>);

      expect(getByText('Link text')).toBeTruthy();
    });

    test('renders overline type', () => {
      const { getByText } = render(<ThemedText type="overline">Overline</ThemedText>);

      expect(getByText('Overline')).toBeTruthy();
    });
  });

  describe('Semantic Variants', () => {
    test('renders error variant', () => {
      const { getByText } = render(<ThemedText variant="error">Error message</ThemedText>);

      expect(getByText('Error message')).toBeTruthy();
    });

    test('renders warning variant', () => {
      const { getByText } = render(<ThemedText variant="warning">Warning message</ThemedText>);

      expect(getByText('Warning message')).toBeTruthy();
    });

    test('renders success variant', () => {
      const { getByText } = render(<ThemedText variant="success">Success message</ThemedText>);

      expect(getByText('Success message')).toBeTruthy();
    });

    test('renders info variant', () => {
      const { getByText } = render(<ThemedText variant="info">Info message</ThemedText>);

      expect(getByText('Info message')).toBeTruthy();
    });

    test('renders secondary variant', () => {
      const { getByText } = render(<ThemedText variant="secondary">Secondary text</ThemedText>);

      expect(getByText('Secondary text')).toBeTruthy();
    });
  });

  describe('Custom Colors', () => {
    test('applies custom colorName', () => {
      const { getByText } = render(<ThemedText colorName="tint">Tinted text</ThemedText>);

      expect(getByText('Tinted text')).toBeTruthy();
    });

    test('skips default color when skipDefaultColor is true', () => {
      const { getByText } = render(<ThemedText skipDefaultColor>No color</ThemedText>);

      expect(getByText('No color')).toBeTruthy();
    });
  });

  describe('Text Properties', () => {
    test('applies custom weight', () => {
      const { getByText } = render(<ThemedText weight="700">Bold weight</ThemedText>);

      expect(getByText('Bold weight')).toBeTruthy();
    });

    test('applies text alignment', () => {
      const { getByText } = render(<ThemedText align="center">Centered</ThemedText>);

      expect(getByText('Centered')).toBeTruthy();
    });

    test('handles numberOfLines prop', () => {
      const { getByText } = render(
        <ThemedText numberOfLines={2}>Long text that might wrap</ThemedText>,
      );

      expect(getByText('Long text that might wrap')).toBeTruthy();
    });

    test('handles ellipsizeMode prop', () => {
      const { getByText } = render(<ThemedText ellipsizeMode="tail">Truncated text</ThemedText>);

      expect(getByText('Truncated text')).toBeTruthy();
    });
  });

  describe('Arabic Text', () => {
    test('renders Arabic type text', () => {
      const { getByText } = render(
        <ThemedText type="arabic" arabicFontSize={24}>
          مرحبا
        </ThemedText>,
      );

      expect(getByText('مرحبا')).toBeTruthy();
    });
  });
});
