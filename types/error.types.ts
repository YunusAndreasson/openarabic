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
 * Base error details interface
 */
export interface ErrorDetails {
  timestamp?: string;
  path?: string;
  operation?: string;
  [key: string]: unknown;
}

/**
 * Base application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'AppError';
    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Network-related errors (e.g., API calls, connectivity issues)
 */
export class NetworkError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'NETWORK_ERROR', {
      timestamp: new Date().toISOString(),
      ...details,
    });
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Database-related errors (e.g., query failures, connection issues)
 */
export class DatabaseError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'DATABASE_ERROR', {
      timestamp: new Date().toISOString(),
      ...details,
    });
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }
}

/**
 * Authentication-related errors (e.g., login failures, token issues)
 */
export class AuthenticationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'AUTH_ERROR', {
      timestamp: new Date().toISOString(),
      ...details,
    });
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Validation-related errors (e.g., form validation, data validation)
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetails) {
    super(message, 'VALIDATION_ERROR', {
      timestamp: new Date().toISOString(),
      ...details,
    });
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Type guard to check if an error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Type guard to check if an error is a NetworkError
 */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/**
 * Type guard to check if an error is a DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * Type guard to check if an error is an AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof AuthenticationError;
}

/**
 * Type guard to check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Converts any error into an AppError
 */
export function handleError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(error.message, 'UNKNOWN_ERROR', {
      timestamp: new Date().toISOString(),
      originalError: error,
    });
  }

  return new AppError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    'UNKNOWN_ERROR',
    {
      timestamp: new Date().toISOString(),
      originalError: error,
    }
  );
}
