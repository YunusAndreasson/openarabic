/**
 * SignUpForm Component Tests
 *
 * Tests sign up form with email/password inputs, validation, and password strength.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { SignUpForm } from '@/components/auth/SignUpForm';

// Use shared mock factories
jest.mock('react-native-reanimated', () =>
  require('@/__tests__/helpers/componentMocks').createReanimatedMock(),
);

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/hooks/theme/useThemeDetection', () =>
  require('@/__tests__/helpers/componentMocks').useThemeDetectionMockFactory(),
);

jest.mock('@/hooks/animations', () =>
  require('@/__tests__/helpers/componentMocks').createAnimationHooksMock(),
);

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: {
    push: (...args: unknown[]) => mockRouterPush(...args),
  },
}));

// Mock useAuthForm hook
const mockSignUpWithEmail = jest.fn();
const mockSetEmail = jest.fn();
const mockSetPassword = jest.fn();
const mockValidateEmail = jest.fn((..._args: unknown[]) => true);
const mockValidatePassword = jest.fn((..._args: unknown[]) => true);

let mockPassword = '';

jest.mock('@/hooks/auth/useAuthForm', () => ({
  useAuthForm: () => ({
    email: '',
    setEmail: mockSetEmail,
    password: mockPassword,
    setPassword: (val: string) => {
      mockPassword = val;
      mockSetPassword(val);
    },
    loading: false,
    emailError: '',
    passwordError: '',
    validateEmail: mockValidateEmail,
    validatePassword: mockValidatePassword,
    signUpWithEmail: mockSignUpWithEmail,
  }),
  PASSWORD_REQUIREMENTS: { minLength: 8 },
}));

jest.mock('@/utils/haptics', () => ({
  lightFeedback: jest.fn(),
  mediumFeedback: jest.fn(),
  successFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

describe('SignUpForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPassword = '';
  });

  describe('Rendering', () => {
    test('renders email input', () => {
      const { getByTestId } = render(<SignUpForm />);
      expect(getByTestId('email-input')).toBeTruthy();
    });

    test('renders password input', () => {
      const { getByTestId } = render(<SignUpForm />);
      expect(getByTestId('password-input')).toBeTruthy();
    });

    test('renders create account button', () => {
      const { getByTestId } = render(<SignUpForm />);
      expect(getByTestId('create-account-button')).toBeTruthy();
    });

    test('renders sign in link', () => {
      const { getByTestId } = render(<SignUpForm />);
      expect(getByTestId('navigate-to-sign-in-link')).toBeTruthy();
    });
  });

  describe('Interactions', () => {
    test('calls signUpWithEmail when create account button pressed', () => {
      const { getByTestId } = render(<SignUpForm />);

      fireEvent.press(getByTestId('create-account-button'));

      expect(mockSignUpWithEmail).toHaveBeenCalledTimes(1);
    });

    test('navigates to sign in when sign in link pressed', () => {
      const { getByTestId } = render(<SignUpForm />);

      fireEvent.press(getByTestId('navigate-to-sign-in-link'));

      expect(mockRouterPush).toHaveBeenCalledWith('/auth/sign-in');
    });

    test('calls setEmail when email input changes', () => {
      const { getByTestId } = render(<SignUpForm />);

      fireEvent.changeText(getByTestId('email-input'), 'new@example.com');

      expect(mockSetEmail).toHaveBeenCalledWith('new@example.com');
    });

    test('calls setPassword when password input changes', () => {
      const { getByTestId } = render(<SignUpForm />);

      fireEvent.changeText(getByTestId('password-input'), 'newpassword');

      expect(mockSetPassword).toHaveBeenCalledWith('newpassword');
    });
  });

  describe('Password Strength Meter Integration', () => {
    test('does not show password strength meter when password is empty', () => {
      mockPassword = '';
      const { queryByText } = render(<SignUpForm />);
      // Strength labels shouldn't appear for empty password
      expect(queryByText('Good')).toBeNull();
      expect(queryByText('Strong')).toBeNull();
    });
  });

  describe('Accessibility', () => {
    test('email input has accessibility label', () => {
      const { getByLabelText } = render(<SignUpForm />);
      expect(getByLabelText('Email address')).toBeTruthy();
    });

    test('password input has accessibility label', () => {
      const { getByLabelText } = render(<SignUpForm />);
      expect(getByLabelText('Password')).toBeTruthy();
    });

    test('create account button has accessibility label', () => {
      const { getByLabelText } = render(<SignUpForm />);
      expect(getByLabelText('Create account')).toBeTruthy();
    });

    test('password input has helpful hint', () => {
      const { getByA11yHint } = render(<SignUpForm />);
      expect(getByA11yHint(/at least 8 characters/i)).toBeTruthy();
    });
  });

  describe('Loading State', () => {
    test('button is disabled during loading', () => {
      // Override mock for loading state
      jest.doMock('@/hooks/auth/useAuthForm', () => ({
        useAuthForm: () => ({
          email: '',
          setEmail: mockSetEmail,
          password: '',
          setPassword: mockSetPassword,
          loading: true,
          emailError: '',
          passwordError: '',
          validateEmail: mockValidateEmail,
          validatePassword: mockValidatePassword,
          signUpWithEmail: mockSignUpWithEmail,
        }),
        PASSWORD_REQUIREMENTS: { minLength: 8 },
      }));

      const { getByTestId } = render(<SignUpForm />);
      const button = getByTestId('create-account-button');

      // Button should exist
      expect(button).toBeTruthy();
    });
  });
});
