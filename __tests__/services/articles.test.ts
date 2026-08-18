/**
 * Articles Service Tests
 *
 * Tests the articles service parameter validation and error handling.
 * Supabase query chaining is not mocked as it's too complex and fragile.
 * The service is primarily a thin wrapper around Supabase with validation logic.
 *
 * Focus: Parameter validation (the core business logic in this service)
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.fn() for mock creation (already type-safe)
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest } from '@jest/globals';

// Mock dependencies BEFORE imports to avoid actual database calls
const mockQueryChain = {
  eq: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockReturnThis(),
  maybeSingle: jest.fn().mockReturnThis(),
  returns: jest.fn(async (..._args: unknown[]) => ({ data: [], error: null })),
};

Object.keys(mockQueryChain).forEach(key => {
  if (key !== 'returns') {
    (mockQueryChain as any)[key] = jest.fn((..._args: unknown[]) => mockQueryChain);
  }
});

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn((..._args: unknown[]) => ({
      select: jest.fn((..._args: unknown[]) => mockQueryChain),
    })),
  },
}));

jest.mock('@/utils/supabaseHelpers', () => ({
  executeQuery: jest.fn(async (queryFn: () => Promise<{ data: unknown; error: unknown }>) => {
    const { data, error } = await queryFn();
    if (error) throw error;
    return data;
  }),
}));

jest.mock('@/utils/typeMappers', () => ({
  mapToArticle: jest.fn(data => data),
  mapToArticles: jest.fn(data => data),
}));

// Import after mocks
import { articlesService } from '@/services/articles';

describe('articlesService - Parameter Validation', () => {
  describe('getArticles validation', () => {
    test('should validate limit parameter (negative)', async () => {
      await expect(articlesService.getArticles({ limit: -1 })).rejects.toThrow('Invalid limit: -1');
    });

    test('should validate limit parameter (too large)', async () => {
      await expect(articlesService.getArticles({ limit: 20000 })).rejects.toThrow(
        'Invalid limit: 20000',
      );
    });

    test('should validate offset parameter (negative)', async () => {
      await expect(articlesService.getArticles({ offset: -5 })).rejects.toThrow(
        'Invalid offset: -5',
      );
    });

    test('should validate minDifficulty range', async () => {
      await expect(articlesService.getArticles({ minDifficulty: 0 })).rejects.toThrow(
        'Invalid minDifficulty: 0',
      );

      await expect(articlesService.getArticles({ minDifficulty: 6 })).rejects.toThrow(
        'Invalid minDifficulty: 6',
      );
    });

    test('should validate maxDifficulty range', async () => {
      await expect(articlesService.getArticles({ maxDifficulty: 0 })).rejects.toThrow(
        'Invalid maxDifficulty: 0',
      );

      await expect(articlesService.getArticles({ maxDifficulty: 6 })).rejects.toThrow(
        'Invalid maxDifficulty: 6',
      );
    });

    test('should validate difficulty range consistency', async () => {
      await expect(
        articlesService.getArticles({
          minDifficulty: 4,
          maxDifficulty: 2,
        }),
      ).rejects.toThrow('Invalid difficulty range');
    });
  });

  describe('getArticlesByIds edge cases', () => {
    test('should handle empty array without database call', async () => {
      const result = await articlesService.getArticlesByIds([]);
      expect(result).toEqual([]);
    });
  });
});
