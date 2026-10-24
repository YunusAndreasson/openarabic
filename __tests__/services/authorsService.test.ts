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

/** select → eq → order, resolving to `response`. */
const createAuthorsBuilder = (response: unknown) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn(async (..._args: unknown[]) => response),
  };
  return builder;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authorsService', () => {
  describe('getUniqueAuthors', () => {
    // One request: the empty `articles!inner()` embed keeps only authors with a
    // published article and adds no column. It replaced a second request that
    // read every published article's author_id — capped at 1000 rows.
    test('asks for authors with a published article, by name, in one request', async () => {
      const authors = [
        { id: 1, name: 'Ali' },
        { id: 3, name: 'Omar' },
      ];
      const builder = createAuthorsBuilder({ data: authors, error: null });
      fromMock.mockReturnValue(builder);

      const result = await authorsService.getUniqueAuthors();

      expect(fromMock).toHaveBeenCalledTimes(1);
      expect(fromMock).toHaveBeenCalledWith('authors');
      expect(builder.select).toHaveBeenCalledWith('id, name, articles!inner()');
      expect(builder.eq).toHaveBeenCalledWith('articles.published', true);
      expect(builder.order).toHaveBeenCalledWith('name', { ascending: true });
      expect(result).toEqual(authors);
      expect(mockHandleError).not.toHaveBeenCalled();
    });

    test('returns empty array when no authors exist', async () => {
      fromMock.mockReturnValue(createAuthorsBuilder({ data: [], error: null }));

      const result = await authorsService.getUniqueAuthors();

      expect(result).toEqual([]);
    });

    test('reports a failure with the authors toast', async () => {
      fromMock.mockReturnValue(
        createAuthorsBuilder({
          data: null,
          error: { message: 'boom', code: '', details: '', hint: '' },
          status: 500,
        }),
      );

      await expect(authorsService.getUniqueAuthors()).rejects.toThrow('boom');
      expect(mockHandleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ analyticsEventName: 'Authors_Load_Error' }),
      );
    });
  });
});
