/**
 * Supabase Helpers Tests
 *
 * Tests database query execution helpers with error handling.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { beforeEach, describe, expect, test, jest } from '@jest/globals';

import { checkAuthentication } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import { executeAuthenticatedQuery, executeQuery } from '@/utils/supabaseHelpers';

// Mock dependencies
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/services/supabase', () => ({
  checkAuthentication: jest.fn(),
}));

const handleErrorMock = jest.mocked(handleError);
const checkAuthenticationMock = jest.mocked(checkAuthentication);

describe('supabaseHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    test('should return data when query succeeds', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await executeQuery(mockQueryFn);

      expect(result).toEqual(mockData);
      expect(mockQueryFn).toHaveBeenCalled();
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    test('should call handleError and throw when query fails', async () => {
      const mockError = { message: 'Database error' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(executeQuery(mockQueryFn)).rejects.toEqual(mockError);

      expect(handleErrorMock).toHaveBeenCalledWith(new Error('Database error'), {});
    });

    test('should pass custom error config to handleError', async () => {
      const mockError = { message: 'Custom error' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      const errorConfig = {
        toastMessage: 'Failed to load data',
        analyticsEventName: 'Data_Load_Error',
        analyticsProperties: { userId: '123' },
        sentrySeverity: 'warning' as const,
        showToast: false,
      };

      await expect(executeQuery(mockQueryFn, errorConfig)).rejects.toEqual(mockError);

      expect(handleErrorMock).toHaveBeenCalledWith(
        new Error('Custom error'),
        expect.objectContaining({
          toastMessage: 'Failed to load data',
          analyticsEventName: 'Data_Load_Error',
          analyticsProperties: { userId: '123' },
          sentrySeverity: 'warning',
          showToast: false,
        }),
      );
    });

    // `showToast: true` / `sentrySeverity: 'error'` are handleError's own
    // defaults (see DEFAULT_OPTIONS, covered in errorHandling.test.ts).
    // executeQuery used to re-apply them on the way past, which meant two
    // places could disagree about what a bare config means; it now forwards the
    // config untouched, so what is worth asserting here is exactly that — no
    // key invented, none dropped.
    test('forwards the error config verbatim, inventing no defaults of its own', async () => {
      const mockError = { message: 'Error' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(executeQuery(mockQueryFn, { toastMessage: 'Nope' })).rejects.toEqual(mockError);

      expect(handleErrorMock).toHaveBeenCalledWith(expect.any(Error), { toastMessage: 'Nope' });
    });

    test('should handle null data without error', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await executeQuery(mockQueryFn);

      expect(result).toBeNull();
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    test('should handle array data', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await executeQuery(mockQueryFn);

      expect(result).toEqual(mockData);
    });
  });

  describe('executeAuthenticatedQuery', () => {
    test('should check authentication before executing query', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      checkAuthenticationMock.mockResolvedValue(undefined);

      const result = await executeAuthenticatedQuery('user-123', mockQueryFn);

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockData);
    });

    test('should throw when authentication check fails', async () => {
      const authError = new Error('Not authenticated');
      checkAuthenticationMock.mockRejectedValue(authError);

      const mockQueryFn = jest.fn();

      await expect(executeAuthenticatedQuery('user-123', mockQueryFn)).rejects.toThrow(
        'Not authenticated',
      );

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-123');
      expect(mockQueryFn).not.toHaveBeenCalled();
    });

    test('should pass error config through to executeQuery', async () => {
      const mockError = { message: 'Query error' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      checkAuthenticationMock.mockResolvedValue(undefined);

      const errorConfig = {
        toastMessage: 'Failed to fetch',
        analyticsEventName: 'Fetch_Error',
      };

      await expect(executeAuthenticatedQuery('user-123', mockQueryFn, errorConfig)).rejects.toEqual(
        mockError,
      );

      expect(handleErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: 'Failed to fetch',
          analyticsEventName: 'Fetch_Error',
        }),
      );
    });

    test('should work with different user IDs', async () => {
      const mockData = { data: 'test' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      checkAuthenticationMock.mockResolvedValue(undefined);

      await executeAuthenticatedQuery('user-456', mockQueryFn);

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-456');

      await executeAuthenticatedQuery('user-789', mockQueryFn);

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-789');
    });
  });
});
