/**
 * ProgressBar Component Tests
 *
 * Tests animated progress bar with theme support.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { useReducedMotion } from 'react-native-reanimated';

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

/**
 * `StyleSheet.flatten` is the identity function under this jest setup, so a
 * rendered `style` prop is the raw array the component passed. These helpers
 * merge it so a test can assert on the resolved value instead of settling for
 * `toBeTruthy()` — which is what every case here used to do, leaving the
 * clamping and invalid-input handling below completely unverified.
 */
type RenderedNode = { props: { style?: unknown }; children?: unknown } | null;

const mergeStyle = (style: unknown): Record<string, unknown> =>
  (Array.isArray(style) ? style : [style])
    .flat(Infinity)
    .filter(
      (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object',
    )
    .reduce<Record<string, unknown>>((acc, entry) => ({ ...acc, ...entry }), {});

/** Resolved style of the outer track. */
const trackStyle = (json: RenderedNode): Record<string, unknown> => mergeStyle(json?.props.style);

/** Resolved style of the inner fill, whose `width` percentage IS the progress. */
const fillStyle = (json: RenderedNode): Record<string, unknown> => {
  const fill = (json as { children?: RenderedNode[] } | null)?.children?.[0];
  return mergeStyle(fill?.props.style);
};

describe('ProgressBar', () => {
  describe('Rendering', () => {
    test('renders with default props', () => {
      const { toJSON } = render(<ProgressBar progress={50} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('50%');
    });

    test('renders with zero progress', () => {
      const { toJSON } = render(<ProgressBar progress={0} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('0%');
    });

    test('renders with full progress', () => {
      const { toJSON } = render(<ProgressBar progress={100} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('100%');
    });

    test('custom height also sets the pill radius to half of it', () => {
      const { toJSON } = render(<ProgressBar progress={50} height={20} />);

      expect(trackStyle(toJSON() as RenderedNode)).toMatchObject({
        height: 20,
        borderRadius: 10,
      });
    });
  });

  describe('Progress Clamping', () => {
    test('clamps progress above 100 to 100', () => {
      const { toJSON } = render(<ProgressBar progress={150} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('100%');
    });

    test('clamps negative progress to 0', () => {
      const { toJSON } = render(<ProgressBar progress={-50} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('0%');
    });
  });

  describe('Invalid Input Handling', () => {
    test.each([
      ['NaN', NaN],
      ['Infinity', Infinity],
      ['negative Infinity', -Infinity],
    ])('renders %s as 0%% rather than an invalid width', (_label, value) => {
      const { toJSON } = render(<ProgressBar progress={value} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('0%');
    });
  });

  describe('Custom Styling', () => {
    test('custom style prop reaches the track', () => {
      const { toJSON } = render(<ProgressBar progress={50} style={{ marginTop: 10 }} />);

      expect(trackStyle(toJSON() as RenderedNode).marginTop).toBe(10);
    });

    test('custom fillStyle prop reaches the fill', () => {
      const { toJSON } = render(<ProgressBar progress={50} fillStyle={{ opacity: 0.8 }} />);

      expect(fillStyle(toJSON() as RenderedNode).opacity).toBe(0.8);
    });

    test('custom backgroundColor overrides the theme track colour', () => {
      const { toJSON } = render(<ProgressBar progress={50} backgroundColor="#FF0000" />);

      expect(trackStyle(toJSON() as RenderedNode).backgroundColor).toBe('#FF0000');
    });

    test('custom fillColor overrides the theme indicator colour', () => {
      const { toJSON } = render(<ProgressBar progress={50} fillColor="#00FF00" />);

      expect(fillStyle(toJSON() as RenderedNode).backgroundColor).toBe('#00FF00');
    });

    test('falls back to theme colours when none are passed', () => {
      const { toJSON } = render(<ProgressBar progress={50} />);

      expect(trackStyle(toJSON() as RenderedNode).backgroundColor).toBe('#E0E0E0');
      expect(fillStyle(toJSON() as RenderedNode).backgroundColor).toBe('#4CAF50');
    });
  });

  describe('Animation', () => {
    test('custom animationDuration drives the width transition', () => {
      const { toJSON } = render(<ProgressBar progress={50} animationDuration={500} />);

      expect(fillStyle(toJSON() as RenderedNode)).toMatchObject({
        transitionProperty: 'width',
        transitionDuration: '500ms',
      });
    });

    // A growing width is movement, and the CSS API animates it whatever the
    // OS setting says — it used to, here.
    test('jumps to the new width under Reduce Motion', () => {
      jest.mocked(useReducedMotion).mockReturnValue(true);

      const { toJSON } = render(<ProgressBar progress={50} />);

      const fill = fillStyle(toJSON() as RenderedNode);
      expect(fill.width).toBe('50%');
      expect(fill).not.toHaveProperty('transitionProperty');
    });

    test('carries no transition when the caller asked for no animation', () => {
      const { toJSON } = render(<ProgressBar progress={50} animationDuration={0} />);

      expect(fillStyle(toJSON() as RenderedNode)).not.toHaveProperty('transitionProperty');
    });
  });

  describe('Edge Cases', () => {
    test('renders with very small progress', () => {
      const { toJSON } = render(<ProgressBar progress={0.1} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('0.1%');
    });

    test('renders with fractional progress', () => {
      const { toJSON } = render(<ProgressBar progress={33.33} />);

      expect(fillStyle(toJSON() as RenderedNode).width).toBe('33.33%');
    });
  });
});
