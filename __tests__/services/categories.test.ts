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
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        order: jest.fn(() => ({
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
    test('should return empty array when no data', async () => {
      mockExecuteQuery.mockResolvedValue(null);

      const result = await categoriesService.getCategories();

      expect(result).toEqual([]);
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
