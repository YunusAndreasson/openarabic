import { renderHook } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import * as ReactQuery from '@tanstack/react-query';

const useQueryMock = ReactQuery.useQuery as jest.Mock;

describe('useArticlesByDifficultWords', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sorts articles by difficult word count', () => {
    const difficultWords = [
      { root_id: 2, user_id: 'u1', created_at: '' },
      { root_id: 3, user_id: 'u1', created_at: '' },
    ];

    const articles = [
      {
        id: 1,
        article_sentences: [
          { id: 1, sentence_words: [{ root_id: 1 }, { root_id: 2 }] },
          { id: 2, sentence_words: [{ root_id: 3 }] },
        ],
      },
      {
        id: 2,
        article_sentences: [
          { id: 3, sentence_words: [{ root_id: 2 }, { root_id: 4 }] },
        ],
      },
      {
        id: 3,
        article_sentences: [
          { id: 4, sentence_words: [{ root_id: 5 }] },
        ],
      },
    ] as any;

    useQueryMock
      .mockReturnValueOnce({ data: difficultWords, isLoading: false })
      .mockReturnValueOnce({ data: articles, isLoading: false });

    const { result } = renderHook(() => useArticlesByDifficultWords('u1', 10));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.difficultWordsCount).toBe(2);
    expect([...result.current.difficultWordRootIds]).toEqual([2, 3]);
    expect(result.current.articles.map(a => a.id)).toEqual([1, 2]);
    expect(result.current.hasEnoughArticles).toBe(false);
  });

  it('returns loading state when words query is loading', () => {
    useQueryMock
      .mockReturnValueOnce({ data: [], isLoading: true })
      .mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useArticlesByDifficultWords('u1', 10));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.articles).toEqual([]);
  });

  it('handles no difficult words', () => {
    useQueryMock
      .mockReturnValueOnce({ data: [], isLoading: false })
      .mockReturnValue({ data: [], isLoading: false });

    const { result } = renderHook(() => useArticlesByDifficultWords('u1', 10));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.difficultWordsCount).toBe(0);
    expect(result.current.difficultWordRootIds.size).toBe(0);
    expect(result.current.articles).toEqual([]);
    expect(result.current.hasEnoughArticles).toBe(false);
  });
});
