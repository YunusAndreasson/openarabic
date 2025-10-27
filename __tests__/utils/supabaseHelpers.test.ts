import { beforeEach, describe, expect, it, jest } from '@jest/globals';

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

const handleErrorMock = handleError as jest.MockedFunction<typeof handleError>;
const checkAuthenticationMock = checkAuthentication as jest.MockedFunction<
  typeof checkAuthentication
>;

describe('supabaseHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('executeQuery', () => {
    it('should return data when query succeeds', async () => {
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

    it('should call handleError and throw when query fails', async () => {
      const mockError = { message: 'Database error' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(executeQuery(mockQueryFn)).rejects.toEqual(mockError);

      expect(handleErrorMock).toHaveBeenCalledWith(
        new Error('Database error'),
        expect.objectContaining({
          showToast: true,
          sentrySeverity: 'error',
        }),
      );
    });

    it('should pass custom error config to handleError', async () => {
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

    it('should default showToast to true when not specified', async () => {
      const mockError = { message: 'Error' };
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(executeQuery(mockQueryFn, {})).rejects.toEqual(mockError);

      expect(handleErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          showToast: true,
        }),
      );
    });

    it('should handle null data without error', async () => {
      const mockQueryFn = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await executeQuery(mockQueryFn);

      expect(result).toBeNull();
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    it('should handle array data', async () => {
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
    it('should check authentication before executing query', async () => {
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

    it('should throw when authentication check fails', async () => {
      const authError = new Error('Not authenticated');
      checkAuthenticationMock.mockRejectedValue(authError);

      const mockQueryFn = jest.fn();

      await expect(executeAuthenticatedQuery('user-123', mockQueryFn)).rejects.toThrow(
        'Not authenticated',
      );

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-123');
      expect(mockQueryFn).not.toHaveBeenCalled();
    });

    it('should pass error config through to executeQuery', async () => {
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

    it('should work with different user IDs', async () => {
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
