/**
 * Shared authentication utilities
 */

import { STRINGS } from '@/constants/strings';
import { fillTemplate } from '@/utils/fillTemplate';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
} as const;

/**
 * What is wrong with an email address, as the field shows it; `''` when
 * nothing is. Pure, so the sign-in/sign-up forms and anything else that takes
 * an address agree on the rule.
 */
export function getEmailError(value: string): string {
  if (!value) return STRINGS.ERROR_EMPTY_EMAIL;
  if (!EMAIL_REGEX.test(value)) return STRINGS.ENTER_VALID_EMAIL;
  return '';
}

/**
 * What is wrong with a password, as the field shows it; `''` when nothing is.
 * The auth forms and the reset-password screen used to carry a copy each.
 */
export function getPasswordError(value: string): string {
  if (!value) return STRINGS.ENTER_PASSWORD;
  if (value.length < PASSWORD_REQUIREMENTS.minLength) {
    return fillTemplate(STRINGS.PASSWORD_USE_AT_LEAST_TEMPLATE, {
      minLength: PASSWORD_REQUIREMENTS.minLength,
    });
  }
  return '';
}

/** The spoken hint on a new-password field, built from the same minimum. */
export const NEW_PASSWORD_ACCESSIBILITY_HINT = fillTemplate(STRINGS.NEW_PASSWORD_HINT_TEMPLATE, {
  minLength: PASSWORD_REQUIREMENTS.minLength,
});

/**
 * The `code` a native module rejected with, as a string; undefined when there
 * is none.
 *
 * Native modules reject with string codes ('1001', 'PLAY_SERVICES_NOT_AVAILABLE'),
 * but nothing stops a path from handing back a number, and a strict comparison
 * against the wrong type silently never matches (Google's INTERNAL_ERROR retry
 * once never ran for exactly that reason). So every comparison is made on the
 * string form, read in one place.
 */
export function getErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const { code } = error;
  if (typeof code === 'string') return code;
  return typeof code === 'number' ? String(code) : undefined;
}

/**
 * Native error codes that mean the user backed out.
 *
 * Only Apple's is left. google-signin 16 turns its native SIGN_IN_CANCELLED
 * ('12501' on Android, '-5' on iOS) into a resolved `{ type: 'cancelled' }`
 * response instead of a rejection, so those codes can no longer arrive here;
 * useGoogleAuth reports that response as a `null` sign-in result.
 */
const CANCELLATION_ERROR_CODES: readonly string[] = [
  '1001', // Apple: ASAuthorizationError.canceled (appleAuth.Error.CANCELED)
];

/**
 * Keywords that indicate user-initiated cancellation
 */
const CANCELLATION_KEYWORDS = ['cancel', 'cancelled', 'canceled', 'dismiss', 'dismissed'] as const;

/**
 * Helper to detect if error is a user cancellation (not an actual error)
 *
 * Detection strategy:
 * 1. If error has a code, rely ONLY on code-based detection
 *    - This prevents false positives where error 1000 (unknown) has "cancelled" in message
 * 2. Only use message-based detection as fallback when no code exists
 *
 * @param error - The error to check
 * @returns true if the error represents a user cancellation
 */
export function isCancellationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  // If we have a specific error code, rely ONLY on code-based detection
  // This prevents false positives where error 1000 (ASAuthorizationError.unknown)
  // might have "cancelled" in its message but is NOT a user cancellation
  const errorCode = getErrorCode(error);
  if (errorCode) {
    return CANCELLATION_ERROR_CODES.includes(errorCode);
  }

  // Fallback: Check error message only when no error code exists
  // This handles edge cases where providers throw without codes
  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : 'message' in error && typeof error.message === 'string'
        ? error.message.toLowerCase()
        : '';

  return CANCELLATION_KEYWORDS.some(keyword => errorMessage.includes(keyword));
}
