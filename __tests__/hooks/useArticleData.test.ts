import { renderHook } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { useArticleData } from '@/hooks/articles/useArticleData';
import * as ReactQuery from '@tanstack/react-query';

const useQueryMock = jest.spyOn(ReactQuery, 'useQuery');

describe('useArticleData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQueryMock.mockReset();
  });

  it('returns processed article data', () => {
    const article = {
      id: 1,
      title: 'Test',
      created_at: '',
      image_url: null,
      difficulty_level: 1,
      category_id: 1,
      author_id: 1,
      summary: '',
      audio_url: null,
      category: { id: 1, name: 'cat' },
      author: { id: 1, name: 'auth' },
      article_sentences: [
        {
          id: 2,
          position: 2,
          arabic: 'b',
          english: 'b',
          article_id: 1,
          audio_url: null,
          sentence_words: [
            {
              id: 20,
              position: 2,
              word_form: 'two',
              english: 'two',
              difficulty_level: 1,
              grammar_note: null,
              root_id: 2,
              sentence_id: 2,
              word_type_id: 1,
              audio_start: null,
              audio_end: null,
            },
            {
              id: 21,
              position: 1,
              word_form: 'one',
              english: 'one',
              difficulty_level: 1,
              grammar_note: null,
              root_id: 1,
              sentence_id: 2,
              word_type_id: 1,
              audio_start: null,
              audio_end: null,
            },
          ],
        },
        {
          id: 1,
          position: 1,
          arabic: 'a',
          english: 'a',
          article_id: 1,
          audio_url: null,
          sentence_words: [
            {
              id: 10,
              position: 1,
              word_form: 'zero',
              english: 'zero',
              difficulty_level: 1,
              grammar_note: null,
              root_id: 1,
              sentence_id: 1,
              word_type_id: 1,
              audio_start: null,
              audio_end: null,
            },
          ],
        },
      ],
    } as any;

    const studyWords = [
      { root_id: 1, user_id: 'u1', created_at: '' },
      { root_id: 2, user_id: 'u1', created_at: '' },
    ];

    useQueryMock.mockImplementation(({ queryKey }) => {
      if (queryKey[0] === 'article') {
        return { data: article, isLoading: false, error: null };
      }
      if (queryKey[0] === 'readingList') {
        return { data: true, isLoading: false, refetch: jest.fn() };
      }
      if (queryKey[0] === 'fsrs-words') {
        return { data: studyWords, isLoading: false, refetch: jest.fn() };
      }
      return { data: undefined, isLoading: false, error: null };
    });

    const { result } = renderHook(() => useArticleData(1, 'u1'));

    expect(result.current.article).toBe(article);
    expect(result.current.isInReadingList).toBe(true);
    expect([...result.current.selectedWordIds]).toEqual([1, 2]);
    expect(result.current.sortedSentences.map(s => s.id)).toEqual([1, 2]);

    const words = result.current.sentenceWordsMap.get(2);
    expect(words?.map(w => w.id)).toEqual([21, 20]);
    expect(words?.[0]).toEqual(
      expect.objectContaining({
        root: { id: 1, letters: '', meaning: null, audio_url: null, audio_url_en: null },
        word_type: { id: 1, name: '' },
      })
    );
  });

  it('handles missing data gracefully', () => {
    useQueryMock.mockImplementation(() => ({
      data: undefined,
      isLoading: false,
      refetch: jest.fn(),
      error: null,
    }));

    const { result } = renderHook(() => useArticleData(undefined, undefined));

    expect(result.current.article).toBeUndefined();
    expect(result.current.sortedSentences).toEqual([]);
    expect(result.current.sentenceWordsMap.size).toBe(0);
    expect(result.current.selectedWordIds.size).toBe(0);
    expect(result.current.isInReadingList).toBe(false);
  });
});

