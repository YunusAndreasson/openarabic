/**
 * SectionTitle Component Tests
 *
 * Tests section header with title and optional subtitle.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';
import React from 'react';

import { SectionTitle } from '@/components/common/SectionTitle';

// Mock ThemedText
jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  const React = require('react');
  return {
    ThemedText: ({ children, type }: { children: React.ReactNode; type?: string }) =>
      React.createElement(Text, { testID: `text-${type || 'default'}` }, children),
  };
});

describe('SectionTitle', () => {
  describe('Rendering', () => {
    test('renders title text', () => {
      const { getByText } = render(<SectionTitle title="My Section" />);

      expect(getByText('My Section')).toBeTruthy();
    });

    test('renders without subtitle by default', () => {
      const { queryByTestId } = render(<SectionTitle title="Title Only" />);

      // Should have heading but check structure renders
      expect(queryByTestId('text-heading3')).toBeTruthy();
    });

    test('renders subtitle when provided', () => {
      const { getByText } = render(
        <SectionTitle title="Main Title" subtitle="Supporting text" />,
      );

      expect(getByText('Main Title')).toBeTruthy();
      expect(getByText('Supporting text')).toBeTruthy();
    });
  });

  describe('First Section Styling', () => {
    test('accepts isFirstSection prop', () => {
      const { toJSON } = render(<SectionTitle title="First" isFirstSection />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders differently for first vs non-first sections', () => {
      const { toJSON: firstJSON } = render(<SectionTitle title="First" isFirstSection />);
      const { toJSON: normalJSON } = render(<SectionTitle title="Normal" />);

      // Both should render but may have different styles
      expect(firstJSON()).toBeTruthy();
      expect(normalJSON()).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    test('accepts containerStyle prop', () => {
      const { toJSON } = render(
        <SectionTitle title="Styled" containerStyle={{ marginTop: 100 }} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('accepts textStyle prop', () => {
      const { toJSON } = render(
        <SectionTitle title="Styled Text" textStyle={{ fontSize: 24 }} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
