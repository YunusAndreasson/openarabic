/**
 * Supabase Helpers Tests
 *
 * Tests database query execution helpers with error handling.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ @jest/globals explicit imports
 */

import { beforeEach, describe, expect, test, jest } from '@jest/globals';
import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

import { checkAuthentication } from '@/services/supabase';
import { handleError } from '@/utils/errorHandling';
import {
  executeAuthenticatedQuery,
  executeQuery,
  SupabaseRequestError,
} from '@/utils/supabaseHelpers';
import {
  createPostgrestErrorMock,
  createSessionMock,
  createUserMock,
} from '@/__tests__/helpers/serviceMocks';

// Mock dependencies
jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('@/services/supabase', () => ({
  checkAuthentication: jest.fn(),
}));

const handleErrorMock = jest.mocked(handleError);
const checkAuthenticationMock = jest.mocked(checkAuthentication);

/** A successful supabase-js response, shaped exactly as the client resolves one. */
function ok<T>(data: T): PostgrestSingleResponse<T> {
  return { data, error: null, count: null, status: 200, statusText: 'OK', success: true };
}

/** A failed supabase-js response: the error object, with the status beside it. */
function failed(error: PostgrestError, status = 400): PostgrestSingleResponse<never> {
  return { data: null, error, count: null, status, statusText: '', success: false };
}

describe('supabaseHelpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SupabaseRequestError', () => {
    test('keeps the PostgREST fields and the HTTP status on a real Error', () => {
      const error = new SupabaseRequestError(
        createPostgrestErrorMock('permission denied', {
          code: '42501',
          details: 'RLS',
          hint: 'GRANT …',
        }),
        403,
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('permission denied');
      expect(error.status).toBe(403);
      expect(error.code).toBe('42501');
      expect(error.details).toBe('RLS');
      expect(error.hint).toBe('GRANT …');
    });

    // Sentry groups by exception type; these were always reported as `Error`.
    test('keeps Error as its name so existing Sentry issues keep grouping', () => {
      const error = new SupabaseRequestError(createPostgrestErrorMock('x'), 500);
      expect(error.name).toBe('Error');
    });
  });

  describe('executeQuery', () => {
    test('should return data when query succeeds', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockQueryFn = jest.fn(async () => ok(mockData));

      const result = await executeQuery(mockQueryFn);

      expect(result).toEqual(mockData);
      expect(mockQueryFn).toHaveBeenCalled();
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    test('throws a SupabaseRequestError carrying the response status', async () => {
      const mockQueryFn = jest.fn(async () =>
        failed(createPostgrestErrorMock('Database error', { code: 'PGRST116' }), 406),
      );

      const thrown = await executeQuery(mockQueryFn).catch((error: unknown) => error);

      expect(thrown).toBeInstanceOf(SupabaseRequestError);
      expect(thrown).toMatchObject({ message: 'Database error', status: 406, code: 'PGRST116' });
    });

    test('reports the same error it throws, with the config', async () => {
      const mockQueryFn = jest.fn(async () => failed(createPostgrestErrorMock('Database error')));

      const thrown = await executeQuery(mockQueryFn).catch((error: unknown) => error);

      expect(handleErrorMock).toHaveBeenCalledTimes(1);
      expect(handleErrorMock).toHaveBeenCalledWith(thrown, {});
    });

    test('should pass custom error config to handleError', async () => {
      const mockQueryFn = jest.fn(async () => failed(createPostgrestErrorMock('Custom error')));

      const errorConfig = {
        toastMessage: 'Failed to load data',
        analyticsEventName: 'Data_Load_Error',
        analyticsProperties: { userId: '123' },
        sentrySeverity: 'warning' as const,
        showToast: false,
      };

      await expect(executeQuery(mockQueryFn, errorConfig)).rejects.toThrow('Custom error');

      expect(handleErrorMock).toHaveBeenCalledWith(
        expect.any(SupabaseRequestError),
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
      const mockQueryFn = jest.fn(async () => failed(createPostgrestErrorMock('Error')));

      await expect(executeQuery(mockQueryFn, { toastMessage: 'Nope' })).rejects.toThrow('Error');

      expect(handleErrorMock).toHaveBeenCalledWith(expect.any(Error), { toastMessage: 'Nope' });
    });

    test('should handle null data without error', async () => {
      const mockQueryFn = jest.fn(async () => ok(null));

      const result = await executeQuery(mockQueryFn);

      expect(result).toBeNull();
      expect(handleErrorMock).not.toHaveBeenCalled();
    });

    test('should handle array data', async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const mockQueryFn = jest.fn(async () => ok(mockData));

      const result = await executeQuery(mockQueryFn);

      expect(result).toEqual(mockData);
    });
  });

  describe('executeAuthenticatedQuery', () => {
    test('should check authentication before executing query', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockQueryFn = jest.fn(async () => ok(mockData));

      checkAuthenticationMock.mockResolvedValue({
        session: createSessionMock(),
        user: createUserMock(),
      });

      const result = await executeAuthenticatedQuery('user-123', mockQueryFn);

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockData);
    });

    test('should throw when authentication check fails', async () => {
      const authError = new Error('Not authenticated');
      checkAuthenticationMock.mockRejectedValue(authError);

      const mockQueryFn = jest.fn(async () => ok(null));

      await expect(executeAuthenticatedQuery('user-123', mockQueryFn)).rejects.toThrow(
        'Not authenticated',
      );

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-123');
      expect(mockQueryFn).not.toHaveBeenCalled();
    });

    test('should pass error config through to executeQuery', async () => {
      const mockQueryFn = jest.fn(async () => failed(createPostgrestErrorMock('Query error')));

      checkAuthenticationMock.mockResolvedValue({
        session: createSessionMock(),
        user: createUserMock(),
      });

      const errorConfig = {
        toastMessage: 'Failed to fetch',
        analyticsEventName: 'Fetch_Error',
      };

      await expect(
        executeAuthenticatedQuery('user-123', mockQueryFn, errorConfig),
      ).rejects.toBeInstanceOf(SupabaseRequestError);

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
      const mockQueryFn = jest.fn(async () => ok(mockData));

      checkAuthenticationMock.mockResolvedValue({
        session: createSessionMock(),
        user: createUserMock(),
      });

      await executeAuthenticatedQuery('user-456', mockQueryFn);

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-456');

      await executeAuthenticatedQuery('user-789', mockQueryFn);

      expect(checkAuthenticationMock).toHaveBeenCalledWith('user-789');
    });
  });
});
