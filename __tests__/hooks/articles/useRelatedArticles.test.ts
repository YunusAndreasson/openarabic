/**
 * useRelatedArticles — the texts for one "More from …" list in the reader.
 *
 * The author and category lists are chosen separately, and a text by this
 * author in this category qualifies for both. `excludeIds` is how the category
 * list leaves out what the author list already shows.
 *
 * `useMultipleFeaturedArticles` is mocked to pass its candidates straight
 * through, so these tests see the filtering this hook adds around it.
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';

import type { Article } from '@/types/articles.types';

const mockProgress = new Map<number, { last_sentence_read: number; total_sentences: number }>();

jest.mock('@/hooks/articles/useMultipleFeaturedArticles', () => ({
  useMultipleFeaturedArticles: (articles: unknown[]) => ({ articles }),
}));

jest.mock('@/hooks/articles/useReadingProgress', () => ({
  useBulkReadingProgress: () => ({ data: mockProgress }),
}));

import { useRelatedArticles } from '@/hooks/articles/useRelatedArticles';

const article = (id: number, overrides: Record<string, unknown> = {}) =>
  ({
    id,
    author_id: 7,
    category_id: 3,
    image_url: `image-${id}.jpg`,
    ...overrides,
  }) as unknown as Article;

const CURRENT = article(1);
const SAME_AUTHOR_AND_CATEGORY = article(2);
const SAME_CATEGORY_ONLY = article(3, { author_id: 8 });
const ELSEWHERE = article(4, { author_id: 8, category_id: 9 });
const ARTICLES = [CURRENT, SAME_AUTHOR_AND_CATEGORY, SAME_CATEGORY_ONLY, ELSEWHERE];

const ids = (articles: Article[]) => articles.map(entry => entry.id);

describe('useRelatedArticles', () => {
  beforeEach(() => {
    mockProgress.clear();
  });

  test('lists the filter matches other than the article being read', () => {
    const { result } = renderHook(() =>
      useRelatedArticles({
        currentArticleId: 1,
        articlesData: ARTICLES,
        filterType: 'category',
        filterId: 3,
      }),
    );

    expect(ids(result.current.articles)).toEqual([2, 3]);
  });

  test('leaves out what the other list on the screen already shows', () => {
    const { result } = renderHook(() =>
      useRelatedArticles({
        currentArticleId: 1,
        articlesData: ARTICLES,
        filterType: 'category',
        filterId: 3,
        excludeIds: new Set([SAME_AUTHOR_AND_CATEGORY.id]),
      }),
    );

    expect(ids(result.current.articles)).toEqual([3]);
  });

  test('leaves out texts read past 20%', () => {
    // 3 of 10 sentences read is 30%
    mockProgress.set(SAME_CATEGORY_ONLY.id, { last_sentence_read: 2, total_sentences: 10 });

    const { result } = renderHook(() =>
      useRelatedArticles({
        currentArticleId: 1,
        articlesData: ARTICLES,
        filterType: 'category',
        filterId: 3,
      }),
    );

    expect(ids(result.current.articles)).toEqual([2]);
  });
});
