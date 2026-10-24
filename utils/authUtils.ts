/**
 * Shared authentication utilities
 */

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
