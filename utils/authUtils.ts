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
 * Checks both error codes and error messages for cancellation patterns
 *
 * @param error - The error to check
 * @returns true if the error represents a user cancellation
 */
export function isCancellationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  // Check error code (Google and Apple cancellation codes)
  const errorCode = 'code' in error ? String(error.code) : '';
  if (CANCELLATION_ERROR_CODES.includes(errorCode as (typeof CANCELLATION_ERROR_CODES)[number])) {
    return true;
  }

  // Check error message for cancellation keywords
  const errorMessage =
    error instanceof Error
      ? error.message.toLowerCase()
      : 'message' in error && typeof error.message === 'string'
        ? error.message.toLowerCase()
        : '';

  return CANCELLATION_KEYWORDS.some(keyword => errorMessage.includes(keyword));
}
