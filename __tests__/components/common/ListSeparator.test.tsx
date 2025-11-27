/**
 * ListSeparator Component Tests
 *
 * Tests simple spacing component for lists.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';
import React from 'react';

import { ListSeparator } from '@/components/common/ListSeparator';

describe('ListSeparator', () => {
  test('renders with default height', () => {
    const { toJSON } = render(<ListSeparator />);
    const tree = toJSON();

    expect(tree).toBeTruthy();
    expect(tree).toHaveProperty('type', 'View');
  });

  test('renders with custom height', () => {
    const { toJSON } = render(<ListSeparator height={24} />);
    const tree = toJSON();

    expect(tree).toBeTruthy();
    expect(tree?.props?.style?.height).toBe(24);
  });

  test('renders with zero height', () => {
    const { toJSON } = render(<ListSeparator height={0} />);
    const tree = toJSON();

    expect(tree?.props?.style?.height).toBe(0);
  });
});
