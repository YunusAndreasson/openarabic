/**
 * Bookmark Service Tests
 *
 * Tests the bookmark/reading list service which handles saved articles.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

import { bookmarkService } from '../../services/bookmark';
import { checkAuthentication, supabase } from '../../services/supabase';
import { handleError } from '../../utils/errorHandling';
import { articleId } from '@/__tests__/helpers/ids';

/**
 * The slice of PostgREST's query builder these tests stub. `supabase.from`
 * returns a `PostgrestQueryBuilder`, so a stub has to be cast on the way in —
 * `asBuilder` is that cast, written once instead of at every call site.
 */
type FromReturn = {
  upsert?: jest.Mock<(...args: unknown[]) => unknown>;
  delete?: jest.Mock<(...args: unknown[]) => unknown> & { error?: unknown };
  select?: jest.Mock<(...args: unknown[]) => unknown>;
  eq?: jest.Mock<(...args: unknown[]) => unknown> & { error?: unknown; data?: unknown };
  order?: jest.Mock<(...args: unknown[]) => unknown>;
  single?: jest.Mock<(...args: unknown[]) => unknown>;
  maybeSingle?: jest.Mock<(...args: unknown[]) => unknown>;
  error?: unknown;
  data?: unknown;
};

const asBuilder = (stub: FromReturn) => stub as unknown as ReturnType<typeof supabase.from>;

jest.mock('../../services/supabase', () => ({
  supabase: { from: jest.fn() },
  checkAuthentication: jest.fn(),
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const fromMock = jest.mocked(supabase.from);
const mockCheckAuthentication = jest.mocked(checkAuthentication);
const mockHandleError = jest.mocked(handleError);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bookmarkService', () => {
  describe('addToReadingList', () => {
    test('upserts the article', async () => {
      const upsert = jest.fn(async (..._args: unknown[]) => ({ error: null }));
      fromMock.mockReturnValue(asBuilder({ upsert }));

      await bookmarkService.addToReadingList('u1', articleId(10));

      expect(mockCheckAuthentication).toHaveBeenCalledWith('u1');
      expect(fromMock).toHaveBeenCalledWith('reading_list');
      expect(upsert).toHaveBeenCalledWith(
        { user_id: 'u1', article_id: 10 },
        { onConflict: 'user_id,article_id' },
      );
    });

    test('avoids duplicate entries when called twice', async () => {
      const data: Array<{ user_id: string; article_id: number }> = [];
      const upsert = jest.fn(async ({ user_id, article_id }) => {
        if (!data.find(d => d.user_id === user_id && d.article_id === article_id)) {
          data.push({ user_id, article_id });
        }
        return { error: null };
      });
      const upsertBuilder = { upsert } as FromReturn;

      const listQuery: FromReturn = {} as FromReturn;
      listQuery.select = jest.fn((..._args: unknown[]) => listQuery);
      listQuery.eq = jest.fn((..._args: unknown[]) => listQuery) as any;
      listQuery.order = jest.fn((..._args: unknown[]) => ({ data, error: null }));

      fromMock
        .mockReturnValueOnce(asBuilder(upsertBuilder))
        .mockReturnValueOnce(asBuilder(upsertBuilder))
        .mockReturnValue(asBuilder(listQuery));

      await bookmarkService.addToReadingList('u1', articleId(7));
      await bookmarkService.addToReadingList('u1', articleId(7));
      const list = await bookmarkService.getReadingList('u1');

      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(expect.objectContaining({ user_id: 'u1', article_id: 7 }));
    });

    test('handles errors from supabase', async () => {
      const error = new Error('fail');
      const upsert = jest.fn(async (..._args: unknown[]) => ({ error }));
      fromMock.mockReturnValue(asBuilder({ upsert }));

      await expect(bookmarkService.addToReadingList('u1', articleId(5))).rejects.toThrow(error);

      expect(mockHandleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ analyticsProperties: { articleId: 5 } }),
      );
    });
  });

  describe('removeFromReadingList', () => {
    test('deletes the entry', async () => {
      const query: FromReturn = {} as FromReturn;
      query.delete = jest.fn((..._args: unknown[]) => query);
      query.eq = jest.fn((..._args: unknown[]) => query) as any;
      query.error = null;
      fromMock.mockReturnValue(asBuilder(query));

      await bookmarkService.removeFromReadingList('u1', articleId(11));

      expect(fromMock).toHaveBeenCalledWith('reading_list');
      expect(query.delete).toHaveBeenCalled();
      expect(query.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(query.eq).toHaveBeenCalledWith('article_id', 11);
    });
  });

  describe('isInReadingList', () => {
    test('returns true when data exists', async () => {
      const query: FromReturn = {} as FromReturn;
      query.select = jest.fn((..._args: unknown[]) => query);
      query.eq = jest.fn((..._args: unknown[]) => query) as any;
      query.maybeSingle = jest.fn((..._args: unknown[]) => ({
        data: { article_id: 1 },
        error: null,
      }));
      fromMock.mockReturnValue(asBuilder(query));

      const result = await bookmarkService.isInReadingList('u1', articleId(1));
      expect(result).toBeTruthy();
      expect(query.select).toHaveBeenCalledWith('article_id');
    });

    test('returns false when no data', async () => {
      const query: FromReturn = {} as FromReturn;
      query.select = jest.fn((..._args: unknown[]) => query);
      query.eq = jest.fn((..._args: unknown[]) => query) as any;
      query.maybeSingle = jest.fn((..._args: unknown[]) => ({ data: null, error: null }));
      fromMock.mockReturnValue(asBuilder(query));

      const result = await bookmarkService.isInReadingList('u1', articleId(2));
      expect(result).toBeFalsy();
    });
  });

  describe('getReadingList', () => {
    test('fetches articles with select query', async () => {
      const query: FromReturn = {} as FromReturn;
      query.select = jest.fn((..._args: unknown[]) => query);
      query.eq = jest.fn((..._args: unknown[]) => query) as any;
      query.order = jest.fn((..._args: unknown[]) => ({ data: [], error: null }));
      fromMock.mockReturnValue(asBuilder(query));

      await bookmarkService.getReadingList('u1');

      const called = String(query.select.mock.calls[0][0]).replace(/\s/g, '');
      const expected = `
        user_id,
        article_id,
        added_at,
        articles!inner (
          id,
          title,
          author_id,
          category_id,
          content_hash,
          audio_url,
          audio_url_bilingual,
          image_url,
          summary,
          difficulty_level,
          created_at,
          category:categories(id, name),
          author:authors(id, name),
          article_sentences(id)
        )
      `.replace(/\s/g, '');
      expect(called).toBe(expected);
      expect(query.order).toHaveBeenCalledWith('added_at', { ascending: false });
    });
  });

  describe('error handling', () => {
    test('calls handleError when removal fails', async () => {
      const error = new Error('bad');
      const query: FromReturn = {} as FromReturn;
      query.delete = jest.fn((..._args: unknown[]) => query);
      query.eq = jest.fn((..._args: unknown[]) => query) as any;
      query.error = error;
      fromMock.mockReturnValue(asBuilder(query));

      await expect(bookmarkService.removeFromReadingList('u1', articleId(5))).rejects.toThrow(
        error,
      );

      expect(mockHandleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ toastMessage: "Couldn't remove from playlist. Try again" }),
      );
    });
  });
});
