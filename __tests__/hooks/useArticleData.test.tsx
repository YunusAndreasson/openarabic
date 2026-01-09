/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

// Unmock React Query to test real hook behavior
jest.unmock('@tanstack/react-query');

import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';

import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { articlesService } from '@/services/articles';
import { bookmarkService } from '@/services/bookmark';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { StudyWord } from '@/types/vocabulary.types';

// Mock only the service layer (network boundary)
jest.mock('@/services/articles');
jest.mock('@/services/bookmark');
jest.mock('@/services/studyWordsFSRS');

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;
const mockBookmarkService = bookmarkService as jest.Mocked<typeof bookmarkService>;
const mockStudyWordsFSRSService = studyWordsFSRSService as jest.Mocked<
  typeof studyWordsFSRSService
>;

describe('useArticleData', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => {
    const { QueryClientProvider } = require('@tanstack/react-query');
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };

  test('returns processed article data with real React Query caching', async () => {
    const mockArticle: Article = {
      id: 1,
      title: 'Test Article',
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
              position: 0,
              word_form: 'كَلِمَة',
              english: 'word',
              difficulty_level: 1,
              grammar_note: null,
              root_id: 1,
              sentence_id: 1,
              word_type_id: 1,
            },
          ],
        },
      ],
    };

    const mockStudyWords: StudyWord[] = [
      createTestWord({ root_id: 1, user_id: 'u1' }),
      createTestWord({ root_id: 2, user_id: 'u1' }),
    ];

    // Mock service responses
    mockArticlesService.getArticleById.mockResolvedValue(mockArticle);
    mockBookmarkService.isInReadingList.mockResolvedValue(true);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue(mockStudyWords);

    const { result } = renderHook(() => useArticleData(1, 'u1'), { wrapper });

    // Wait for queries to resolve
    await waitFor(() => {
      expect(result.current.isLoadingArticle).toBeFalsy();
      expect(result.current.isLoadingStudyWords).toBeFalsy();
    });

    // Test real article processing
    expect(result.current.article).toEqual(mockArticle);
    expect(result.current.isInReadingList).toBeTruthy();

    // Test real memoized processing - selectedWordIds
    expect([...result.current.selectedWordIds]).toEqual([1, 2]);

    // Test real memoized processing - sortedSentences (sorted by position)
    expect(result.current.sortedSentences.map(s => s.id)).toEqual([1, 2]);

    // Test real memoized processing - sentenceWordsMap (sorted by position)
    const words = result.current.sentenceWordsMap.get(2);
    expect(words?.map(w => w.id)).toEqual([21, 20]); // Sorted by position

    // Verify services were called correctly
    expect(mockArticlesService.getArticleById).toHaveBeenCalledWith(1);
    expect(mockBookmarkService.isInReadingList).toHaveBeenCalledWith('u1', 1);
    // getFSRSWords is called with userId and forStats option (no cooldown - uses fsrsQueries.all)
    expect(mockStudyWordsFSRSService.getFSRSWords).toHaveBeenCalledWith('u1', {
      forStats: false,
    });
  });

  test('handles missing data gracefully with real React Query', async () => {
    // Mock services to return no data
    mockArticlesService.getArticleById.mockRejectedValue(new Error('Not found'));
    mockBookmarkService.isInReadingList.mockResolvedValue(false);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);

    const { result } = renderHook(() => useArticleData(undefined, undefined), { wrapper });

    // Article query shouldn't run without articleId
    expect(result.current.article).toBeUndefined();
    expect(result.current.sortedSentences).toEqual([]);
    expect(result.current.sentenceWordsMap.size).toBe(0);
    expect(result.current.selectedWordIds.size).toBe(0);
    expect(result.current.isInReadingList).toBeFalsy();
  });

  test('uses real React Query caching - second render should use cache', async () => {
    const mockArticle: Article = {
      id: 1,
      title: 'Cached Article',
      created_at: '',
      image_url: null,
      difficulty_level: 1,
      category_id: 1,
      author_id: 1,
      summary: '',
      audio_url: null,
      category: { id: 1, name: 'cat' },
      author: { id: 1, name: 'auth' },
      article_sentences: [],
    };

    mockArticlesService.getArticleById.mockResolvedValue(mockArticle);
    mockBookmarkService.isInReadingList.mockResolvedValue(false);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);

    // First render
    const { result: result1 } = renderHook(() => useArticleData(1, 'u1'), { wrapper });
    await waitFor(() => expect(result1.current.isLoadingArticle).toBe(false));

    // Clear mock calls
    mockArticlesService.getArticleById.mockClear();

    // Second render - should use cache
    const { result: result2 } = renderHook(() => useArticleData(1, 'u1'), { wrapper });

    // Article should be immediately available from cache
    expect(result2.current.article).toEqual(mockArticle);
    // Service should NOT be called again (cache hit)
    expect(mockArticlesService.getArticleById).not.toHaveBeenCalled();
  });

  test('handles network failures gracefully with real React Query error state', async () => {
    // Mock service failures
    const networkError = new Error('Network request failed');
    mockArticlesService.getArticleById.mockRejectedValue(networkError);
    mockBookmarkService.isInReadingList.mockResolvedValue(false);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);

    const { result } = renderHook(() => useArticleData(1, 'u1'), { wrapper });

    // Wait for query to fail (no retries in test config)
    // With retry disabled, the query should fail immediately and stop loading
    await waitFor(
      () => {
        expect(result.current.isLoadingArticle).toBeFalsy();
      },
      { timeout: 5000 },
    ); // Increased timeout for async query settling

    // Article should be undefined on error
    expect(result.current.article).toBeUndefined();

    // Service was called but failed
    expect(mockArticlesService.getArticleById).toHaveBeenCalledWith(1);

    // Derived state should handle undefined article gracefully
    expect(result.current.sortedSentences).toEqual([]);
    expect(result.current.sentenceWordsMap.size).toBe(0);
    expect(result.current.selectedWordIds.size).toBe(0);

    // Verify retry configuration (articleQueryOptions.detail has retry: 2)
    // This means 3 total attempts: 1 initial + 2 retries
    expect(mockArticlesService.getArticleById).toHaveBeenCalledTimes(3);
  });
});
