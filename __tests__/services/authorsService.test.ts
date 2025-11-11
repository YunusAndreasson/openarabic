/**
 * Authors Service Tests
 *
 * Tests the authors service which handles author data retrieval.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

import { authorsService } from '../../services/authors';
import { handleError } from '../../utils/errorHandling';
import { supabase } from '../../services/supabase';

jest.mock('../../services/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const fromMock = jest.mocked(supabase.from);
const mockHandleError = jest.mocked(handleError);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authorsService', () => {
  describe('getAuthors', () => {
    test('returns authors ordered by name', async () => {
      const authors = [
        { id: 1, name: 'Ali' },
        { id: 2, name: 'Bilal' },
      ];
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({ data: authors, error: null }),
      };
      fromMock.mockReturnValue(builder);

      const result = await authorsService.getAuthors();

      expect(fromMock).toHaveBeenCalledWith('authors');
      expect(builder.select).toHaveBeenCalledWith('id, name');
      expect(builder.order).toHaveBeenCalledWith('name');
      const sorted = [...authors].sort((a, b) => a.name.localeCompare(b.name));
      expect(result).toEqual(sorted);
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('handles errors from supabase', async () => {
      const error = new Error('fail');
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({ data: null, error }),
      };
      fromMock.mockReturnValue(builder);

      await expect(authorsService.getAuthors()).rejects.toThrow(error);
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: "Couldn't load authors. Try again",
          analyticsEventName: 'Authors_Load_Error',
          showToast: true,
          sentrySeverity: 'error',
        }),
      );
    });
  });

  describe('getAuthorsByCategory', () => {
    test('maps and sorts returned authors', async () => {
      const rows = [{ author: { id: 2, name: 'Zayd' } }, { author: { id: 1, name: 'Ali' } }];
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({ data: rows, error: null }),
      };
      fromMock.mockReturnValue(builder);

      const result = await authorsService.getAuthorsByCategory(5);

      expect(fromMock).toHaveBeenCalledWith('articles');
      expect(builder.select).toHaveBeenCalledWith('author:authors!inner(id, name)');
      expect(builder.eq).toHaveBeenCalledWith('category_id', 5);
      expect(builder.order).toHaveBeenCalledWith('name', { foreignTable: 'author' });
      expect(result).toEqual([
        { id: 1, name: 'Ali' },
        { id: 2, name: 'Zayd' },
      ]);
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('handles errors from supabase', async () => {
      const error = new Error('oops');
      const builder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        returns: jest.fn().mockResolvedValue({ data: null, error }),
      };
      fromMock.mockReturnValue(builder);

      await expect(authorsService.getAuthorsByCategory(4)).rejects.toThrow(error);

      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: "Couldn't load authors. Try again",
          analyticsEventName: 'Authors_By_Category_Load_Error',
          analyticsProperties: { categoryId: 4 },
          showToast: true,
          sentrySeverity: 'error',
        }),
      );
    });
  });
});
