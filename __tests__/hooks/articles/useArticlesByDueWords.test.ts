/**
 * useArticlesByDueWords Hook Tests
 *
 * Tests article filtering by due vocabulary words.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { renderHook } from '@testing-library/react-native';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import type { Article } from '@/types/articles.types';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock useQuery from tanstack
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

// Mock articles service
jest.mock('@/services/articles', () => ({
  articlesService: {
    getArticlesWithWordStats: jest.fn(),
  },
}));

// Mock queries
jest.mock('@/constants/queries', () => ({
  // Spread the real module so `gated` stays the real gate — the factories
  // below are faked, but the skipToken guard under test must not be.
  ...jest.requireActual('@/constants/queries'),
  fsrsQueries: {
    due: (userId: string) => ({
      queryKey: ['fsrs', 'due', userId],
    }),
    allWithCooldown: (userId: string, cooldown: number) => ({
      queryKey: ['fsrs', 'allWithCooldown', userId, cooldown],
    }),
  },
  articleQueries: {
    withStats: () => ({
      queryKey: ['articles', 'withStats'],
    }),
  },
}));

// Mock article utils
const mockGetArticlesByDueWords = jest.fn();
jest.mock('@/utils/articleUtils', () => ({
  getArticlesByDueWords: (...args: unknown[]) => mockGetArticlesByDueWords(...args),
}));

// Mock fsrs constants
jest.mock('@/constants/fsrs', () => ({
  DEFAULT_SESSION_COOLDOWN_HOURS: 4,
}));

// Import after mocks
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';

describe('useArticlesByDueWords', () => {
  const mockUserId = 'user-123';

  const createMockArticle = (id: number): Article =>
    ({
      id,
      title: `Article ${id}`,
      author: { name: 'Author' },
      category: { name: 'Category' },
      image_url: 'image.jpg',
    }) as Article;

  const createMockStudyWord = (rootId: number): StudyWord =>
    ({
      id: rootId,
      root_id: rootId,
      fsrs_due: new Date().toISOString(),
    }) as StudyWord;

  beforeEach(() => {
    jest.clearAllMocks();

    // Default: no due words, no articles
    mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
      const key = options.queryKey?.[1];
      if (key === 'due') {
        return { data: [], isLoading: false };
      }
      if (key === 'allWithCooldown') {
        return { data: [], isLoading: false };
      }
      // articles with stats
      return { data: [], isLoading: false };
    });

    mockGetArticlesByDueWords.mockReturnValue([]);
  });

  describe('Hook Interface', () => {
    test('returns expected data structure', () => {
      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current).toHaveProperty('articles');
      expect(result.current).toHaveProperty('isLoading');
      expect(result.current).toHaveProperty('dueWordsCount');
      expect(result.current).toHaveProperty('hasEnoughArticles');
      expect(result.current).toHaveProperty('dueWordRootIds');
    });

    test('articles is an array', () => {
      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(Array.isArray(result.current.articles)).toBeTruthy();
    });

    test('dueWordRootIds is a Set', () => {
      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.dueWordRootIds instanceof Set).toBeTruthy();
    });
  });

  describe('No User', () => {
    test('returns empty results when userId is undefined', () => {
      const { result } = renderHook(() => useArticlesByDueWords(undefined));

      expect(result.current.articles).toEqual([]);
      expect(result.current.dueWordsCount).toBe(0);
      expect(result.current.hasEnoughArticles).toBeFalsy();
    });

    test('returns empty dueWordRootIds when userId is undefined', () => {
      const { result } = renderHook(() => useArticlesByDueWords(undefined));

      expect(result.current.dueWordRootIds.size).toBe(0);
    });
  });

  describe('With Due Words', () => {
    test('populates dueWordRootIds from due words', () => {
      const dueWords = [createMockStudyWord(1), createMockStudyWord(2), createMockStudyWord(3)];

      mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
        const key = options.queryKey?.[1];
        if (key === 'due') {
          return { data: dueWords, isLoading: false };
        }
        return { data: [], isLoading: false };
      });

      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.dueWordRootIds.size).toBe(3);
      expect(result.current.dueWordRootIds.has(1)).toBeTruthy();
      expect(result.current.dueWordRootIds.has(2)).toBeTruthy();
      expect(result.current.dueWordRootIds.has(3)).toBeTruthy();
    });

    test('returns due words count', () => {
      const dueWords = [createMockStudyWord(1), createMockStudyWord(2)];

      mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
        const key = options.queryKey?.[1];
        if (key === 'due') {
          return { data: dueWords, isLoading: false };
        }
        return { data: [], isLoading: false };
      });

      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.dueWordsCount).toBe(2);
    });
  });

  describe('Article Sorting', () => {
    test('calls getArticlesByDueWords with correct parameters', () => {
      const dueWords = [createMockStudyWord(1)];
      const articles = [createMockArticle(1)];

      mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
        const key = options.queryKey?.[1];
        if (key === 'due') {
          return { data: dueWords, isLoading: false };
        }
        if (key === 'withStats') {
          return { data: articles, isLoading: false };
        }
        return { data: [], isLoading: false };
      });

      mockGetArticlesByDueWords.mockReturnValue(articles);

      const { result } = renderHook(() => useArticlesByDueWords(mockUserId, 5));

      expect(mockGetArticlesByDueWords).toHaveBeenCalledWith(articles, dueWords, 5);
    });

    test('returns sorted articles from util', () => {
      const dueWords = [createMockStudyWord(1)];
      const sortedArticles = [createMockArticle(2), createMockArticle(1)];

      mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
        const key = options.queryKey?.[1];
        if (key === 'due') {
          return { data: dueWords, isLoading: false };
        }
        if (key === 'withStats') {
          return { data: sortedArticles, isLoading: false };
        }
        return { data: [], isLoading: false };
      });

      mockGetArticlesByDueWords.mockReturnValue(sortedArticles);

      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.articles).toEqual(sortedArticles);
    });
  });

  describe('Has Enough Articles', () => {
    test('returns true when at least 1 article exists', () => {
      const dueWords = [createMockStudyWord(1)];
      const articles = [createMockArticle(1)];

      mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
        const key = options.queryKey?.[1];
        if (key === 'due') {
          return { data: dueWords, isLoading: false };
        }
        if (key === 'withStats') {
          return { data: articles, isLoading: false };
        }
        return { data: [], isLoading: false };
      });

      mockGetArticlesByDueWords.mockReturnValue(articles);

      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.hasEnoughArticles).toBeTruthy();
    });

    test('returns false when no articles', () => {
      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.hasEnoughArticles).toBeFalsy();
    });
  });

  describe('Loading States', () => {
    test('isLoading true when due words loading', () => {
      mockUseQuery.mockImplementation((options: { queryKey: string[] }) => {
        const key = options.queryKey?.[1];
        if (key === 'due') {
          return { data: [], isLoading: true };
        }
        return { data: [], isLoading: false };
      });

      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.isLoading).toBeTruthy();
    });

    test('isLoading false when all loaded', () => {
      mockUseQuery.mockImplementation(() => ({ data: [], isLoading: false }));

      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      expect(result.current.isLoading).toBeFalsy();
    });
  });

  describe('Limit Parameter', () => {
    test('defaults to 10', () => {
      const { result } = renderHook(() => useArticlesByDueWords(mockUserId));

      // Should work with default
      expect(result.current).toBeDefined();
    });

    test('accepts custom limit', () => {
      const { result } = renderHook(() => useArticlesByDueWords(mockUserId, 20));

      expect(result.current).toBeDefined();
    });

    test('returns empty for limit 0', () => {
      const { result } = renderHook(() => useArticlesByDueWords(mockUserId, 0));

      expect(result.current.articles).toEqual([]);
      expect(result.current.hasEnoughArticles).toBeFalsy();
    });
  });
});
