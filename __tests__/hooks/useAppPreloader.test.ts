import { renderHook, act } from '@testing-library/react-native';

import { useAppPreloader } from '@/hooks/app/useAppPreloader';

const mockFetchQuery = jest.fn().mockResolvedValue([]);
const mockPrefetchQuery = jest.fn().mockResolvedValue(undefined);
const mockGetQueryData = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    fetchQuery: (...args: any[]) => mockFetchQuery(...args),
    prefetchQuery: (...args: any[]) => mockPrefetchQuery(...args),
    getQueryData: (...args: any[]) => mockGetQueryData(...args),
  }),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/services/articles', () => ({
  articlesService: {
    getArticles: jest.fn().mockResolvedValue([]),
    getArticleCard: jest.fn().mockResolvedValue({}),
    getArticleById: jest.fn().mockResolvedValue({}),
    getArticlesWithWordStats: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/services/authors', () => ({
  authorsService: {
    getAuthors: jest.fn().mockResolvedValue([]),
    getAuthorsByCategory: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/services/categories', () => ({
  categoriesService: {
    getCategories: jest.fn().mockResolvedValue([{ id: 1 }]),
  },
}));

jest.mock('@/services/readingList', () => ({
  readingListService: {
    getReadingList: jest.fn().mockResolvedValue([]),
    isInReadingList: jest.fn().mockResolvedValue(false),
  },
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn().mockResolvedValue([]),
  },
  FSRS_QUERY_KEYS: {
    due: (id: string) => ['due', id] as const,
    all: (id: string) => ['all', id] as const,
  },
}));

jest.mock('@/utils/errorHandling', () => ({
  handleError: jest.fn(),
}));


beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: null, isLoading: false });
});

describe('useAppPreloader', () => {
  it('preloads critical data and marks app as loaded', async () => {
    const categories = [{ id: 1 }];
    mockFetchQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'categories') return Promise.resolve(categories);
      if (queryKey[0] === 'articles') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => useAppPreloader());

    await act(async () => {
      await result.current.preloadAppData();
    });
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.preloadProgress).toBe(100);
    expect(result.current.isPreloading).toBe(false);
  });

  it('prefetches article data when given id', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false });
    const { result } = renderHook(() => useAppPreloader());

    const success = await result.current.prefetchArticle(42);

    expect(success).toBe(true);
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['article', 'card', 42] })
    );
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['article', 42] })
    );
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['isInReadingList', 'u1', 42] })
    );
  });

  it('prefetchVocabularyData returns false without user', async () => {
    const { result } = renderHook(() => useAppPreloader());

    const success = await result.current.prefetchVocabularyData();
    expect(success).toBe(false);
    expect(mockPrefetchQuery).not.toHaveBeenCalled();
  });

  it('prefetchVocabularyData prefetches queries for user', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u2' }, isLoading: false });
    const { result } = renderHook(() => useAppPreloader());

    const success = await result.current.prefetchVocabularyData();
    expect(success).toBe(true);
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['due', 'u2'] })
    );
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['all', 'u2'] })
    );
  });
});
