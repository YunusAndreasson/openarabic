import { describe, expect, it } from '@jest/globals';

import type { ReadingProgress } from '@/services/readingProgress';
import { toSafeReadingProgress } from '@/services/readingProgress';

describe('ReadingProgressService', () => {
  describe('toSafeReadingProgress', () => {
    it('should return null when progress is null', () => {
      const result = toSafeReadingProgress(null);

      expect(result).toBeNull();
    });

    it('should convert valid progress with all fields', () => {
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
        progress_percentage: 20,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      });
    });

    it('should default null progress_percentage to 0', () => {
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

      expect(result?.progress_percentage).toBe(0);
    });

    it('should use created_at when updated_at is null', () => {
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

    it('should use current time when both updated_at and created_at are null', () => {
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

    it('should use current time when created_at is null', () => {
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

    it('should handle progress with 0% completion', () => {
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

      expect(result?.progress_percentage).toBe(0);
      expect(result?.last_sentence_read).toBe(0);
    });

    it('should handle progress with 100% completion', () => {
      const progress: ReadingProgress = {
        user_id: 'user-123',
        article_id: 42,
        last_sentence_read: 100,
        total_sentences: 100,
        progress_percentage: 100,
        updated_at: '2024-01-01T12:00:00Z',
        created_at: '2024-01-01T10:00:00Z',
      };

      const result = toSafeReadingProgress(progress);

      expect(result?.progress_percentage).toBe(100);
      expect(result?.last_sentence_read).toBe(100);
    });

    it('should handle all null optional fields', () => {
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
      expect(result?.progress_percentage).toBe(0);
      expect(result?.updated_at).toBeDefined();
      expect(result?.created_at).toBeDefined();
    });

    it('should preserve user_id and article_id', () => {
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
});
