import { articlesService } from '../../services/articles';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  }),
}));

describe('articlesService', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getArticles', () => {
    it('should fetch all articles when no filters are provided', async () => {
      // Mock the response
      const mockArticles = [
        {
          id: 1,
          title: 'Article 1',
          category: { id: 1, name: 'Category 1' },
          author: { id: 1, name: 'Author 1' },
        },
        {
          id: 2,
          title: 'Article 2',
          category: { id: 2, name: 'Category 2' },
          author: { id: 2, name: 'Author 2' },
        },
      ];

      const mockClient = createClient('', '');
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        data: mockArticles,
        error: null,
      });

      const result = await articlesService.getArticles();

      expect(result).toEqual(mockArticles);
      expect(mockClient.from).toHaveBeenCalledWith('articles');
      expect(mockClient.from('articles').select).toHaveBeenCalledWith(`
      *,
      category:categories(*),
      author:authors(*)
    `);
    });

    it('should apply category filter when categoryId is provided', async () => {
      // Mock the response
      const mockArticles = [
        {
          id: 1,
          title: 'Article 1',
          category: { id: 1, name: 'Category 1' },
          author: { id: 1, name: 'Author 1' },
        },
      ];

      const mockClient = createClient('', '');
      const mockSelectReturn = {
        eq: jest.fn().mockReturnValue({
          data: mockArticles,
          error: null,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue(mockSelectReturn);

      const result = await articlesService.getArticles(1);

      expect(result).toEqual(mockArticles);
      expect(mockClient.from).toHaveBeenCalledWith('articles');
      expect(mockSelectReturn.eq).toHaveBeenCalledWith('category_id', 1);
    });

    it('should apply author filter when authorId is provided', async () => {
      // Mock the response
      const mockArticles = [
        {
          id: 2,
          title: 'Article 2',
          category: { id: 2, name: 'Category 2' },
          author: { id: 2, name: 'Author 2' },
        },
      ];

      const mockClient = createClient('', '');
      const mockSelectReturn = {
        eq: jest.fn().mockReturnValue({
          data: mockArticles,
          error: null,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue(mockSelectReturn);

      const result = await articlesService.getArticles(undefined, 2);

      expect(result).toEqual(mockArticles);
      expect(mockClient.from).toHaveBeenCalledWith('articles');
      expect(mockSelectReturn.eq).toHaveBeenCalledWith('author_id', 2);
    });

    it('should apply both category and author filters when both are provided', async () => {
      // Mock the response with chained queries
      const mockArticles = [
        {
          id: 3,
          title: 'Article 3',
          category: { id: 3, name: 'Category 3' },
          author: { id: 3, name: 'Author 3' },
        },
      ];

      const mockClient = createClient('', '');
      const mockCategoryEqReturn = {
        eq: jest.fn().mockReturnValue({
          data: mockArticles,
          error: null,
        }),
      };
      const mockSelectReturn = {
        eq: jest.fn().mockReturnValue(mockCategoryEqReturn),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue(mockSelectReturn);

      const result = await articlesService.getArticles(3, 3);

      expect(mockSelectReturn.eq).toHaveBeenCalledWith('category_id', 3);
      expect(mockCategoryEqReturn.eq).toHaveBeenCalledWith('author_id', 3);
    });

    it('should handle empty results gracefully', async () => {
      const mockClient = createClient('', '');
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        data: [],
        error: null,
      });

      const result = await articlesService.getArticles();

      expect(result).toEqual([]);
    });

    it('should throw error when the database query fails', async () => {
      const mockError = new Error('Database error');
      const mockClient = createClient('', '');
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        data: null,
        error: mockError,
      });

      await expect(articlesService.getArticles()).rejects.toThrow('Database error');
    });
  });

  describe('getArticleById', () => {
    it('should fetch an article by id with all related data', async () => {
      // Mock the response
      const mockArticle = {
        id: 1,
        title: 'Article 1',
        category: { id: 1, name: 'Category 1' },
        author: { id: 1, name: 'Author 1' },
        article_sentences: [
          {
            id: 1,
            text: 'This is a sentence.',
            sentence_words: [
              {
                id: 1,
                word: 'This',
                root: { id: 1, word: 'this' },
                word_type: { id: 1, name: 'Pronoun' },
              },
            ],
          },
        ],
      };

      const mockClient = createClient('', '');
      const mockEqReturn = {
        single: jest.fn().mockReturnValue({
          data: mockArticle,
          error: null,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqReturn),
      });

      const result = await articlesService.getArticleById(1);

      expect(result).toEqual(mockArticle);
      expect(mockClient.from).toHaveBeenCalledWith('articles');
      // Should check select query includes sentence_words, roots, and word_types
      expect(mockClient.from('articles').select).toHaveBeenCalledWith(
        expect.stringContaining('sentence_words')
      );
      expect(mockClient.from('articles').select).toHaveBeenCalledWith(
        expect.stringContaining('root:roots')
      );
      expect(mockClient.from('articles').select).toHaveBeenCalledWith(
        expect.stringContaining('word_type:word_types')
      );
    });

    it('should throw error when article is not found', async () => {
      const mockClient = createClient('', '');
      const mockEqReturn = {
        single: jest.fn().mockReturnValue({
          data: null,
          error: null,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqReturn),
      });

      await expect(articlesService.getArticleById(999)).rejects.toThrow(
        'Article with id 999 not found'
      );
    });

    it('should throw error when the database query fails', async () => {
      const mockError = new Error('Database error');
      const mockClient = createClient('', '');
      const mockEqReturn = {
        single: jest.fn().mockReturnValue({
          data: null,
          error: mockError,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqReturn),
      });

      await expect(articlesService.getArticleById(1)).rejects.toThrow('Database error');
    });

    // Testing edge case: article with no sentences
    it('should handle articles with no sentences', async () => {
      const mockArticle = {
        id: 2,
        title: 'Empty Article',
        category: { id: 1, name: 'Category 1' },
        author: { id: 1, name: 'Author 1' },
        article_sentences: [], // No sentences
      };

      const mockClient = createClient('', '');
      const mockEqReturn = {
        single: jest.fn().mockReturnValue({
          data: mockArticle,
          error: null,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqReturn),
      });

      const result = await articlesService.getArticleById(2);

      expect(result).toEqual(mockArticle);
      expect(result.article_sentences).toEqual([]);
    });

    // Testing edge case: article with sentences but no words
    it('should handle articles with sentences that have no words', async () => {
      const mockArticle = {
        id: 3,
        title: 'Article with empty sentences',
        category: { id: 1, name: 'Category 1' },
        author: { id: 1, name: 'Author 1' },
        article_sentences: [
          {
            id: 2,
            text: 'This is a sentence.',
            sentence_words: [], // No words
          },
        ],
      };

      const mockClient = createClient('', '');
      const mockEqReturn = {
        single: jest.fn().mockReturnValue({
          data: mockArticle,
          error: null,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqReturn),
      });

      const result = await articlesService.getArticleById(3);

      expect(result).toEqual(mockArticle);
      expect(result.article_sentences[0].sentence_words).toEqual([]);
    });

    // Test potential bug: very large article with many sentences and words
    it('should handle large articles with many sentences and words', async () => {
      // Create a mock article with a large number of sentences and words
      const mockArticle = {
        id: 4,
        title: 'Very large article',
        category: { id: 1, name: 'Category 1' },
        author: { id: 1, name: 'Author 1' },
        article_sentences: Array(100)
          .fill(null)
          .map((_, idx) => ({
            id: idx + 10,
            text: `Sentence ${idx + 1}`,
            sentence_words: Array(20)
              .fill(null)
              .map((_, wordIdx) => ({
                id: idx * 100 + wordIdx,
                word: `word${wordIdx}`,
                root: { id: wordIdx, word: `root${wordIdx}` },
                word_type: { id: wordIdx % 5, name: `Type ${wordIdx % 5}` },
              })),
          })),
      };

      const mockClient = createClient('', '');
      const mockEqReturn = {
        single: jest.fn().mockReturnValue({
          data: mockArticle,
          error: null,
        }),
      };
      (mockClient.from('articles').select as jest.Mock).mockReturnValue({
        eq: jest.fn().mockReturnValue(mockEqReturn),
      });

      const result = await articlesService.getArticleById(4);

      expect(result).toEqual(mockArticle);
      expect(result.article_sentences.length).toBe(100);
      expect(result.article_sentences[0].sentence_words.length).toBe(20);
    });
  });
});
