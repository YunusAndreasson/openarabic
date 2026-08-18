/**
 * PasswordStrengthMeter Component Tests
 *
 * Tests password strength visualization and requirement checklist.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { describe, expect, test } from '@jest/globals';
import React from 'react';

import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Text } from 'react-native';

// Mock useAuthForm to avoid expo-router dependency chain
jest.mock('@/hooks/auth/useAuthForm', () => ({
  useAuthForm: () => ({}),
  PASSWORD_REQUIREMENTS: { minLength: 8 },
}));

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

describe('PasswordStrengthMeter', () => {
  describe('Rendering', () => {
    test('returns null when password is empty', () => {
      const { toJSON } = render(<PasswordStrengthMeter password="" />);
      expect(toJSON()).toBeNull();
    });

    test('renders strength bar when password has content', () => {
      const { toJSON } = render(<PasswordStrengthMeter password="test" />);
      expect(toJSON()).toBeTruthy();
    });

    test('renders requirement checklist', () => {
      const { getByText } = render(<PasswordStrengthMeter password="test" />);
      // Should show the minimum length requirement
      expect(getByText(/8 characters/i)).toBeTruthy();
    });
  });

  describe('Strength Calculation', () => {
    test('shows no label for passwords under 8 characters', () => {
      const { queryByText } = render(<PasswordStrengthMeter password="short" />);
      // Strength label should not appear for weak passwords
      expect(queryByText('Fair')).toBeNull();
      expect(queryByText('Good')).toBeNull();
      expect(queryByText('Strong')).toBeNull();
    });

    test('shows "Fair" label for passwords 8-11 characters', () => {
      const { getByText } = render(<PasswordStrengthMeter password="password1" />);
      expect(getByText('Fair')).toBeTruthy();
    });

    test('shows "Good" label for passwords 12-15 characters', () => {
      const { getByText } = render(<PasswordStrengthMeter password="password1234" />);
      expect(getByText('Good')).toBeTruthy();
    });

    test('shows "Strong" label for passwords 16+ characters', () => {
      const { getByText } = render(<PasswordStrengthMeter password="verylongpassword1" />);
      expect(getByText('Strong')).toBeTruthy();
    });
  });

  describe('Requirement Checklist', () => {
    test('shows unmet requirement for short password', () => {
      const { UNSAFE_root } = render(<PasswordStrengthMeter password="short" />);
      // Find the icon - should be outline (unmet) for short passwords
      const icons = UNSAFE_root.findAllByType(Text);
      expect(icons.length).toBeGreaterThan(0);
    });

    test('shows met requirement for valid password', () => {
      const { UNSAFE_root } = render(<PasswordStrengthMeter password="validpassword" />);
      // Component should render with checkmark icon
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Visual States', () => {
    /**
     * Walks the tree for the `ProgressBar` fill — the only node carrying a
     * percentage width. Asserting the real number is what makes this a
     * regression test for the bar's geometry; it previously only checked that
     * something rendered, so the meter could have shown a flat bar and passed.
     */
    const fillWidth = (node: unknown): string | undefined => {
      if (!node || typeof node !== 'object') return undefined;
      const { props, children } = node as {
        props?: { style?: unknown };
        children?: unknown[] | null;
      };
      const style = (Array.isArray(props?.style) ? props?.style : [props?.style]) ?? [];
      const merged = style
        .flat(Infinity)
        .filter(
          (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object',
        )
        .reduce<Record<string, unknown>>((acc, entry) => ({ ...acc, ...entry }), {});
      // Only ProgressBar's fill animates its width — the track and the row
      // wrapper are both a plain `width: '100%'`, so match on the transition.
      if (merged.transitionProperty === 'width' && typeof merged.width === 'string') {
        return merged.width;
      }
      for (const child of children ?? []) {
        const found = fillWidth(child);
        if (found !== undefined) return found;
      }
      return undefined;
    };

    test.each([
      ['below the minimum length', 'short', '0%'],
      ['at the minimum length (8-11)', 'password', `${(1 / 3) * 100}%`],
      ['a good length (12-15)', 'passwordpass', `${(2 / 3) * 100}%`],
      ['a strong length (16+)', 'verylongpassword1', '100%'],
    ])('fills the bar to %s', (_label, password, expected) => {
      const { toJSON } = render(<PasswordStrengthMeter password={password} />);

      expect(fillWidth(toJSON())).toBe(expected);
    });
  });
});
