import { handleError } from './errorHandling';

/**
 * Higher-order function that wraps an async function with consistent error handling
 * @param fn - The async function to wrap
 * @param errorOptions - Options for error handling
 * @returns A wrapped function with error handling
 */
export const withErrorHandling = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  errorOptions: Parameters<typeof handleError>[1] = {}
) => {
  return async (...args: TArgs): Promise<TReturn | undefined> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error as Error, errorOptions);
      throw error; // Re-throw to allow caller to handle if needed
    }
  };
};

/**
 * Higher-order function that wraps an async function with error handling but returns a default value on error
 * @param fn - The async function to wrap
 * @param defaultValue - The default value to return on error
 * @param errorOptions - Options for error handling
 * @returns A wrapped function that returns default value on error
 */
export const withErrorHandlingDefault = <TArgs extends unknown[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  defaultValue: TReturn,
  errorOptions: Parameters<typeof handleError>[1] = {}
) => {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error as Error, errorOptions);
      return defaultValue;
    }
  };
};

/**
 * Creates a standardized error handler for common operations
 * @param operationName - Name of the operation for analytics
 * @param customToastMessage - Custom toast message (optional)
 * @returns Error handling function
 */
export const createErrorHandler = (operationName: string, customToastMessage?: string) => {
  return async (error: Error) => {
    await handleError(error, {
      analyticsEventName: operationName,
      toastMessage: customToastMessage,
    });
  };
};
