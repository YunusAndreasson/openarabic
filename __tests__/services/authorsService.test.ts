/**
 * Authors Service Tests
 *
 * Tests the authors service which handles author data retrieval.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
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
  describe('getUniqueAuthors', () => {
    test('returns authors that have published articles', async () => {
      const allAuthors = [
        { id: 1, name: 'Ali' },
        { id: 2, name: 'Bilal' },
        { id: 3, name: 'Omar' },
      ];
      const articleAuthors = [{ author_id: 1 }, { author_id: 3 }];

      // Mock first call for authors table
      const authorsBuilder: any = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: allAuthors, error: null }),
      };

      // Mock second call for articles table
      const articlesBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: articleAuthors, error: null }),
      };

      fromMock.mockReturnValueOnce(authorsBuilder).mockReturnValueOnce(articlesBuilder);

      const result = await authorsService.getUniqueAuthors();

      expect(fromMock).toHaveBeenCalledWith('authors');
      expect(fromMock).toHaveBeenCalledWith('articles');
      // Should only return authors with articles (ids 1 and 3)
      expect(result).toEqual([
        { id: 1, name: 'Ali' },
        { id: 3, name: 'Omar' },
      ]);
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('returns empty array when no authors exist', async () => {
      const authorsBuilder: any = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      const articlesBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      fromMock.mockReturnValueOnce(authorsBuilder).mockReturnValueOnce(articlesBuilder);

      const result = await authorsService.getUniqueAuthors();

      expect(result).toEqual([]);
    });
  });
});
