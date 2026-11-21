import { describe, expect, test } from '@jest/globals';

import { STRINGS } from '@/constants/strings';
import {
  getAnalyticsErrorCode,
  getEmailError,
  getErrorCode,
  getPasswordError,
  isCancellationError,
  isNewAccount,
  NEW_PASSWORD_ACCESSIBILITY_HINT,
  PASSWORD_REQUIREMENTS,
} from '@/utils/authUtils';

describe('field rules', () => {
  test('an email is required, then must look like one', () => {
    expect(getEmailError('')).toBe(STRINGS.ERROR_EMPTY_EMAIL);
    expect(getEmailError('not-an-email')).toBe(STRINGS.ENTER_VALID_EMAIL);
    expect(getEmailError('learner@example.com')).toBe('');
  });

  test('a password is required, then must reach the minimum length', () => {
    expect(getPasswordError('')).toBe(STRINGS.ENTER_PASSWORD);
    expect(getPasswordError('a'.repeat(PASSWORD_REQUIREMENTS.minLength - 1))).toBe(
      `Use at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    );
    expect(getPasswordError('a'.repeat(PASSWORD_REQUIREMENTS.minLength))).toBe('');
  });

  test('the spoken hint names the same minimum', () => {
    expect(NEW_PASSWORD_ACCESSIBILITY_HINT).toBe(
      `Enter a password with at least ${PASSWORD_REQUIREMENTS.minLength} characters`,
    );
  });
});

describe('getErrorCode', () => {
  test('reads a native code as a string, whatever type it arrived as', () => {
    expect(getErrorCode(Object.assign(new Error('x'), { code: '1001' }))).toBe('1001');
    expect(getErrorCode(Object.assign(new Error('x'), { code: 8 }))).toBe('8');
    expect(getErrorCode({ code: 'PLAY_SERVICES_NOT_AVAILABLE' })).toBe(
      'PLAY_SERVICES_NOT_AVAILABLE',
    );
  });

  test('is undefined when there is no code to read', () => {
    expect(getErrorCode(new Error('x'))).toBeUndefined();
    expect(getErrorCode({ code: undefined })).toBeUndefined();
    expect(getErrorCode({ code: null })).toBeUndefined();
    expect(getErrorCode('1001')).toBeUndefined();
    expect(getErrorCode(null)).toBeUndefined();
  });
});

describe('isCancellationError', () => {
  test("Apple's cancel code is a cancellation", () => {
    expect(isCancellationError(Object.assign(new Error('canceled'), { code: '1001' }))).toBe(true);
  });

  test('a coded error is judged by its code alone, never its message', () => {
    // ASAuthorizationError.unknown can carry "cancelled" in its text.
    expect(isCancellationError(Object.assign(new Error('was cancelled'), { code: '1000' }))).toBe(
      false,
    );
  });

  test("google-signin's native cancel codes no longer arrive as rejections", () => {
    // v16 resolves `{ type: 'cancelled' }` for these; a rejection carrying one
    // is not a cancel this app can receive, so it is not treated as one.
    expect(isCancellationError(Object.assign(new Error('x'), { code: '12501' }))).toBe(false);
    expect(isCancellationError(Object.assign(new Error('x'), { code: '-5' }))).toBe(false);
  });

  test('falls back to the message only when there is no code', () => {
    expect(isCancellationError(new Error('User dismissed the sheet'))).toBe(true);
    expect(isCancellationError(new Error('Network request failed'))).toBe(false);
  });
});

describe('getAnalyticsErrorCode', () => {
  test("the error's own code first, then its HTTP status, never the message", () => {
    expect(getAnalyticsErrorCode({ code: 'invalid_credentials', status: 400 })).toBe(
      'invalid_credentials',
    );
    expect(getAnalyticsErrorCode({ message: 'Service unavailable', status: 503 })).toBe('503');
    expect(getAnalyticsErrorCode(new Error('No code at all'))).toBeUndefined();
    expect(getAnalyticsErrorCode(null)).toBeUndefined();
  });
});

describe('isNewAccount', () => {
  test('signed in within a minute of being created: this sign-in made the account', () => {
    expect(
      isNewAccount({
        created_at: '2026-11-21T10:00:00.000000Z',
        last_sign_in_at: '2026-11-21T10:00:01.512Z',
      }),
    ).toBe(true);
  });

  test('an older account is a returning one', () => {
    expect(
      isNewAccount({ created_at: '2026-10-01T08:00:00Z', last_sign_in_at: '2026-11-21T10:00:00Z' }),
    ).toBe(false);
  });

  test('a missing or unreadable stamp reads as returning, never as a sign-up', () => {
    expect(isNewAccount({ created_at: '2026-11-21T10:00:00Z' })).toBe(false);
    expect(
      isNewAccount({ created_at: 'not a date', last_sign_in_at: '2026-11-21T10:00:00Z' }),
    ).toBe(false);
  });
});
