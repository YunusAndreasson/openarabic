import { describe, expect, test } from '@jest/globals';

import { getErrorCode, isCancellationError } from '@/utils/authUtils';

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
