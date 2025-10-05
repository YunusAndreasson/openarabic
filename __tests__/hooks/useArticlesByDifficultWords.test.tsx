// Unmock React Query to test real hook behavior
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React, { type ReactNode } from 'react';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import { articlesService } from '@/services/articles';
import { strugglingWordsService } from '@/services/strugglingWords';
import type { Article } from '@/types/articles.types';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock only the service layer (network boundary)
jest.mock('@/services/articles');
jest.mock('@/services/strugglingWords');

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;
const mockStrugglingWordsService = strugglingWordsService as jest.Mocked<
  typeof strugglingWordsService
>;

describe('useArticlesByDifficultWords', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('sorts articles by difficult word count with real React Query', async () => {
    const mockDifficultWords: StudyWord[] = [
      createTestWord({
        root_id: 2,
        user_id: 'u1',
        fsrs_difficulty: 8.5,
        fsrs_reps: 5,
        fsrs_lapses: 3,
        fsrs_state: 2,
      }),
      createTestWord({
        root_id: 3,
        user_id: 'u1',
        fsrs_difficulty: 8.0,
        fsrs_reps: 4,
        fsrs_lapses: 2,
        fsrs_state: 2,
      }),
    ];

    const mockArticles: Article[] = [
      {
        id: 1,
        title: 'Article 1',
        created_at: '',
        image_url: null,
        difficulty_level: 1,
        category_id: 1,
        author_id: 1,
        summary: '',
        audio_url: null,
        article_sentences: [
          {
            id: 1,
            position: 1,
            arabic: 'sentence 1',
            english: 'sentence 1',
            article_id: 1,
            audio_url: null,
            sentence_words: [
              {
                id: 1,
                position: 1,
                word_form: 'word1',
                english: 'word1',
                difficulty_level: 1,
                grammar_note: null,
                root_id: 1,
                sentence_id: 1,
                word_type_id: 1,
              },
              {
                id: 2,
                position: 2,
                word_form: 'word2',
                english: 'word2',
                difficulty_level: 1,
                grammar_note: null,
                root_id: 2, // Difficult word
                sentence_id: 1,
                word_type_id: 1,
              },
            ],
          },
          {
            id: 2,
            position: 2,
            arabic: 'sentence 2',
            english: 'sentence 2',
            article_id: 1,
            audio_url: null,
            sentence_words: [
              {
                id: 3,
                position: 1,
                word_form: 'word3',
                english: 'word3',
                difficulty_level: 1,
                grammar_note: null,
                root_id: 3, // Difficult word
                sentence_id: 2,
                word_type_id: 1,
              },
            ],
          },
        ],
      },
      {
        id: 2,
        title: 'Article 2',
        created_at: '',
        image_url: null,
        difficulty_level: 1,
        category_id: 1,
        author_id: 1,
        summary: '',
        audio_url: null,
        article_sentences: [
          {
            id: 3,
            position: 1,
            arabic: 'sentence 3',
            english: 'sentence 3',
            article_id: 2,
            audio_url: null,
            sentence_words: [
              {
                id: 4,
                position: 1,
                word_form: 'word4',
                english: 'word4',
                difficulty_level: 1,
                grammar_note: null,
                root_id: 2, // Difficult word
                sentence_id: 3,
                word_type_id: 1,
              },
              {
                id: 5,
                position: 2,
                word_form: 'word5',
                english: 'word5',
                difficulty_level: 1,
                grammar_note: null,
                root_id: 4,
                sentence_id: 3,
                word_type_id: 1,
              },
            ],
          },
        ],
      },
      {
        id: 3,
        title: 'Article 3',
        created_at: '',
        image_url: null,
        difficulty_level: 1,
        category_id: 1,
        author_id: 1,
        summary: '',
        audio_url: null,
        article_sentences: [
          {
            id: 4,
            position: 1,
            arabic: 'sentence 4',
            english: 'sentence 4',
            article_id: 3,
            audio_url: null,
            sentence_words: [
              {
                id: 6,
                position: 1,
                word_form: 'word6',
                english: 'word6',
                difficulty_level: 1,
                grammar_note: null,
                root_id: 5,
                sentence_id: 4,
                word_type_id: 1,
              },
            ],
          },
        ],
      },
    ];

    // Mock service responses
    mockStrugglingWordsService.getStrugglingWords.mockResolvedValue(mockDifficultWords);
    mockArticlesService.getArticlesWithWordStats.mockResolvedValue(mockArticles);

    const { result } = renderHook(() => useArticlesByDifficultWords('u1', 10), { wrapper });

    // Wait for queries to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Test real processing logic
    expect(result.current.difficultWordsCount).toBe(2);
    expect([...result.current.difficultWordRootIds]).toEqual([2, 3]);

    // Articles should be sorted by difficult word count (Article 1 has 2, Article 2 has 1, Article 3 has 0)
    expect(result.current.articles.map(a => a.id)).toEqual([1, 2]);
    expect(result.current.hasEnoughArticles).toBe(false); // Only 2 articles, need 10
  });

  it('returns loading state when words query is loading', async () => {
    // Don't resolve the promise immediately
    mockStrugglingWordsService.getStrugglingWords.mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );
    mockArticlesService.getArticlesWithWordStats.mockResolvedValue([]);

    const { result } = renderHook(() => useArticlesByDifficultWords('u1', 10), { wrapper });

    // Should be loading while words query is pending
    expect(result.current.isLoading).toBe(true);
    expect(result.current.articles).toEqual([]);
  });

  it('handles no difficult words with real React Query', async () => {
    mockStrugglingWordsService.getStrugglingWords.mockResolvedValue([]);
    mockArticlesService.getArticlesWithWordStats.mockResolvedValue([]);

    const { result } = renderHook(() => useArticlesByDifficultWords('u1', 10), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.difficultWordsCount).toBe(0);
    expect(result.current.difficultWordRootIds.size).toBe(0);
    expect(result.current.articles).toEqual([]);
    expect(result.current.hasEnoughArticles).toBe(false);
  });
});
