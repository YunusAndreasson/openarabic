import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { articlesService } from '../../services/articles';
import { supabase } from '../../services/supabase';
import { handleError } from '../../utils/errorHandling';
import { mapToArticle, mapToArticles } from '../../utils/typeMappers';

jest.mock('../../services/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../utils/errorHandling', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../utils/typeMappers', () => ({
  mapToArticles: jest.fn(),
  mapToArticle: jest.fn(),
}));

const fromMock = supabase.from as jest.Mock;

const createThenBuilder = (response: any) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    returns: jest.fn().mockReturnThis(),
    then: jest.fn((resolve: any) => resolve(response)),
  };
  return builder;
};

const createFinalBuilder = (response: any) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    returns: jest.fn().mockResolvedValue(response),
  };
  return builder;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('articlesService', () => {
  describe('getArticles', () => {
    it('applies filters, sorting, pagination and maps data', async () => {
      const response = { data: [{ id: 1 }], error: null };
      const builder = createThenBuilder(response);
      fromMock.mockReturnValue(builder);
      (mapToArticles as jest.Mock).mockReturnValue(['mapped']);

      const result = await articlesService.getArticles({
        categoryId: 2,
        authorId: 3,
        limit: 5,
        offset: 10,
        minDifficulty: 1,
        maxDifficulty: 4,
        sortBy: 'title',
        sortOrder: 'asc',
      });

      expect(fromMock).toHaveBeenCalledWith('articles');
      const calledColumns = builder.select.mock.calls[0][0].replace(/\s/g, '');
      const expected = `
        id,
        title,
        image_url,
        created_at,
        difficulty_level,
        category_id,
        author_id,
        summary,
        audio_url,
        audio_url_bilingual,
        category:categories!inner(id,name),
        author:authors!inner(id,name),
        article_sentences(id)
      `.replace(/\s/g, '');
      expect(calledColumns).toBe(expected);
      expect(builder.eq).toHaveBeenCalledWith('category_id', 2);
      expect(builder.eq).toHaveBeenCalledWith('author_id', 3);
      expect(builder.gte).toHaveBeenCalledWith('difficulty_level', 1);
      expect(builder.lte).toHaveBeenCalledWith('difficulty_level', 4);
      expect(builder.order).toHaveBeenCalledWith('title', { ascending: true });
      expect(builder.range).toHaveBeenCalledWith(10, 14);
      expect(mapToArticles).toHaveBeenCalledWith(response.data);
      expect(result).toEqual(['mapped']);
    });

    it('uses word stats columns when includeWordStats is true', async () => {
      const builder = createThenBuilder({ data: [], error: null });
      fromMock.mockReturnValue(builder);

      await articlesService.getArticles({ includeWordStats: true });

      const called = builder.select.mock.calls[0][0].replace(/\s/g, '');
      const expected = `
        id,
        title,
        image_url,
        created_at,
        difficulty_level,
        category_id,
        author_id,
        summary,
        audio_url,
        audio_url_bilingual,
        category:categories!inner(id,name),
        author:authors!inner(id,name),
        article_sentences(
          id,
          sentence_words(
            id,
            root_id
          )
        )
      `.replace(/\s/g, '');
      expect(called).toBe(expected);
    });

    it('handles errors from supabase', async () => {
      const err = new Error('fail');
      const builder = createThenBuilder({ data: null, error: err });
      fromMock.mockReturnValue(builder);

      await expect(articlesService.getArticles({ authorId: 5 })).rejects.toThrow(err);
      expect(handleError).toHaveBeenCalledWith(
        err,
        expect.objectContaining({
          toastMessage: "Couldn't load articles. Try again",
          analyticsProperties: expect.objectContaining({ authorId: 5 }),
        }),
      );
    });
  });

  describe('getArticlesWithWordStats', () => {
    it('queries supabase and maps data', async () => {
      const response = { data: [{ id: 1 }], error: null };
      const builder = createThenBuilder(response);
      fromMock.mockReturnValue(builder);
      (mapToArticles as jest.Mock).mockReturnValue(['mapped']);

      const result = await articlesService.getArticlesWithWordStats();

      expect(fromMock).toHaveBeenCalledWith('articles');
      const called = builder.select.mock.calls[0][0].replace(/\s/g, '');
      const expected = `
        id,
        title,
        image_url,
        created_at,
        difficulty_level,
        category_id,
        author_id,
        summary,
        audio_url,
        audio_url_bilingual,
        category:categories!inner(id,name),
        author:authors!inner(id,name),
        article_sentences(
          id,
          sentence_words(
            id,
            root_id
          )
        )
      `.replace(/\s/g, '');
      expect(called).toBe(expected);
      expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(mapToArticles).toHaveBeenCalledWith(response.data);
      expect(result).toEqual(['mapped']);
    });

    it('handles errors', async () => {
      const err = new Error('bad');
      const builder = createThenBuilder({ data: null, error: err });
      fromMock.mockReturnValue(builder);

      await expect(articlesService.getArticlesWithWordStats()).rejects.toThrow(err);
      expect(handleError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          toastMessage: "Couldn't load articles. Try again",
          analyticsEventName: 'Articles_With_Stats_Load_Error',
          showToast: true,
          sentrySeverity: 'error',
        }),
      );
    });
  });

  describe('getArticleById', () => {
    it('retrieves single article and maps data', async () => {
      const response = { data: { id: 1 }, error: null };
      const builder = createFinalBuilder(response);
      fromMock.mockReturnValue(builder);
      (mapToArticle as jest.Mock).mockReturnValue('mapped');

      const result = await articlesService.getArticleById(7);

      expect(fromMock).toHaveBeenCalledWith('articles');
      const called = builder.select.mock.calls[0][0];
      expect(called).toContain('article_sentences');
      expect(builder.eq).toHaveBeenCalledWith('id', 7);
      expect(mapToArticle).toHaveBeenCalledWith(response.data);
      expect(result).toBe('mapped');
    });

    it('handles errors', async () => {
      const err = new Error('nope');
      const builder = createFinalBuilder({ data: null, error: err });
      fromMock.mockReturnValue(builder);

      await expect(articlesService.getArticleById(3)).rejects.toThrow(err);
      expect(handleError).toHaveBeenCalledWith(
        err,
        expect.objectContaining({
          toastMessage: "Couldn't load article. Try again",
          analyticsProperties: { id: 3 },
        }),
      );
    });
  });

  describe('getArticleCard', () => {
    it('fetches minimal article data', async () => {
      const response = { data: { id: 2 }, error: null };
      const builder = createFinalBuilder(response);
      fromMock.mockReturnValue(builder);
      (mapToArticle as jest.Mock).mockReturnValue('mapped');

      const result = await articlesService.getArticleCard(2);

      expect(fromMock).toHaveBeenCalledWith('articles');
      const called = builder.select.mock.calls[0][0];
      expect(called).toContain('article_sentences');
      expect(builder.eq).toHaveBeenCalledWith('id', 2);
      expect(mapToArticle).toHaveBeenCalledWith(response.data);
      expect(result).toBe('mapped');
    });

    it('handles errors', async () => {
      const err = new Error('nope');
      const builder = createFinalBuilder({ data: null, error: err });
      fromMock.mockReturnValue(builder);

      await expect(articlesService.getArticleCard(4)).rejects.toThrow(err);
      expect(handleError).toHaveBeenCalledWith(
        err,
        expect.objectContaining({
          toastMessage: "Couldn't load article. Try again",
          analyticsProperties: { id: 4 },
        }),
      );
    });
  });
});
