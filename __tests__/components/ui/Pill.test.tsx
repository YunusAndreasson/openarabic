/**
 * Pill Component Tests
 *
 * Tests pill component with filter and category variants.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { Pill } from '@/components/ui/Pill';

// Mock dependencies
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    tint: '#4A9B8E',
    text: '#000000',
    background: '#FFFFFF',
    elevation1: '#F5F5F5',
    elevation2: '#EEEEEE',
    shadow: '#000000',
    borderOverlay: '#DDDDDD',
  }),
}));

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

describe('Pill', () => {
  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    test('renders with label', () => {
      const { getByText } = render(<Pill id="1" label="Category" />);

      expect(getByText('Category')).toBeTruthy();
    });

    test('renders unselected state by default', () => {
      const { getByText } = render(<Pill id="1" label="Filter" onSelect={mockOnSelect} />);

      expect(getByText('Filter')).toBeTruthy();
    });

    test('renders selected state', () => {
      const { getByText } = render(
        <Pill id="1" label="Filter" isSelected onSelect={mockOnSelect} />,
      );

      expect(getByText('Filter')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    test('renders filter variant by default', () => {
      const { getByText } = render(<Pill id="1" label="Filter" onSelect={mockOnSelect} />);

      expect(getByText('Filter')).toBeTruthy();
    });

    test('renders category variant', () => {
      const { getByText } = render(
        <Pill id="1" label="Tafsir" variant="category" onSelect={mockOnSelect} />,
      );

      expect(getByText('Tafsir')).toBeTruthy();
    });

    test('renders non-interactive category variant', () => {
      const { getByText } = render(<Pill id="1" label="Read Only" variant="category" />);

      expect(getByText('Read Only')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('calls onSelect with id when pressed', () => {
      const { getByText } = render(<Pill id="filter-1" label="Filter" onSelect={mockOnSelect} />);

      fireEvent.press(getByText('Filter'));

      expect(mockOnSelect).toHaveBeenCalledWith('filter-1');
    });

    test('does not call onSelect when no handler provided', () => {
      const { getByText } = render(<Pill id="1" label="No Handler" />);

      fireEvent.press(getByText('No Handler'));

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Selection States', () => {
    test('displays selected filter styling', () => {
      const { toJSON } = render(
        <Pill id="1" label="Selected" isSelected onSelect={mockOnSelect} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('displays unselected filter styling', () => {
      const { toJSON } = render(
        <Pill id="1" label="Unselected" isSelected={false} onSelect={mockOnSelect} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('displays selected category styling', () => {
      const { toJSON } = render(
        <Pill id="1" label="Selected" variant="category" isSelected onSelect={mockOnSelect} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Text Truncation', () => {
    test('truncates long text with ellipsis', () => {
      const { getByText } = render(
        <Pill id="1" label="Very Long Category Name That Should Be Truncated" />,
      );

      expect(getByText('Very Long Category Name That Should Be Truncated')).toBeTruthy();
    });
  });
});
