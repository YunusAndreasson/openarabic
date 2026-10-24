/**
 * RelatedArticlesSection: the "More from …" / "More in …" footer of the reader.
 *
 * It used to be handed `queryClient.getQueryData(['articles'])`, read during
 * the reader's render. The React Compiler memoises that read on the client's
 * identity, so a reader opened before the catalogue had loaded — a cold deep
 * link; the catalogue is not persisted — kept an empty footer for the whole
 * visit. The section now subscribes to the catalogue itself.
 *
 * Which texts each list picks is `useRelatedArticles`' job (own suite), so it
 * is reduced here to a plain author/category filter.
 */

import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { RelatedArticlesSection } from '@/components/article/RelatedArticlesSection';
import { createTestQueryClient } from '@/__tests__/helpers/testUtils';
import { articleQueries } from '@/constants/queries';
import { articlesService } from '@/services/articles';
import type { Article } from '@/types/articles.types';

jest.mock('@/services/articles');

jest.mock('@/hooks/articles/useRelatedArticles', () => ({
  useRelatedArticles: ({
    currentArticleId,
    articlesData,
    filterType,
    filterId,
  }: {
    currentArticleId: number;
    articlesData: { id: number; author_id: number; category_id: number }[];
    filterType: 'author' | 'category';
    filterId: number;
  }) => ({
    articles: articlesData.filter(
      candidate =>
        candidate.id !== currentArticleId &&
        (filterType === 'author' ? candidate.author_id : candidate.category_id) === filterId,
    ),
    progressMap: new Map(),
  }),
}));

jest.mock('@/components/article/RelatedArticlesByFilter', () => {
  const { Text } = require('react-native');
  return {
    RelatedArticlesByFilter: ({
      filterType,
      articles,
    }: {
      filterType: string;
      articles: { title: string }[];
    }) =>
      articles.length > 0 ? (
        <Text>{`${filterType}: ${articles.map(related => related.title).join(', ')}`}</Text>
      ) : null,
  };
});

const mockArticlesService = articlesService as jest.Mocked<typeof articlesService>;

const makeArticle = (id: number, title: string, authorId: number, categoryId: number) =>
  ({
    id,
    title,
    author_id: authorId,
    category_id: categoryId,
    author: { name: 'Ibn Kathir' },
    category: { name: 'tafsir' },
  }) as unknown as Article;

const CURRENT = makeArticle(1, 'The Open Article', 7, 3);
const SAME_AUTHOR = makeArticle(2, 'Same Author', 7, 9);
const SAME_CATEGORY = makeArticle(3, 'Same Category', 8, 3);
const CATALOGUE = [CURRENT, SAME_AUTHOR, SAME_CATEGORY];

let queryClient: QueryClient;

const renderSection = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <RelatedArticlesSection article={CURRENT} />
    </QueryClientProvider>,
  );

describe('RelatedArticlesSection', () => {
  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    queryClient.clear();
  });

  test('fills in once the catalogue arrives after the reader opened', async () => {
    // A cold deep link: nothing has loaded the catalogue yet.
    mockArticlesService.getArticles.mockResolvedValue(CATALOGUE);

    renderSection();

    expect(await screen.findByText('author: Same Author')).toBeOnTheScreen();
    expect(screen.getByText('category: Same Category')).toBeOnTheScreen();
    expect(mockArticlesService.getArticles).toHaveBeenCalledTimes(1);
  });

  test('uses a catalogue that is already cached without fetching it again', () => {
    queryClient.setQueryData(articleQueries.all().queryKey, CATALOGUE);

    renderSection();

    expect(screen.getByText('author: Same Author')).toBeOnTheScreen();
    expect(mockArticlesService.getArticles).not.toHaveBeenCalled();
  });
});
