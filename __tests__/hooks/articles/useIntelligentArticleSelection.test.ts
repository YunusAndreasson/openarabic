import { useIntelligentArticleSelection } from '@/hooks/articles/useIntelligentArticleSelection';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

const mockUseArticlesByDueWords = jest.fn();
jest.mock('@/hooks/articles/useArticlesByDueWords', () => ({
  useArticlesByDueWords: (...args: any[]) => mockUseArticlesByDueWords(...args),
}));

const mockUseArticlesByDifficultWords = jest.fn();
jest.mock('@/hooks/articles/useArticlesByDifficultWords', () => ({
  useArticlesByDifficultWords: (...args: any[]) => mockUseArticlesByDifficultWords(...args),
}));

const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}));

const mockGetBeginnerArticles = jest.fn();
jest.mock('@/utils/articleUtils', () => ({
  getBeginnerArticles: (...args: any[]) => mockGetBeginnerArticles(...args),
}));

const createArticle = (id: number, rootId: number, difficulty = 2) =>
  ({
    id,
    difficulty_level: difficulty,
    article_sentences: [{ sentence_words: [{ root_id: rootId }] }],
  } as any);

const article1 = createArticle(1, 1);
const article2 = createArticle(2, 2);
const article3 = createArticle(3, 3, 1);

let randomSpy: jest.SpyInstance;

beforeEach(() => {
  randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);
});

afterEach(() => {
  randomSpy.mockRestore();
  jest.clearAllMocks();
});

describe('useIntelligentArticleSelection', () => {
  it('returns loading state when no articles provided', () => {
    mockUseArticlesByDueWords.mockReturnValue({
      hasEnoughArticles: false,
      dueWordRootIds: new Set([1]),
    });
    mockUseArticlesByDifficultWords.mockReturnValue({
      hasEnoughArticles: false,
      difficultWordRootIds: new Set([2]),
    });
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useIntelligentArticleSelection(null, []));

    expect(result.current.article).toBeNull();
    expect(result.current.reason).toBe('Loading articles');
    expect(result.current.type).toBe('random');
    expect(result.current.dueWordRootIds.size).toBe(0);
  });

  it('selects article with due words when available', () => {
    const dueSet = new Set([1]);
    mockUseArticlesByDueWords.mockReturnValue({ hasEnoughArticles: true, dueWordRootIds: dueSet });
    mockUseArticlesByDifficultWords.mockReturnValue({
      hasEnoughArticles: false,
      difficultWordRootIds: new Set(),
    });
    mockUseQuery.mockReturnValue({ data: [{ root_id: 1 }], isLoading: false });

    const { result } = renderHook(() =>
      useIntelligentArticleSelection({ id: 'u1' } as any, [article1, article2])
    );

    expect(result.current.article).toBe(article1);
    expect(result.current.type).toBe('due-words');
    expect(result.current.dueWordRootIds).toBe(dueSet);
  });

  it('selects article with difficult words when due word strategy fails', () => {
    const difficultSet = new Set([2]);
    mockUseArticlesByDueWords.mockReturnValue({
      hasEnoughArticles: false,
      dueWordRootIds: new Set(),
    });
    mockUseArticlesByDifficultWords.mockReturnValue({
      hasEnoughArticles: true,
      difficultWordRootIds: difficultSet,
    });
    mockUseQuery.mockReturnValue({ data: [{ root_id: 2 }], isLoading: false });

    const { result } = renderHook(() =>
      useIntelligentArticleSelection({ id: 'u1' } as any, [article1, article2])
    );

    expect(result.current.article).toBe(article2);
    expect(result.current.type).toBe('difficult-words');
    expect(result.current.dueWordRootIds).toEqual(new Set());
  });

  it('selects beginner article when user has no study words', () => {
    mockUseArticlesByDueWords.mockReturnValue({
      hasEnoughArticles: false,
      dueWordRootIds: new Set(),
    });
    mockUseArticlesByDifficultWords.mockReturnValue({
      hasEnoughArticles: false,
      difficultWordRootIds: new Set(),
    });
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });
    mockGetBeginnerArticles.mockReturnValue([article3]);

    const { result } = renderHook(() =>
      useIntelligentArticleSelection({ id: 'u1' } as any, [article1, article2, article3])
    );

    expect(mockGetBeginnerArticles).toHaveBeenCalled();
    expect(result.current.article).toBe(article3);
    expect(result.current.type).toBe('beginner');
  });

  it('falls back to random article', () => {
    mockUseArticlesByDueWords.mockReturnValue({
      hasEnoughArticles: false,
      dueWordRootIds: new Set(),
    });
    mockUseArticlesByDifficultWords.mockReturnValue({
      hasEnoughArticles: false,
      difficultWordRootIds: new Set(),
    });
    mockUseQuery.mockReturnValue({ data: [{ root_id: 1 }], isLoading: false });
    mockGetBeginnerArticles.mockReturnValue([]);

    const { result } = renderHook(() =>
      useIntelligentArticleSelection({ id: 'u1' } as any, [article1, article2])
    );

    expect(result.current.article).toBe(article1);
    expect(result.current.type).toBe('random');
  });
});
