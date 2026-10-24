/**
 * Reading Progress Service Tests
 *
 * Tests the reading progress service which tracks article reading state.
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.fn() for mock creation (already type-safe)
 * - ✅ @jest/globals explicit imports
 */

import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import type { ReadingProgress } from '@/services/readingProgress';
import { ReadingProgressService } from '@/services/readingProgress';
import { articleId } from '@/__tests__/helpers/ids';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

// Don't mock executeQuery - let it use the real implementation
// It will call our mocked supabase.from

const { supabase } = require('@/services/supabase');
const mockRpc = supabase.rpc as unknown as jest.Mock<
  (
    functionName: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: null; error: unknown; status?: number }>
>;

/** A chainable SELECT builder resolving to the next of `responses`, one per request. */
const createSelectBuilder = (...responses: unknown[]) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    then: jest.fn((resolve: any, reject: any) =>
      Promise.resolve(responses.shift()).then(resolve, reject),
    ),
  };
  return builder;
};

/** A DELETE or UPDATE builder: the verb, one `.eq()`, then the response. */
const createWriteBuilder = (verb: 'delete' | 'update', response: unknown) => {
  const eq = jest.fn(async (..._args: unknown[]) => response);
  const write = jest.fn((..._args: unknown[]) => ({ eq }));
  return { builder: { [verb]: write } as any, write, eq };
};

const progressRow = (id: number, lastSentenceRead: number): ReadingProgress => ({
  user_id: 'user-123',
  article_id: id,
  last_sentence_read: lastSentenceRead,
  total_sentences: 10,
  created_at: '2024-01-01T10:00:00Z',
  updated_at: '2024-01-01T12:00:00Z',
});

// Helper to mock console.warn for fallback tests
const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

beforeEach(() => {
  jest.clearAllMocks();
  mockConsoleWarn.mockClear();
});

describe('ReadingProgressService', () => {
  describe('updateProgress', () => {
    test('uses the atomic monotonic progress RPC', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await ReadingProgressService.updateProgress({
        userId: 'user-123',
        articleId: articleId(42),
        lastSentenceRead: 10,
        totalSentences: 50,
      });

      expect(supabase.rpc).toHaveBeenCalledWith('update_reading_progress_monotonic', {
        p_user_id: 'user-123',
        p_article_id: 42,
        p_last_sentence_read: 10,
        p_total_sentences: 50,
      });
      expect(supabase.from).not.toHaveBeenCalled();
    });

    test('propagates RPC failures', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'rpc failed', code: '', details: '', hint: '' },
        status: 500,
      });

      await expect(
        ReadingProgressService.updateProgress({
          userId: 'user-123',
          articleId: articleId(42),
          lastSentenceRead: 10,
          totalSentences: 50,
        }),
      ).rejects.toThrow('rpc failed');
    });
  });

  describe('getBulkProgress', () => {
    test('returns every row for the user, keyed by article', async () => {
      const builder = createSelectBuilder({
        data: [progressRow(1, 5), progressRow(2, 9)],
        error: null,
      });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getBulkProgress('user-123');

      expect(supabase.from).toHaveBeenCalledWith('reading_progress');
      expect(builder.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result.size).toBe(2);
      expect(result.get(articleId(1))?.last_sentence_read).toBe(5);
      expect(result.get(articleId(2))?.last_sentence_read).toBe(9);
    });

    test('returns an empty Map when no progress exists', async () => {
      (supabase.from as jest.Mock).mockReturnValue(createSelectBuilder({ data: [], error: null }));

      const result = await ReadingProgressService.getBulkProgress('user-123');

      expect(result.size).toBe(0);
    });

    // A single request was capped at PostgREST's 1000 rows; past that, progress
    // silently disappeared. Ordered by `article_id` — unique per user — so pages
    // cannot overlap or skip.
    test('pages past the 1000-row cap in a stable order', async () => {
      const firstPage = Array.from({ length: 1000 }, (_, index) => progressRow(index + 1, 1));
      const builder = createSelectBuilder(
        { data: firstPage, error: null },
        { data: [progressRow(1001, 1)], error: null },
      );
      (supabase.from as jest.Mock).mockReturnValue(builder);

      const result = await ReadingProgressService.getBulkProgress('user-123');

      expect(builder.order).toHaveBeenCalledWith('article_id');
      expect(builder.range.mock.calls).toEqual([
        [0, 999],
        [1000, 1999],
      ]);
      expect(result.size).toBe(1001);
    });
  });

  describe('deleteAllProgress', () => {
    test('deletes every row, counting rather than returning them', async () => {
      const { builder, write, eq } = createWriteBuilder('delete', {
        data: null,
        error: null,
        count: 2,
      });
      (supabase.from as jest.Mock).mockReturnValue(builder);

      await ReadingProgressService.deleteAllProgress('user-123');

      expect(supabase.from).toHaveBeenCalledWith('reading_progress');
      expect(write).toHaveBeenCalledWith({ count: 'exact' });
      expect(eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    test('falls back to UPDATE when DELETE removed nothing (RLS blocked)', async () => {
      const deletion = createWriteBuilder('delete', { data: null, error: null, count: 0 });
      const reset = createWriteBuilder('update', { data: null, error: null, count: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(deletion.builder)
        .mockReturnValueOnce(reset.builder);

      await ReadingProgressService.deleteAllProgress('user-123');

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(reset.write).toHaveBeenCalledWith({ last_sentence_read: -1 });
      expect(reset.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('DELETE blocked'));
    });

    test('treats a missing count as nothing deleted', async () => {
      const deletion = createWriteBuilder('delete', { data: null, error: null, count: null });
      const reset = createWriteBuilder('update', { data: null, error: null, count: null });

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(deletion.builder)
        .mockReturnValueOnce(reset.builder);

      await ReadingProgressService.deleteAllProgress('user-123');

      expect(supabase.from).toHaveBeenCalledTimes(2);
      expect(mockConsoleWarn).toHaveBeenCalled();
    });
  });
});
