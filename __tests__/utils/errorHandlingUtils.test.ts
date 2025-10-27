import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { handleError } from '@/utils/errorHandling';
import { withErrorHandling, withErrorHandlingDefault } from '@/utils/errorHandlingUtils';

// Mock the error handling module
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const handleErrorMock = handleError as jest.MockedFunction<typeof handleError>;

describe('errorHandlingUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('withErrorHandling', () => {
    it('should call the wrapped function and return the result on success', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(successFn);

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    it('should call handleError and re-throw when the wrapped function fails', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(failFn);

      await expect(wrapped()).rejects.toThrow('Test error');
      expect(handleErrorMock).toHaveBeenCalledWith(error, {});
    });

    it('should pass error options to handleError', async () => {
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
    it('should call the wrapped function and return the result on success', async () => {
      const successFn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandlingDefault(successFn, 'default');

      const result = await wrapped('arg1', 'arg2');

      expect(result).toBe('success');
      expect(successFn).toHaveBeenCalledWith('arg1', 'arg2');
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    it('should return default value when the wrapped function fails', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandlingDefault(failFn, 'default-value');

      const result = await wrapped();

      expect(result).toBe('default-value');
      expect(handleErrorMock).toHaveBeenCalledWith(error, {});
    });

    it('should pass error options to handleError and return default', async () => {
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

    it('should not re-throw error (unlike withErrorHandling)', async () => {
      const error = new Error('Test error');
      const failFn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorHandlingDefault(failFn, 'fallback');

      // Should NOT throw - should return default value instead
      const result = await wrapped();
      expect(result).toBe('fallback');
    });
  });
});
