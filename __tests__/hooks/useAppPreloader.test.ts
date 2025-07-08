import { act, renderHook } from '@testing-library/react-native';

import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';

const mockFetchQuery = jest.fn().mockResolvedValue([]);
const mockPrefetchQuery = jest.fn().mockResolvedValue(undefined);
const mockSetQueryData = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    fetchQuery: (...args: any[]) => mockFetchQuery(...args),
    prefetchQuery: (...args: any[]) => mockPrefetchQuery(...args),
    setQueryData: (...args: any[]) => mockSetQueryData(...args),
  }),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/services/articles', () => ({
  articlesService: {
    getArticles: jest.fn().mockResolvedValue([]),
    getArticleById: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('@/services/authors', () => ({
  authorsService: {
    getAuthors: jest.fn().mockResolvedValue([]),
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
  },
}));

jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: {
    getFSRSWords: jest.fn().mockResolvedValue([]),
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
  it.skip('preloads critical data when conditions are met', async () => {
    const categories = [{ id: 1 }];
    const articles = [{ id: 1, title: 'Test Article' }];

    // Ensure auth is not loading and preloading hasn't started
    mockUseAuth.mockReturnValue({ user: { id: 'u1' }, isLoading: false });

    mockFetchQuery.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'categories') return Promise.resolve(categories);
      if (queryKey[0] === 'articles') return Promise.resolve(articles);
      if (queryKey.includes('fsrs-words')) return Promise.resolve([]);
      return Promise.resolve([]);
    });

    const { result } = renderHook(() => useAppPreloader());

    await act(async () => {
      await result.current.preloadAppData();
    });

    // Verify the correct service calls were made
    expect(mockFetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['categories'] })
    );
    expect(mockFetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['articles', 'minimal'] })
    );
    expect(mockSetQueryData).toHaveBeenCalledWith(['articles'], articles);
  });

  it('prefetches article data when given id', async () => {
    const { result } = renderHook(() => useAppPreloader());

    const success = await result.current.prefetchArticle(42);

    expect(success).toBe(true);
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['article', 42] })
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
      expect.objectContaining({ queryKey: FSRS_QUERY_KEYS.due('u2') })
    );
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: FSRS_QUERY_KEYS.all('u2') })
    );
  });

  it('handles errors gracefully during preload', async () => {
    mockFetchQuery.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAppPreloader());

    await act(async () => {
      await result.current.preloadAppData();
    });

    // Should still complete despite errors
    expect(result.current.isPreloading).toBe(false);
  });
});
