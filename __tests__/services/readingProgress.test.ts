/**
 * Reading Progress Service Tests
 *
 * Tests the reading progress service which tracks article reading state.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.fn() for mock creation (already type-safe)
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import type { ReadingProgress } from '@/services/readingProgress';
import { ReadingProgressService, toSafeReadingProgress } from '@/services/readingProgress';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

// Don't mock executeQuery - let it use the real implementation
// It will call our mocked supabase.from

const { supabase } = require('@/services/supabase');

const createUpsertBuilder = (response: any = { data: null, error: null }) => {
  // Create a promise that resolves to the Supabase response format
  const promise = Promise.resolve(response);

  // Create the upsert function that returns the promise
  const upsertFn = jest.fn(() => promise);

  // Create the builder object that supabase.from() returns
  const builder: any = {
    upsert: upsertFn,
  };

  return { builder, upsertFn };
};

// Helper to create query builder chain for SELECT queries
const createSelectBuilder = (response: any = { data: [], error: null }) => {
  const promise = Promise.resolve(response);
  const selectFn = jest.fn();
  const eqFn = jest.fn();
  const inFn = jest.fn();
  const orderFn = jest.fn();
  const limitFn = jest.fn();
  const gtFn = jest.fn();
  const maybeSingleFn = jest.fn(() => promise);

  // Chain methods
  selectFn.mockReturnValue({ eq: eqFn, in: inFn, order: orderFn });
  eqFn.mockReturnValue({
    eq: eqFn,
    in: inFn,
    maybeSingle: maybeSingleFn,
    gt: gtFn,
    order: orderFn,
  });
  inFn.mockReturnValue(promise);
  gtFn.mockReturnValue({ order: orderFn });
  orderFn.mockReturnValue({ ascending: false, limit: limitFn });
  limitFn.mockReturnValue({ maybeSingle: maybeSingleFn });

  const builder: any = { select: selectFn };

  return { builder, selectFn, eqFn, inFn, maybeSingleFn };
};

// Helper to create DELETE builder chain
const createDeleteBuilder = (response: any = { data: [], error: null }) => {
  const promise = Promise.resolve(response);
  const deleteFn = jest.fn();
  const eqFn = jest.fn();
  const selectFn = jest.fn(() => promise);

  deleteFn.mockReturnValue({ eq: eqFn });
  eqFn.mockReturnValue({ select: selectFn });

  const builder: any = { delete: deleteFn };

  return { builder, deleteFn, eqFn, selectFn };
};

// Helper to create UPDATE builder chain
const createUpdateBuilder = (response: any = { data: [], error: null }) => {
  const promise = Promise.resolve(response);
  const updateFn = jest.fn();
  const eqFn = jest.fn();
  const selectFn = jest.fn(() => promise);

  updateFn.mockReturnValue({ eq: eqFn });
  eqFn.mockReturnValue({ select: selectFn });

  const builder: any = { update: updateFn };

  return { builder, updateFn, eqFn, selectFn };
};

// Helper to mock console.warn for fallback tests
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  mockConsoleWarn.mockClear();
});

describe('ReadingProgressService', () => {
  describe('toSafeReadingProgress', () => {
    test('should return null when progress is null', () => {
      const result = toSafeReadingProgress(null);

      expect(result).toBeNull();
    });

    test('should convert valid progress with all fields', () => {
      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 10,
        total_sentences: 50,
        progress_percentage: 20,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      const result = toSafeReadingProgress(progress);

      expect(result).toEqual({
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 10,
        total_sentences: 50,
        progress_percentage: 22, // calculateProgressPercentage: (10+1)/50*100 = 22%
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });
    });

    test('should default null progress_percentage to 0', () => {
      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 0,
        total_sentences: 50,
        progress_percentage: null,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      const result = toSafeReadingProgress(progress);

      // calculateProgressPercentage: (0+1)/50*100 = 2%
      expect(result?.progress_percentage).toBe(2);
    });

    test('should use created_at when updated_at is null', () => {
      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 5,
        total_sentences: 50,
        progress_percentage: 10,
        updated_at: null,
        created_at: '2024-01-01T10:00:00Z',
      };

      const result = toSafeReadingProgress(progress);

      expect(result?.updated_at).toBe('2024-01-01T10:00:00Z');
    });

    test('should use current time when both updated_at and created_at are null', () => {
      const beforeTest = new Date();

      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 5,
        total_sentences: 50,
        progress_percentage: 10,
        updated_at: null,
        created_at: null,
      };

      const result = toSafeReadingProgress(progress);

      const afterTest = new Date();

      expect(result?.updated_at).toBeDefined();
      const resultDate = new Date(result!.updated_at);
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(resultDate.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    test('should use current time when created_at is null', () => {
      const beforeTest = new Date();

      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 5,
        total_sentences: 50,
        progress_percentage: 10,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: null,
      };

      const result = toSafeReadingProgress(progress);

      const afterTest = new Date();

      expect(result?.created_at).toBeDefined();
      const resultDate = new Date(result!.created_at);
      expect(resultDate.getTime()).toBeGreaterThanOrEqual(beforeTest.getTime());
      expect(resultDate.getTime()).toBeLessThanOrEqual(afterTest.getTime());
    });

    test('should handle progress with 0% completion', () => {
      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 0,
        total_sentences: 100,
        progress_percentage: 0,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      const result = toSafeReadingProgress(progress);

      // calculateProgressPercentage: (0+1)/100*100 = 1%
      expect(result?.progress_percentage).toBe(1);
      expect(result?.last_sentence_read).toBe(0);
    });

    test('should handle progress with 100% completion', () => {
      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 99,
        total_sentences: 100,
        progress_percentage: 100,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      const result = toSafeReadingProgress(progress);

      // calculateProgressPercentage: (99+1)/100*100 = 100%
      expect(result?.progress_percentage).toBe(100);
      expect(result?.last_sentence_read).toBe(99);
    });

    test('should handle all null optional fields', () => {
      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 5,
        total_sentences: 50,
        progress_percentage: null,
        updated_at: null,
        created_at: null,
      };

      const result = toSafeReadingProgress(progress);

      expect(result).toBeDefined();
      // calculateProgressPercentage: (5+1)/50*100 = 12%
      expect(result?.progress_percentage).toBe(12);
      expect(result?.updated_at).toBeDefined();
      expect(result?.created_at).toBeDefined();
    });

    test('should preserve user_id and article_id', () => {
      const progress: ReadingProgress = {
        user_id: 'different-user',
        article_id: 999,
        last_sentence_read: 1,
        total_sentences: 10,
        progress_percentage: null,
        updated_at: null,
        created_at: null,
      };

      const result = toSafeReadingProgress(progress);

      expect(result?.user_id).toBe('different-user');
      expect(result?.article_id).toBe(999);
    });
  });

  describe('updateProgress', () => {
    test('should calculate and upsert progress correctly', async () => {
      const { builder, upsertFn } = createUpsertBuilder({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await ReadingProgressService.updateProgress({
        userId: 'user-123',
        articleId: 42,
        lastSentenceRead: 10,
        totalSentences: 50,
      });

      expect(supabase.from).toHaveBeenCalledWith('reading_progress');
      expect(upsertFn).toHaveBeenCalledTimes(1);
      expect(upsertFn).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          article_id: 42,
          last_sentence_read: 10,
          total_sentences: 50,
          updated_at: expect.any(String),
        }),
        {
          onConflict: 'user_id,article_id',
        },
      );
      // Note: progress_percentage is GENERATED ALWAYS in database, not included in upsert
    });

    test('should not include progress_percentage in upsert (database GENERATED ALWAYS)', async () => {
      const { builder, upsertFn } = createUpsertBuilder({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await ReadingProgressService.updateProgress({
        userId: 'user-123',
        articleId: 42,
        lastSentenceRead: 10,
        totalSentences: 50,
      });

      const upsertCall = upsertFn.mock.calls[0][0];
      // Verify progress_percentage is NOT included (database calculates it)
      expect(upsertCall).not.toHaveProperty('progress_percentage');
      // Verify other fields are present
      expect(upsertCall).toHaveProperty('user_id', 'user-123');
      expect(upsertCall).toHaveProperty('article_id', 42);
      expect(upsertCall).toHaveProperty('last_sentence_read', 10);
      expect(upsertCall).toHaveProperty('total_sentences', 50);
    });

    test('should set updated_at timestamp', async () => {
      const { builder, upsertFn } = createUpsertBuilder({ data: null, error: null });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const beforeUpdate = new Date().toISOString();

      await ReadingProgressService.updateProgress({
        userId: 'user-123',
        articleId: 42,
        lastSentenceRead: 10,
        totalSentences: 50,
      });

      const afterUpdate = new Date().toISOString();

      expect(upsertFn).toHaveBeenCalledTimes(1);
      const upsertCall = upsertFn.mock.calls[0];
      expect(upsertCall).toBeDefined();
      expect(upsertCall[0]).toBeDefined();
      const updateTime = new Date(upsertCall[0].updated_at);

      expect(updateTime.getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime());
      expect(updateTime.getTime()).toBeLessThanOrEqual(new Date(afterUpdate).getTime());
    });
  });

  describe('getProgress', () => {
    test('should return progress when found', async () => {
      const mockProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 10,
        total_sentences: 50,
        progress_percentage: 20,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };
      const { builder, maybeSingleFn } = createSelectBuilder({ data: mockProgress, error: null });
      maybeSingleFn.mockReturnValue(Promise.resolve({ data: mockProgress, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getProgress('user-123', 42);

      expect(supabase.from).toHaveBeenCalledWith('reading_progress');
      expect(result).toEqual(mockProgress);
    });

    test('should return null when not found', async () => {
      const { builder, maybeSingleFn } = createSelectBuilder({ data: null, error: null });
      maybeSingleFn.mockReturnValue(Promise.resolve({ data: null, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getProgress('user-123', 42);

      expect(result).toBeNull();
    });
  });

  describe('getSafeProgress', () => {
    test('should return safe progress with calculated percentage', async () => {
      const mockProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 10,
        total_sentences: 50,
        progress_percentage: 20,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };
      const { builder, maybeSingleFn } = createSelectBuilder({ data: mockProgress, error: null });
      maybeSingleFn.mockReturnValue(Promise.resolve({ data: mockProgress, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getSafeProgress('user-123', 42);

      expect(result).not.toBeNull();
      // calculateProgressPercentage: (10+1)/50*100 = 22%
      expect(result?.progress_percentage).toBe(22);
    });

    test('should return null when no progress found', async () => {
      const { builder, maybeSingleFn } = createSelectBuilder({ data: null, error: null });
      maybeSingleFn.mockReturnValue(Promise.resolve({ data: null, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getSafeProgress('user-123', 42);

      expect(result).toBeNull();
    });
  });

  describe('getBulkProgress', () => {
    test('should return Map of progress for multiple articles', async () => {
      const mockData = [
        {
          user_id: 'user-123',
          article_id: 1,
          last_sentence_read: 5,
          total_sentences: 20,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          user_id: 'user-123',
          article_id: 2,
          last_sentence_read: 15,
          total_sentences: 30,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];
      const { builder, inFn } = createSelectBuilder({ data: mockData, error: null });
      inFn.mockReturnValue(Promise.resolve({ data: mockData, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getBulkProgress('user-123', [1, 2]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get(1)?.last_sentence_read).toBe(5);
      expect(result.get(2)?.last_sentence_read).toBe(15);
    });

    test('should return empty Map when no articles provided and no progress exists', async () => {
      const { builder, eqFn } = createSelectBuilder({ data: [], error: null });
      // When articleIds is empty, it doesn't call .in() - returns promise from eq chain
      eqFn.mockReturnValue(Promise.resolve({ data: [], error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getBulkProgress('user-123', []);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    test('should fetch ALL progress when articleIds is empty array', async () => {
      const mockAllProgress = [
        {
          user_id: 'user-123',
          article_id: 1,
          last_sentence_read: 5,
          total_sentences: 20,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          user_id: 'user-123',
          article_id: 5,
          last_sentence_read: 10,
          total_sentences: 25,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          user_id: 'user-123',
          article_id: 10,
          last_sentence_read: 20,
          total_sentences: 40,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];
      const { builder, eqFn, inFn } = createSelectBuilder({ data: mockAllProgress, error: null });
      // When articleIds is empty, the query doesn't use .in(), so resolve from eq
      eqFn.mockReturnValue(Promise.resolve({ data: mockAllProgress, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getBulkProgress('user-123', []);

      expect(result.size).toBe(3);
      expect(inFn).not.toHaveBeenCalled(); // Empty array skips .in() filter
    });
  });

  describe('getBulkSafeProgress', () => {
    test('should return Map with calculated percentages', async () => {
      const mockData = [
        {
          user_id: 'user-123',
          article_id: 1,
          last_sentence_read: 9,
          total_sentences: 100,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];
      const { builder, inFn } = createSelectBuilder({ data: mockData, error: null });
      inFn.mockReturnValue(Promise.resolve({ data: mockData, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getBulkSafeProgress('user-123', [1]);

      expect(result).toBeInstanceOf(Map);
      // calculateProgressPercentage: (9+1)/100*100 = 10%
      expect(result.get(1)?.progress_percentage).toBe(10);
    });
  });

  describe('getArticlesByProgress', () => {
    test('should sort articles by progress ascending', async () => {
      const mockData = [
        {
          user_id: 'user-123',
          article_id: 1,
          last_sentence_read: 50,
          total_sentences: 100,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          user_id: 'user-123',
          article_id: 2,
          last_sentence_read: 10,
          total_sentences: 100,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          user_id: 'user-123',
          article_id: 3,
          last_sentence_read: 90,
          total_sentences: 100,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(Promise.resolve({ data: mockData, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getArticlesByProgress('user-123', 'asc');

      // Should be sorted: article 2 (11%), article 1 (51%), article 3 (91%)
      expect(result[0].article_id).toBe(2);
      expect(result[1].article_id).toBe(1);
      expect(result[2].article_id).toBe(3);
    });

    test('should sort articles by progress descending', async () => {
      const mockData = [
        {
          user_id: 'user-123',
          article_id: 1,
          last_sentence_read: 50,
          total_sentences: 100,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
        {
          user_id: 'user-123',
          article_id: 2,
          last_sentence_read: 10,
          total_sentences: 100,
          updated_at: '2024-01-01T12:00:00Z',
          created_at: '2024-01-01T10:00:00Z',
        },
      ];
      const { builder, eqFn } = createSelectBuilder({ data: mockData, error: null });
      eqFn.mockReturnValue(Promise.resolve({ data: mockData, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getArticlesByProgress('user-123', 'desc');

      // Should be sorted: article 1 (51%), article 2 (11%)
      expect(result[0].article_id).toBe(1);
      expect(result[1].article_id).toBe(2);
    });
  });

  describe('getLastReadArticle', () => {
    test('should return most recently read article', async () => {
      const mockProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 10,
        total_sentences: 50,
        updated_at: '2024-01-15T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };
      const { builder, maybeSingleFn } = createSelectBuilder({ data: mockProgress, error: null });
      maybeSingleFn.mockReturnValue(Promise.resolve({ data: mockProgress, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getLastReadArticle('user-123');

      expect(result).toEqual(mockProgress);
    });

    test('should return null when no articles have been read', async () => {
      const { builder, maybeSingleFn } = createSelectBuilder({ data: null, error: null });
      maybeSingleFn.mockReturnValue(Promise.resolve({ data: null, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getLastReadArticle('user-123');

      expect(result).toBeNull();
    });
  });

  describe('deleteAllProgress', () => {
    test('should delete all progress successfully', async () => {
      const deletedRows = [
        { user_id: 'user-123', article_id: 1 },
        { user_id: 'user-123', article_id: 2 },
      ];
      const { builder, selectFn } = createDeleteBuilder({ data: deletedRows, error: null });
      selectFn.mockReturnValue(Promise.resolve({ data: deletedRows, error: null }));
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await ReadingProgressService.deleteAllProgress('user-123');

      expect(supabase.from).toHaveBeenCalledWith('reading_progress');
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    test('should fallback to UPDATE when DELETE returns empty array (RLS blocked)', async () => {
      // First call: DELETE returns empty array (RLS blocked)
      const { builder: deleteBuilder, selectFn: deleteSelectFn } = createDeleteBuilder({
        data: [],
        error: null,
      });
      deleteSelectFn.mockReturnValue(Promise.resolve({ data: [], error: null }));

      // Second call: UPDATE succeeds
      const { builder: updateBuilder, selectFn: updateSelectFn } = createUpdateBuilder({
        data: [{ user_id: 'user-123' }],
        error: null,
      });
      updateSelectFn.mockReturnValue(
        Promise.resolve({ data: [{ user_id: 'user-123' }], error: null }),
      );

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(deleteBuilder)
        .mockReturnValueOnce(updateBuilder);

      await ReadingProgressService.deleteAllProgress('user-123');

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('DELETE blocked'));
    });

    test('should fallback to UPDATE when DELETE returns null', async () => {
      // First call: DELETE returns null (treated as no rows deleted)
      const { builder: deleteBuilder, selectFn: deleteSelectFn } = createDeleteBuilder({
        data: null,
        error: null,
      });
      deleteSelectFn.mockReturnValue(Promise.resolve({ data: null, error: null }));

      // Second call: UPDATE succeeds
      const { builder: updateBuilder, selectFn: updateSelectFn } = createUpdateBuilder({
        data: [{ user_id: 'user-123' }],
        error: null,
      });
      updateSelectFn.mockReturnValue(
        Promise.resolve({ data: [{ user_id: 'user-123' }], error: null }),
      );

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(deleteBuilder)
        .mockReturnValueOnce(updateBuilder);

      await ReadingProgressService.deleteAllProgress('user-123');

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });
});
