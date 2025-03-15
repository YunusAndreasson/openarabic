import { renderHook } from '@testing-library/react-hooks';
import { useArticleData } from '../../hooks/useArticleData';

// Mock dependencies
jest.mock('@tanstack/react-query', () => {
  const originalModule = jest.requireActual('@tanstack/react-query');
  return {
    ...originalModule,
    useQuery: jest.fn(({ queryKey, enabled = true }) => {
      // Return different mock data based on the query key
      if (queryKey[0] === 'article') {
        return {
          data: enabled ? mockArticle : undefined,
          isLoading: false,
        };
      } else if (queryKey[0] === 'isInReadingList') {
        return {
          data: enabled ? true : false,
          refetch: jest.fn(),
        };
      } else if (queryKey[0] === 'studyWords') {
        return {
          data: enabled ? mockStudyWords : [],
        };
      } else if (queryKey[0] === 'articles' && queryKey[1] === 'author') {
        return {
          data: enabled ? mockAuthorArticles : [],
        };
      } else if (queryKey[0] === 'articles' && queryKey[1] === 'category') {
        return {
          data: enabled ? mockCategoryArticles : [],
        };
      }
      return { data: undefined, isLoading: false };
    }),
  };
});

// Mock services
jest.mock('@/services/articles', () => ({
  articlesService: {
    getArticleById: jest.fn(),
    getArticles: jest.fn(),
  },
}));

jest.mock('@/services/readingList', () => ({
  readingListService: {
    isInReadingList: jest.fn(),
  },
}));

jest.mock('@/services/studyWords', () => ({
  studyWordsService: {
    getStudyWords: jest.fn(),
  },
}));

// Mock data
const mockArticle = {
  id: 123,
  title: 'Test Article',
  content: 'Test content',
  author: {
    id: 456,
    name: 'Test Author',
  },
  category: {
    id: 789,
    name: 'Test Category',
  },
  article_sentences: [
    {
      id: 1,
      position: 2,
      text: 'Second sentence',
      sentence_words: [
        {
          id: 11,
          word_form: 'second',
          position: 1,
          sentence_id: 1,
        },
        {
          id: 12,
          word_form: 'sentence',
          position: 2,
          sentence_id: 1,
        },
      ],
    },
    {
      id: 2,
      position: 1,
      text: 'First sentence',
      sentence_words: [
        {
          id: 21,
          word_form: 'first',
          position: 1,
          sentence_id: 2,
        },
        {
          id: 22,
          word_form: 'sentence',
          position: 2,
          sentence_id: 2,
        },
      ],
    },
  ],
};

const mockStudyWords = [{ sentence_word_id: 11 }, { sentence_word_id: 21 }];

const mockAuthorArticles = [
  { id: 123, title: 'Test Article' },
  { id: 124, title: 'Another Article' },
];

const mockCategoryArticles = [
  { id: 123, title: 'Test Article' },
  { id: 125, title: 'Category Article' },
];

describe('useArticleData', () => {
  // Test data
  const mockArticleId = 123;
  const mockUserId = 'user123';

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected API surface', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('article');
    expect(result.current).toHaveProperty('isLoadingArticle');
    expect(result.current).toHaveProperty('isInReadingList');
    expect(result.current).toHaveProperty('refetchReadingListStatus');
    expect(result.current).toHaveProperty('studyWords');
    expect(result.current).toHaveProperty('selectedWordIds');
    expect(result.current).toHaveProperty('sortedSentences');
    expect(result.current).toHaveProperty('sentenceWordsMap');
    expect(result.current).toHaveProperty('otherArticles');
    expect(result.current).toHaveProperty('otherCategoryArticles');
  });

  it('returns the article data when articleId is provided', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the article data is returned
    expect(result.current.article).toEqual(mockArticle);
    expect(result.current.isLoadingArticle).toBe(false);
  });

  it('returns undefined article data when articleId is not provided', () => {
    const { result } = renderHook(() => useArticleData(undefined, mockUserId));

    // Check that the article data is undefined
    expect(result.current.article).toBeUndefined();
  });

  it('returns reading list status when userId and articleId are provided', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the reading list status is returned
    expect(result.current.isInReadingList).toBe(true);
    expect(typeof result.current.refetchReadingListStatus).toBe('function');
  });

  it('returns false for reading list status when userId or articleId is not provided', () => {
    const { result } = renderHook(() => useArticleData(undefined, mockUserId));

    // Check that the reading list status is false
    expect(result.current.isInReadingList).toBe(false);
  });

  it('returns study words when userId is provided', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the study words are returned
    expect(result.current.studyWords).toEqual(mockStudyWords);
  });

  it('returns empty array for study words when userId is not provided', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, undefined));

    // Check that the study words are an empty array
    expect(result.current.studyWords).toEqual([]);
  });

  it('correctly creates a set of selected word IDs', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the selected word IDs are correct
    expect(result.current.selectedWordIds).toBeInstanceOf(Set);
    expect(result.current.selectedWordIds.size).toBe(2);
    expect(result.current.selectedWordIds.has(11)).toBe(true);
    expect(result.current.selectedWordIds.has(21)).toBe(true);
  });

  it('correctly sorts sentences by position', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the sentences are sorted by position
    expect(result.current.sortedSentences).toHaveLength(2);
    expect(result.current.sortedSentences[0].position).toBe(1);
    expect(result.current.sortedSentences[1].position).toBe(2);
  });

  it('correctly creates a map of sentence IDs to words', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the sentence words map is correct
    expect(result.current.sentenceWordsMap).toBeInstanceOf(Map);
    expect(result.current.sentenceWordsMap.size).toBe(2);

    // Check that the words for each sentence are sorted by position
    const words1 = result.current.sentenceWordsMap.get(1);
    expect(words1).toHaveLength(2);
    expect(words1?.[0].position).toBe(1);
    expect(words1?.[1].position).toBe(2);

    const words2 = result.current.sentenceWordsMap.get(2);
    expect(words2).toHaveLength(2);
    expect(words2?.[0].position).toBe(1);
    expect(words2?.[1].position).toBe(2);
  });

  it('correctly filters out the current article from other articles', () => {
    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the other articles don't include the current article
    expect(result.current.otherArticles).toHaveLength(1);
    expect(result.current.otherArticles[0].id).toBe(124);

    // Check that the other category articles don't include the current article
    expect(result.current.otherCategoryArticles).toHaveLength(1);
    expect(result.current.otherCategoryArticles[0].id).toBe(125);
  });

  it('returns empty arrays when article has no sentences', () => {
    // Override the mock for this test
    const useQueryMock = jest.spyOn(require('@tanstack/react-query'), 'useQuery');

    // Use a more generic type for the mock implementation
    useQueryMock.mockImplementationOnce((...args: any[]) => {
      const options = args[0];
      if (options.queryKey[0] === 'article') {
        return {
          data: { ...mockArticle, article_sentences: [] },
          isLoading: false,
        };
      }
      return { data: undefined, isLoading: false };
    });

    const { result } = renderHook(() => useArticleData(mockArticleId, mockUserId));

    // Check that the sorted sentences are an empty array
    expect(result.current.sortedSentences).toEqual([]);

    // Check that the sentence words map is empty
    expect(result.current.sentenceWordsMap.size).toBe(0);
  });
});
