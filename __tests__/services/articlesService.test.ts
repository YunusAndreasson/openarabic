/**
 * Service Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - ✅ jest.mocked() for type-safe mocking
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { articlesService } from '../../services/articles';
import { supabase } from '../../services/supabase';
import { handleError } from '../../utils/errorHandling';
import { mapToArticle, mapToArticles } from '../../utils/typeMappers';
import { articleId } from '@/__tests__/helpers/ids';
import { SupabaseRequestError } from '@/utils/supabaseHelpers';

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

/** A chainable builder that resolves to the next of `responses`, one per request. */
const createPagedBuilder = (...responses: unknown[]) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    // A type-level no-op at runtime.
    overrideTypes: jest.fn().mockReturnThis(),
    then: jest.fn((resolve: any, reject: any) =>
      Promise.resolve(responses.shift()).then(resolve, reject),
    ),
  };
  return builder;
};

const createFinalBuilder = (response: any) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockReturnThis(),
    overrideTypes: jest.fn(async (..._args: unknown[]) => response),
  };
  return builder;
};

const ok = (data: unknown) => ({ data, error: null, status: 200 });
const rows = (count: number, offset = 0) =>
  Array.from({ length: count }, (_, index) => ({ id: offset + index + 1 }));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('articlesService', () => {
  describe('getArticles', () => {
    test('reads the published library newest first, in the card shape, and maps it', async () => {
      const builder = createPagedBuilder(ok([{ id: 1 }]));
      fromMock.mockReturnValue(builder);
      jest.mocked(mapToArticles).mockReturnValue(['mapped'] as never);

      const result = await articlesService.getArticles();

      expect(fromMock).toHaveBeenCalledWith('articles');
      const calledColumns = builder.select.mock.calls[0][0].replace(/\s/g, '');
      const expected = `
        id,
        published,
        title,
        image_url,
        created_at,
        difficulty_level,
        category_id,
        author_id,
        summary,
        audio_url,
        audio_url_bilingual,
        book,
        category:categories!inner(id,name),
        author:authors!inner(id,name),
        article_sentences(id)
      `.replace(/\s/g, '');
      expect(calledColumns).toBe(expected);
      expect(builder.eq).toHaveBeenCalledWith('published', true);
      expect(builder.order).toHaveBeenNthCalledWith(1, 'created_at', { ascending: false });
      // `created_at` can tie, and pages of a tied order can overlap or skip.
      expect(builder.order).toHaveBeenNthCalledWith(2, 'id');
      expect(builder.range).toHaveBeenCalledWith(0, 999);
      expect(mapToArticles).toHaveBeenCalledWith([{ id: 1 }] as unknown as Parameters<
        typeof mapToArticles
      >[0]);
      expect(result).toEqual(['mapped']);
    });

    // It was one request capped at exactly 1000 rows: past that, the oldest
    // articles vanished without an error.
    test('pages past the 1000-row cap', async () => {
      const builder = createPagedBuilder(ok(rows(1000)), ok(rows(2, 1000)));
      fromMock.mockReturnValue(builder);

      await articlesService.getArticles();

      expect(builder.range.mock.calls).toEqual([
        [0, 999],
        [1000, 1999],
      ]);
      expect(jest.mocked(mapToArticles).mock.calls[0]![0]).toHaveLength(1002);
    });

    test('hands the request signal to every page', async () => {
      const builder = createPagedBuilder(ok(rows(1000)), ok([]));
      fromMock.mockReturnValue(builder);
      const controller = new AbortController();

      await articlesService.getArticles({ signal: controller.signal });

      expect(builder.abortSignal).toHaveBeenCalledTimes(2);
      expect(builder.abortSignal).toHaveBeenCalledWith(controller.signal);
    });

    test('stops paging once the request is cancelled', async () => {
      const controller = new AbortController();
      const builder = createPagedBuilder(ok(rows(1000)), ok([]));
      builder.then.mockImplementationOnce((resolve: any) => {
        controller.abort();
        return Promise.resolve(ok(rows(1000))).then(resolve);
      });
      fromMock.mockReturnValue(builder);

      await expect(articlesService.getArticles({ signal: controller.signal })).rejects.toThrow();

      expect(builder.range).toHaveBeenCalledTimes(1);
      expect(handleError).not.toHaveBeenCalled();
    });

    test('reports a failed page and throws it with its status', async () => {
      const builder = createPagedBuilder({
        data: null,
        error: { message: 'fail', code: '', details: '', hint: '' },
        status: 503,
      });
      fromMock.mockReturnValue(builder);

      const thrown = await articlesService.getArticles().catch((error: unknown) => error);

      expect(thrown).toBeInstanceOf(SupabaseRequestError);
      expect(thrown).toMatchObject({ message: 'fail', status: 503 });
      expect(handleError).toHaveBeenCalledWith(
        thrown,
        expect.objectContaining({
          toastMessage: "Couldn't load articles. Try again",
          analyticsProperties: { offset: 0 },
        }),
      );
    });

    // A query function hands its request over as managed: the query cache
    // reports once after the last retry, so the service must not.
    test('leaves the report to the query cache for a managed request', async () => {
      fromMock.mockReturnValue(
        createPagedBuilder({
          data: null,
          error: { message: 'fail', code: '', details: '', hint: '' },
          status: 503,
        }),
      );

      const thrown = await articlesService
        .getArticles({ managed: true })
        .catch((error: unknown) => error);

      expect(handleError).not.toHaveBeenCalled();
      expect((thrown as SupabaseRequestError).takeReport()).toMatchObject({
        toastMessage: "Couldn't load articles. Try again",
      });
    });
  });

  describe('getArticlesWithWordStats', () => {
    test('queries supabase and maps data', async () => {
      const builder = createPagedBuilder(ok([{ id: 1 }]));
      fromMock.mockReturnValue(builder);
      jest.mocked(mapToArticles).mockReturnValue(['mapped'] as never);

      const result = await articlesService.getArticlesWithWordStats();

      expect(fromMock).toHaveBeenCalledWith('articles');
      const called = builder.select.mock.calls[0][0].replace(/\s/g, '');
      const expected = `
        id,
        published,
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
      expect(builder.order).toHaveBeenCalledWith('id');
      expect(mapToArticles).toHaveBeenCalledWith([{ id: 1 }] as unknown as Parameters<
        typeof mapToArticles
      >[0]);
      expect(result).toEqual(['mapped']);
    });

    test('handles errors', async () => {
      const builder = createPagedBuilder({
        data: null,
        error: { message: 'bad', code: '', details: '', hint: '' },
        status: 500,
      });
      fromMock.mockReturnValue(builder);

      await expect(articlesService.getArticlesWithWordStats()).rejects.toThrow('bad');
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
    test('retrieves single article and maps data', async () => {
      const response = { data: { id: 1 }, error: null };
      const builder = createFinalBuilder(response);
      fromMock.mockReturnValue(builder);
      jest.mocked(mapToArticle).mockReturnValue('mapped' as never);

      const result = await articlesService.getArticleById(articleId(7));

      expect(fromMock).toHaveBeenCalledWith('articles');
      const called = builder.select.mock.calls[0][0];
      expect(called).toContain('article_sentences');
      expect(builder.eq).toHaveBeenCalledWith('id', 7);
      expect(mapToArticle).toHaveBeenCalledWith(
        response.data as unknown as Parameters<typeof mapToArticle>[0],
      );
      expect(result).toBe('mapped');
    });

    test('handles errors', async () => {
      const builder = createFinalBuilder({
        data: null,
        error: { message: 'nope', code: '', details: '', hint: '' },
        status: 500,
      });
      fromMock.mockReturnValue(builder);

      await expect(articlesService.getArticleById(articleId(3))).rejects.toThrow('nope');
      expect(handleError).toHaveBeenCalledWith(
        expect.any(SupabaseRequestError),
        expect.objectContaining({
          toastMessage: "Couldn't load article. Try again",
          analyticsProperties: { id: 3 },
        }),
      );
    });
  });

  describe('getArticlesByIds', () => {
    test('should handle empty array without database call', async () => {
      const result = await articlesService.getArticlesByIds([]);

      expect(result).toEqual([]);
      expect(fromMock).not.toHaveBeenCalled();
    });
  });
});
