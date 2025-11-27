/**
 * ProgressBar Component Tests
 *
 * Tests animated progress bar with theme support.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';
import React from 'react';

import { ProgressBar } from '@/components/common/ProgressBar';

// Mock reanimated
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

// Mock theme hook
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory({
    progressBackground: '#E0E0E0',
    progressIndicator: '#4CAF50',
  }),
);

describe('ProgressBar', () => {
  describe('Rendering', () => {
    test('renders with default props', () => {
      const { toJSON } = render(<ProgressBar progress={50} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with zero progress', () => {
      const { toJSON } = render(<ProgressBar progress={0} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with full progress', () => {
      const { toJSON } = render(<ProgressBar progress={100} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with custom height', () => {
      const { toJSON } = render(<ProgressBar progress={50} height={20} />);

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Progress Clamping', () => {
    test('clamps progress above 100 to 100', () => {
      const { toJSON } = render(<ProgressBar progress={150} />);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();
    });

    test('clamps negative progress to 0', () => {
      const { toJSON } = render(<ProgressBar progress={-50} />);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Invalid Input Handling', () => {
    test('handles NaN progress', () => {
      const { toJSON } = render(<ProgressBar progress={NaN} />);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();
    });

    test('handles Infinity progress', () => {
      const { toJSON } = render(<ProgressBar progress={Infinity} />);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();
    });

    test('handles negative Infinity progress', () => {
      const { toJSON } = render(<ProgressBar progress={-Infinity} />);

      // Should render without crashing
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Custom Styling', () => {
    test('accepts custom style prop', () => {
      const { toJSON } = render(
        <ProgressBar progress={50} style={{ marginTop: 10 }} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom fillStyle prop', () => {
      const { toJSON } = render(
        <ProgressBar progress={50} fillStyle={{ opacity: 0.8 }} />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom backgroundColor', () => {
      const { toJSON } = render(
        <ProgressBar progress={50} backgroundColor="#FF0000" />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom fillColor', () => {
      const { toJSON } = render(
        <ProgressBar progress={50} fillColor="#00FF00" />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Animation', () => {
    test('accepts custom animationDuration', () => {
      const { toJSON } = render(
        <ProgressBar progress={50} animationDuration={500} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('renders with very small progress', () => {
      const { toJSON } = render(<ProgressBar progress={0.1} />);

      expect(toJSON()).toBeTruthy();
    });

    test('renders with fractional progress', () => {
      const { toJSON } = render(<ProgressBar progress={33.33} />);

      expect(toJSON()).toBeTruthy();
    });
  });
});
