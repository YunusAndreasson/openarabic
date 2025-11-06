import { bookmarkService } from '../../services/bookmark';
import { checkAuthentication, supabase } from '../../services/supabase';
import { handleError } from '../../utils/errorHandling';

type FromReturn = {
  upsert?: jest.Mock;
  delete?: jest.Mock<unknown, any> & { error?: any };
  select?: jest.Mock;
  eq?: jest.Mock & { error?: any; data?: any };
  order?: jest.Mock;
  single?: jest.Mock;
  maybeSingle?: jest.Mock;
  error?: any;
  data?: any;
};

jest.mock('../../services/supabase', () => ({
  supabase: { from: jest.fn() },
  checkAuthentication: jest.fn(),
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

const fromMock = supabase.from as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('bookmarkService', () => {
  describe('addToReadingList', () => {
    it('upserts the article', async () => {
      const upsert = jest.fn().mockResolvedValue({ error: null });
      fromMock.mockReturnValue({ upsert } as FromReturn);

      await bookmarkService.addToReadingList('u1', 10);

      expect(checkAuthentication).toHaveBeenCalledWith('u1');
      expect(fromMock).toHaveBeenCalledWith('reading_list');
      expect(upsert).toHaveBeenCalledWith(
        { user_id: 'u1', article_id: 10 },
        { onConflict: 'user_id,article_id' },
      );
    });

    it('avoids duplicate entries when called twice', async () => {
      const data: Array<{ user_id: string; article_id: number }> = [];
      const upsert = jest.fn(async ({ user_id, article_id }) => {
        if (!data.find(d => d.user_id === user_id && d.article_id === article_id)) {
          data.push({ user_id, article_id });
        }
        return { error: null };
      });
      const upsertBuilder = { upsert } as FromReturn;

      const listQuery: FromReturn = {} as FromReturn;
      listQuery.select = jest.fn(() => listQuery);
      listQuery.eq = jest.fn(() => listQuery) as any;
      listQuery.order = jest.fn(() => ({ data, error: null }));

      fromMock
        .mockReturnValueOnce(upsertBuilder)
        .mockReturnValueOnce(upsertBuilder)
        .mockReturnValue(listQuery);

      await bookmarkService.addToReadingList('u1', 7);
      await bookmarkService.addToReadingList('u1', 7);
      const list = await bookmarkService.getReadingList('u1');

      expect(list).toHaveLength(1);
      expect(list[0]).toEqual(expect.objectContaining({ user_id: 'u1', article_id: 7 }));
    });

    it('handles errors from supabase', async () => {
      const error = new Error('fail');
      const upsert = jest.fn().mockResolvedValue({ error });
      fromMock.mockReturnValue({ upsert } as FromReturn);

      await expect(bookmarkService.addToReadingList('u1', 5)).rejects.toThrow(error);

      expect(handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ analyticsProperties: { articleId: 5 } }),
      );
    });
  });

  describe('removeFromReadingList', () => {
    it('deletes the entry', async () => {
      const query: FromReturn = {} as FromReturn;
      query.delete = jest.fn(() => query);
      query.eq = jest.fn(() => query) as any;
      query.error = null;
      fromMock.mockReturnValue(query);

      await bookmarkService.removeFromReadingList('u1', 11);

      expect(fromMock).toHaveBeenCalledWith('reading_list');
      expect(query.delete).toHaveBeenCalled();
      expect(query.eq).toHaveBeenCalledWith('user_id', 'u1');
      expect(query.eq).toHaveBeenCalledWith('article_id', 11);
    });
  });

  describe('isInReadingList', () => {
    it('returns true when data exists', async () => {
      const query: FromReturn = {} as FromReturn;
      query.select = jest.fn(() => query);
      query.eq = jest.fn(() => query) as any;
      query.maybeSingle = jest.fn(() => ({ data: { article_id: 1 }, error: null }));
      fromMock.mockReturnValue(query);

      const result = await bookmarkService.isInReadingList('u1', 1);
      expect(result).toBe(true);
      expect(query.select).toHaveBeenCalledWith('article_id');
    });

    it('returns false when no data', async () => {
      const query: FromReturn = {} as FromReturn;
      query.select = jest.fn(() => query);
      query.eq = jest.fn(() => query) as any;
      query.maybeSingle = jest.fn(() => ({ data: null, error: null }));
      fromMock.mockReturnValue(query);

      const result = await bookmarkService.isInReadingList('u1', 2);
      expect(result).toBe(false);
    });
  });

  describe('getReadingList', () => {
    it('fetches articles with select query', async () => {
      const query: FromReturn = {} as FromReturn;
      query.select = jest.fn(() => query);
      query.eq = jest.fn(() => query) as any;
      query.order = jest.fn(() => ({ data: [], error: null }));
      fromMock.mockReturnValue(query);

      await bookmarkService.getReadingList('u1');

      const called = query.select.mock.calls[0][0].replace(/\s/g, '');
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
    it('calls handleError when removal fails', async () => {
      const error = new Error('bad');
      const query: FromReturn = {} as FromReturn;
      query.delete = jest.fn(() => query);
      query.eq = jest.fn(() => query) as any;
      query.error = error;
      fromMock.mockReturnValue(query);

      await expect(bookmarkService.removeFromReadingList('u1', 5)).rejects.toThrow(error);

      expect(handleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({ toastMessage: "Couldn't remove article. Try again" }),
      );
    });
  });
});
