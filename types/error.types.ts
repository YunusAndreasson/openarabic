/**
 * Error codes for different types of errors
 */
export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'DATABASE_ERROR'
  | 'AUTH_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

/**
 * Simple error interface for application errors
 */
export interface AppError {
  message: string;
  code: ErrorCode;
  timestamp?: string;
  details?: Record<string, unknown>;
}

/**
 * Creates a standardized error object
 */
export function createError(
  message: string,
  code: ErrorCode,
  details?: Record<string, unknown>
): AppError {
  return {
    message,
    code,
    timestamp: new Date().toISOString(),
    details,
  };
}

/**
 * Converts any error into a standardized AppError
 */
export function handleError(error: unknown): AppError {
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as AppError;
  }

  if (error instanceof Error) {
    return createError(error.message, 'UNKNOWN_ERROR', {
      originalError: error.name,
    });
  }

  return createError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    'UNKNOWN_ERROR',
    { originalError: error }
  );
}
