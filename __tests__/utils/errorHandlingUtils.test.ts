/**
 * Error Handling Utils Tests
 *
 * Tests error handling utility wrappers.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports (already present)
 */

import { beforeEach, describe, expect, test, jest } from '@jest/globals';

import { handleError } from '@/utils/errorHandling';
import { withErrorHandling, withErrorHandlingDefault } from '@/utils/errorHandlingUtils';

// Mock the error handling module
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const handleErrorMock = jest.mocked(handleError);

describe('errorHandlingUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withErrorHandling', () => {
    test('should call the wrapped function and return the result on success', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(successFn);

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    test('should call handleError and re-throw when the wrapped function fails', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(failFn);

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(handleErrorMock).toHaveBeenCalledWith(error, {});
    });

    test('should pass error options to handleError', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const errorOptions = {
        toastMessage: 'Custom error message',
        analyticsEventName: 'Custom_Error',
      };
      const wrapped = withErrorHandling(failFn, errorOptions);

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(handleErrorMock).toHaveBeenCalledWith(error, errorOptions);
    });
  });

  describe('withErrorHandlingDefault', () => {
    test('should call the wrapped function and return the result on success', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandlingDefault(successFn, 'default');

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    test('should return default value when the wrapped function fails', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandlingDefault(failFn, 'default-value');

      const result = await wrapped();

      expect(result).toBe('default-value');
      expect(handleErrorMock).toHaveBeenCalledWith(error, {});
    });

    test('should pass error options to handleError and return default', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const errorOptions = {
        toastMessage: 'Custom error message',
        showToast: false,
      };
      const wrapped = withErrorHandlingDefault(failFn, 42, errorOptions);

      const result = await wrapped();

      expect(result).toBe(42);
      expect(handleErrorMock).toHaveBeenCalledWith(error, errorOptions);
    });

    test('should not re-throw error (unlike withErrorHandling)', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandlingDefault(failFn, 'fallback');

      // Should NOT throw - should return default value instead
      const result = await wrapped();
      expect(result).toBe('fallback');
    });
  });
});
