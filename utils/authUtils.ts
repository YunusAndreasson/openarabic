/**
 * Shared authentication utilities
 */

/**
 * Known cancellation error codes for different auth providers
 */
const CANCELLATION_ERROR_CODES = [
  '12501', // Google Android user cancelled
  '-5', // Google iOS user cancelled
  '1001', // Apple iOS cancellation
] as const;

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

  // Check error code (Google and Apple cancellation codes)
  const errorCode = 'code' in error ? String(error.code) : '';

  // If we have a specific error code, rely ONLY on code-based detection
  // This prevents false positives where error 1000 (ASAuthorizationError.unknown)
  // might have "cancelled" in its message but is NOT a user cancellation
  if (errorCode) {
    return CANCELLATION_ERROR_CODES.includes(
      errorCode as (typeof CANCELLATION_ERROR_CODES)[number],
    );
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
