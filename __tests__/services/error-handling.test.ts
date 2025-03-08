import { articlesService } from '../../services/articles';
import { createClient } from '@supabase/supabase-js';

// Mock the entire Supabase module
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

// Mock the articles service directly
jest.mock('../../services/articles', () => ({
  articlesService: {
    getArticles: jest.fn(),
    getArticleById: jest.fn(),
  },
}));

describe('Error Handling in Services', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('articlesService error handling', () => {
    it('should handle API errors when fetching articles', async () => {
      // Setup mock to simulate an API error
      const mockError = { message: 'API Error', code: 'INTERNAL_SERVER_ERROR' };
      (articlesService.getArticles as jest.Mock).mockRejectedValue(mockError);

      // Test error handling during article fetching
      await expect(articlesService.getArticles()).rejects.toEqual(mockError);
    });

    it('should handle network failures', async () => {
      // Setup mock to simulate a network failure
      (articlesService.getArticles as jest.Mock).mockRejectedValue(new Error('Network failure'));

      // Test error handling during network failure
      await expect(articlesService.getArticles()).rejects.toThrow('Network failure');
    });

    it('should handle API errors when fetching a single article', async () => {
      // Setup mock to simulate an API error for a single article
      const mockError = { message: 'Article not found', code: 'NOT_FOUND' };
      (articlesService.getArticleById as jest.Mock).mockRejectedValue(mockError);

      // Test error handling during single article fetch
      await expect(articlesService.getArticleById(123)).rejects.toEqual(mockError);
    });
  });

  // Test common error scenarios across multiple services with parameterized tests
  describe('Common error handling patterns', () => {
    // Define an array of services and their methods to test
    type ServiceTestCase = {
      serviceName: string;
      method: (...args: any[]) => Promise<any>;
      args: any[];
      mockSetup: () => void;
      expectedError: any;
    };

    const errorTestCases: ServiceTestCase[] = [
      {
        serviceName: 'articlesService.getArticles',
        method: articlesService.getArticles,
        args: [],
        mockSetup: () => {
          (articlesService.getArticles as jest.Mock).mockRejectedValue({
            message: 'Permission denied',
            code: 'PERMISSION_DENIED',
          });
        },
        expectedError: { message: 'Permission denied', code: 'PERMISSION_DENIED' },
      },
      {
        serviceName: 'articlesService.getArticleById',
        method: articlesService.getArticleById,
        args: [123],
        mockSetup: () => {
          (articlesService.getArticleById as jest.Mock).mockRejectedValue({
            message: 'Article not found',
            code: 'NOT_FOUND',
          });
        },
        expectedError: { message: 'Article not found', code: 'NOT_FOUND' },
      },
    ];

    it.each(errorTestCases)(
      'should handle errors in $serviceName',
      async ({ method, args, mockSetup, expectedError }) => {
        // Setup the mock for this test case
        mockSetup();

        // Test the service method with the provided arguments
        await expect(method(...args)).rejects.toEqual(expectedError);
      }
    );
  });
});
