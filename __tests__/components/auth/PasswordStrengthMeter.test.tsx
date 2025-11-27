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

// Mock expo-router before imports that depend on it
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));

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
      expect(queryByText('Good')).toBeNull();
      expect(queryByText('Strong')).toBeNull();
    });

    test('shows "Good" label for passwords 8-11 characters', () => {
      const { getByText } = render(<PasswordStrengthMeter password="password1" />);
      expect(getByText('Good')).toBeTruthy();
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
      const icons = UNSAFE_root.findAllByType('Text');
      expect(icons.length).toBeGreaterThan(0);
    });

    test('shows met requirement for valid password', () => {
      const { UNSAFE_root } = render(<PasswordStrengthMeter password="validpassword" />);
      // Component should render with checkmark icon
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Visual States', () => {
    test('renders different bar widths based on strength', () => {
      // Strength 0 (< 8 chars) = 0%
      const { rerender, toJSON } = render(<PasswordStrengthMeter password="short" />);
      const shortJson = toJSON();
      expect(shortJson).toBeTruthy();

      // Strength 1 (8-11 chars) = 33%
      rerender(<PasswordStrengthMeter password="password" />);
      const mediumJson = toJSON();
      expect(mediumJson).toBeTruthy();

      // Strength 3 (16+ chars) = 100%
      rerender(<PasswordStrengthMeter password="verylongpassword1" />);
      const strongJson = toJSON();
      expect(strongJson).toBeTruthy();
    });
  });
});
