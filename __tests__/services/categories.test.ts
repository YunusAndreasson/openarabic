import { categoriesService } from '../../services/categories';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    order: jest.fn(),
  }),
}));

describe('categoriesService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should fetch and return all categories ordered by name', async () => {
      // Mock response
      const mockCategories = [
        { id: 2, name: 'Arts', created_at: '2023-01-01' },
        { id: 3, name: 'Business', created_at: '2023-01-01' },
        { id: 1, name: 'Technology', created_at: '2023-01-01' },
      ];

      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const result = await categoriesService.getCategories();

      expect(result).toEqual(mockCategories);
      expect(mockClient.from).toHaveBeenCalledWith('categories');
      expect(mockClient.from('categories').select).toHaveBeenCalledWith('*');
      expect(mockClient.from('categories').select('*').order).toHaveBeenCalledWith('name');
    });

    it('should handle empty results', async () => {
      // Mock empty response
      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await categoriesService.getCategories();

      expect(result).toEqual([]);
    });

    it('should throw error when database query fails', async () => {
      // Mock database error
      const mockError = new Error('Database error');
      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: null,
        error: mockError,
      });

      await expect(categoriesService.getCategories()).rejects.toThrow('Database error');
    });

    it('should handle malformed category data', async () => {
      // Mock response with missing fields
      const mockCategories = [
        { id: 1, name: 'Valid Category', created_at: '2023-01-01' },
        { id: 2 }, // Missing name
        { name: 'Invalid Category' }, // Missing id
        null, // Null category
      ];

      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      // The function should still return the data as is
      const result = await categoriesService.getCategories();

      // We expect the service to return whatever the database returns, not filter out malformed data
      // This tests the assumption that data validation happens elsewhere
      expect(result).toEqual(mockCategories);
    });

    // Testing edge case: a very large number of categories
    it('should handle a large number of categories', async () => {
      // Create 1000 mock categories
      const mockCategories = Array(1000)
        .fill(null)
        .map((_, idx) => ({
          id: idx + 1,
          name: `Category ${idx + 1}`,
          created_at: '2023-01-01',
        }));

      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const result = await categoriesService.getCategories();

      expect(result).toEqual(mockCategories);
      expect(result.length).toBe(1000);
    });

    // Testing edge case: categories with the same name
    it('should handle categories with duplicate names', async () => {
      // Mock categories with duplicate names
      const mockCategories = [
        { id: 1, name: 'Duplicate', created_at: '2023-01-01' },
        { id: 2, name: 'Duplicate', created_at: '2023-01-02' },
        { id: 3, name: 'Unique', created_at: '2023-01-03' },
      ];

      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const result = await categoriesService.getCategories();

      // Should return all categories, even those with duplicate names
      expect(result).toEqual(mockCategories);
      expect(result.length).toBe(3);
    });

    // Testing potential bug: handling of special characters in category names
    it('should handle categories with special characters in names', async () => {
      const mockCategories = [
        { id: 1, name: 'Category with spaces', created_at: '2023-01-01' },
        { id: 2, name: 'Category-with-hyphens', created_at: '2023-01-02' },
        { id: 3, name: 'Category_with_underscores', created_at: '2023-01-03' },
        { id: 4, name: 'Category+with+plus', created_at: '2023-01-04' },
        { id: 5, name: 'Category@with$special&chars', created_at: '2023-01-05' },
        { id: 6, name: 'Category/with/slashes', created_at: '2023-01-06' },
        { id: 7, name: 'Category"with"quotes', created_at: '2023-01-07' },
      ];

      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const result = await categoriesService.getCategories();

      // Should correctly return all categories with special characters
      expect(result).toEqual(mockCategories);
      expect(result.length).toBe(7);
    });

    // Testing potential bug: handling of multilingual category names
    it('should handle categories with non-ASCII names', async () => {
      const mockCategories = [
        { id: 1, name: 'العربية', created_at: '2023-01-01' }, // Arabic
        { id: 2, name: '中文', created_at: '2023-01-02' }, // Chinese
        { id: 3, name: 'Français', created_at: '2023-01-03' }, // French with accent
        { id: 4, name: 'Русский', created_at: '2023-01-04' }, // Russian
        { id: 5, name: 'Español', created_at: '2023-01-05' }, // Spanish with accent
      ];

      const mockClient = createClient('', '');
      (mockClient.from('categories').select('*').order as jest.Mock).mockResolvedValue({
        data: mockCategories,
        error: null,
      });

      const result = await categoriesService.getCategories();

      // Should correctly return all categories with multilingual names
      expect(result).toEqual(mockCategories);
      expect(result.length).toBe(5);
    });
  });
});
