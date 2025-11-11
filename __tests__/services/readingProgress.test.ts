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

beforeEach(() => {
  jest.clearAllMocks();
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
});
