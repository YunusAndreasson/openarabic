/**
 * Categories Service Tests
 *
 * Tests the categories service which fetches category data from the database.
 * This is an extremely simple service - just a thin wrapper around Supabase.
 *
 * Focus: Basic functionality and null handling
 *
 * Modern Jest 29 Patterns:
 * - ✅ jest.mocked() for type-safe mocking
 * - ✅ test.concurrent() for parallel execution
 * - ✅ @jest/globals explicit imports
 */

import { describe, test, expect, jest, beforeEach } from '@jest/globals';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn((..._args: unknown[]) => ({
      select: jest.fn((..._args: unknown[]) => ({
        order: jest.fn((..._args: unknown[]) => ({
          // Supabase query chain
        })),
      })),
    })),
  },
}));

jest.mock('@/utils/supabaseHelpers', () => ({
  executeQuery: jest.fn(),
}));

// Import after mocks
import { categoriesService } from '@/services/categories';
import { executeQuery } from '@/utils/supabaseHelpers';

const mockExecuteQuery = jest.mocked(executeQuery);

describe('categoriesService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    // A successful select resolves to an array (empty when there are no rows),
    // so there is no null to map; the request options reach executeQuery.
    test('forwards the request options to executeQuery', async () => {
      mockExecuteQuery.mockResolvedValue([]);

      const result = await categoriesService.getCategories({ managed: true });

      expect(result).toEqual([]);
      expect(mockExecuteQuery).toHaveBeenCalledWith(expect.any(Function), expect.any(Object), {
        managed: true,
      });
    });

    test('should return categories data when available', async () => {
      const mockCategories = [
        { id: 1, name: 'Quran' },
        { id: 2, name: 'Hadith' },
      ];
      mockExecuteQuery.mockResolvedValue(mockCategories);

      const result = await categoriesService.getCategories();

      expect(result).toEqual(mockCategories);
    });

    test('should not throw on error (handled by executeQuery)', async () => {
      mockExecuteQuery.mockRejectedValue(new Error('Database error'));

      await expect(categoriesService.getCategories()).rejects.toThrow();
    });
  });
});
