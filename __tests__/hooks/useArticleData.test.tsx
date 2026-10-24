/**
 * Hook Tests
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 * - Note: No test.concurrent() - hook tests use renderHook
 * - Note: jest.mocked() used for type-safe mocking where needed
 */

import type { QueryClient } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { createHookTestWrapper, type HookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { useArticleData } from '@/hooks/articles/useArticleData';
import { articlesService } from '@/services/articles';
import { bookmarkService } from '@/services/bookmark';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { Article } from '@/types/articles.types';
import type { BookmarkItem } from '@/types/bookmark.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { articleId, authorId, categoryId, rootId, userId } from '@/__tests__/helpers/ids';

// Mock only the service layer (network boundary)
jest.mock('@/services/articles');
jest.mock('@/services/bookmark');
jest.mock('@/services/studyWordsFSRS');

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;
const mockBookmarkService = bookmarkService as jest.Mocked<typeof bookmarkService>;
const mockStudyWordsFSRSService = studyWordsFSRSService as jest.Mocked<
  typeof studyWordsFSRSService
>;

/** Every queryFn calls its service as a managed request (reported once by the cache). */
const MANAGED = expect.objectContaining({ managed: true });

/** A reading-list row for an article; only `article_id` matters to saved state. */
const savedArticle = (id: number) =>
  ({ user_id: 'u1', article_id: id, added_at: '2024-01-01T00:00:00Z' }) as unknown as BookmarkItem;

describe('useArticleData', () => {
  let queryClient: QueryClient;
  let wrapper: HookTestWrapper;

  beforeEach(() => {
    jest.clearAllMocks();
    ({ wrapper, queryClient } = createHookTestWrapper());
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('returns processed article data with real React Query caching', async () => {
    const mockArticle: Article = {
      id: articleId(1),
      title: 'Test Article',
      created_at: '',
      published: true,
      book: null,
      audio_url_bilingual: null,
      content_hash: 'test-hash',
      image_url: '',
      difficulty_level: 1,
      category_id: categoryId(1),
      author_id: authorId(1),
      summary: '',
      audio_url: '',
      category: { id: 1, name: 'cat' },
      author: { id: 1, name: 'auth' },
      article_sentences: [
        {
          id: 2,
          position: 2,
          arabic: 'b',
          english: 'b',
          article_id: 1,
          audio_url: '',
          arabic_repeat: false,
          english_repeat: false,
          audio_url_bilingual: '',
          audio_url_english: '',
          sentence_words: [
            {
              id: 20,
              position: 2,
              word_form: 'two',
              english: 'two',
              difficulty_level: 1,
              grammar_note: null,
              root_id: rootId(2),
              sentence_id: 2,
              word_type_id: 1,
              audio_url: null,
              root: null,
              word_type: null,
            },
            {
              id: 21,
              position: 1,
              word_form: 'one',
              english: 'one',
              difficulty_level: 1,
              grammar_note: null,
              root_id: rootId(1),
              sentence_id: 2,
              word_type_id: 1,
              audio_url: null,
              root: null,
              word_type: null,
            },
          ],
        },
        {
          id: 1,
          position: 1,
          arabic: 'a',
          english: 'a',
          article_id: 1,
          audio_url: '',
          arabic_repeat: false,
          english_repeat: false,
          audio_url_bilingual: '',
          audio_url_english: '',
          sentence_words: [
            {
              id: 10,
              position: 0,
              word_form: 'كَلِمَة',
              english: 'word',
              difficulty_level: 1,
              grammar_note: null,
              root_id: rootId(1),
              sentence_id: 1,
              word_type_id: 1,
              audio_url: null,
              root: null,
              word_type: null,
            },
          ],
        },
      ],
    };

    const mockStudyWords: StudyWord[] = [
      createTestWord({ root_id: rootId(1), user_id: userId('u1') }),
      createTestWord({ root_id: rootId(2), user_id: userId('u1') }),
    ];

    // Mock service responses
    mockArticlesService.getArticleById.mockResolvedValue(mockArticle);
    mockBookmarkService.getReadingList.mockResolvedValue([savedArticle(1)]);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue(mockStudyWords);

    const { result } = renderHook(() => useArticleData(articleId(1), 'u1'), { wrapper });

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
    expect(mockArticlesService.getArticleById).toHaveBeenCalledWith(1, MANAGED);
    // Saved state is read off the reading list, not asked of the server per article
    expect(mockBookmarkService.getReadingList).toHaveBeenCalledWith('u1', MANAGED);
    // getFSRSWords is called with userId and forStats option (no cooldown - uses fsrsQueries.all)
    expect(mockStudyWordsFSRSService.getFSRSWords).toHaveBeenCalledWith(
      'u1',
      { forStats: false },
      MANAGED,
    );
  });

  test('handles missing data gracefully with real React Query', async () => {
    // Mock services to return no data
    mockArticlesService.getArticleById.mockRejectedValue(new Error('Not found'));
    mockBookmarkService.getReadingList.mockResolvedValue([]);
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
      id: articleId(1),
      title: 'Cached Article',
      created_at: '',
      published: true,
      book: null,
      audio_url_bilingual: null,
      content_hash: 'test-hash',
      image_url: '',
      difficulty_level: 1,
      category_id: categoryId(1),
      author_id: authorId(1),
      summary: '',
      audio_url: '',
      category: { id: 1, name: 'cat' },
      author: { id: 1, name: 'auth' },
      article_sentences: [],
    };

    mockArticlesService.getArticleById.mockResolvedValue(mockArticle);
    mockBookmarkService.getReadingList.mockResolvedValue([]);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);

    // First render
    const { result: result1 } = renderHook(() => useArticleData(articleId(1), 'u1'), { wrapper });
    await waitFor(() => expect(result1.current.isLoadingArticle).toBe(false));

    // Clear mock calls
    mockArticlesService.getArticleById.mockClear();

    // Second render - should use cache
    const { result: result2 } = renderHook(() => useArticleData(articleId(1), 'u1'), { wrapper });

    // Article should be immediately available from cache
    expect(result2.current.article).toEqual(mockArticle);
    // Service should NOT be called again (cache hit)
    expect(mockArticlesService.getArticleById).not.toHaveBeenCalled();
  });

  test('handles network failures gracefully with real React Query error state', async () => {
    // Mock service failures
    const networkError = new Error('Network request failed');
    mockArticlesService.getArticleById.mockRejectedValue(networkError);
    mockBookmarkService.getReadingList.mockResolvedValue([]);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);

    const { result } = renderHook(() => useArticleData(articleId(1), 'u1'), { wrapper });

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
    expect(mockArticlesService.getArticleById).toHaveBeenCalledWith(1, MANAGED);

    // Derived state should handle undefined article gracefully
    expect(result.current.sortedSentences).toEqual([]);
    expect(result.current.sentenceWordsMap.size).toBe(0);
    expect(result.current.selectedWordIds.size).toBe(0);

    // Verify retry configuration (articleQueryOptions.detail has retry: 2)
    // This means 3 total attempts: 1 initial + 2 retries
    expect(mockArticlesService.getArticleById).toHaveBeenCalledTimes(3);

    // No catalogue cached, so the failure cannot be told apart from a removed
    // article — it is offered as retryable, not announced as "not found".
    expect(result.current.isArticleError).toBe(true);
    expect(result.current.isArticleMissing).toBe(false);
  });

  test('reports an article the published catalogue does not list as missing, not as a failure', async () => {
    mockArticlesService.getArticleById.mockRejectedValue(new Error('Article not found: 99'));
    mockBookmarkService.getReadingList.mockResolvedValue([]);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);
    // The catalogue lists article 1 only. Kept past the test client's gcTime 0,
    // since nothing observes it here.
    queryClient.setQueryDefaults(['articles'], { gcTime: Infinity });
    queryClient.setQueryData(['articles'], [{ id: articleId(1) }]);

    const { result } = renderHook(() => useArticleData(articleId(99), 'u1'), { wrapper });

    await waitFor(() => expect(result.current.isLoadingArticle).toBe(false), { timeout: 5000 });

    expect(result.current.isArticleMissing).toBe(true);
    expect(result.current.isArticleError).toBe(false);
  });

  test('treats a failed fetch of a listed article as retryable, and a retry as loading', async () => {
    mockArticlesService.getArticleById.mockRejectedValue(new Error('Network request failed'));
    mockBookmarkService.getReadingList.mockResolvedValue([]);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);
    queryClient.setQueryDefaults(['articles'], { gcTime: Infinity });
    queryClient.setQueryData(['articles'], [{ id: articleId(1) }]);

    const { result } = renderHook(() => useArticleData(articleId(1), 'u1'), { wrapper });

    await waitFor(() => expect(result.current.isArticleError).toBe(true), { timeout: 5000 });
    expect(result.current.isArticleMissing).toBe(false);

    // The retry is in flight: loading again, not still an error
    mockArticlesService.getArticleById.mockReturnValue(new Promise(() => undefined));
    act(() => {
      result.current.refetchArticle();
    });

    await waitFor(() => expect(result.current.isLoadingArticle).toBe(true));
    expect(result.current.isArticleError).toBe(false);
  });

  // The saved state is a select of the reading list, so saving or removing the
  // article anywhere (the playlist's delete included) shows here at once; the
  // old per-article query never refetched on mount and went stale.
  test('derives the saved state from the cached reading list', async () => {
    mockArticlesService.getArticleById.mockReturnValue(new Promise(() => undefined));
    mockBookmarkService.getReadingList.mockResolvedValue([savedArticle(2)]);
    mockStudyWordsFSRSService.getFSRSWords.mockResolvedValue([]);

    const { result } = renderHook(() => useArticleData(articleId(1), 'u1'), { wrapper });

    await waitFor(() => expect(mockBookmarkService.getReadingList).toHaveBeenCalled());
    expect(result.current.isInReadingList).toBe(false);

    act(() => {
      queryClient.setQueryData(['readingList', 'u1'], [savedArticle(2), savedArticle(1)]);
    });
    await waitFor(() => expect(result.current.isInReadingList).toBe(true));

    act(() => {
      queryClient.setQueryData(['readingList', 'u1'], [savedArticle(2)]);
    });
    await waitFor(() => expect(result.current.isInReadingList).toBe(false));
  });
});
