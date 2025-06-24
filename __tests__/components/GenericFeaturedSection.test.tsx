import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import GenericFeaturedSection from '../../components/home/GenericFeaturedSection';
import type { Article } from '../../types/articles.types';

// Mock the useFeaturedArticleSelection hook
const mockUseFeaturedArticleSelection = jest.fn();
jest.mock('@/hooks/articles/useFeaturedArticleSelection', () => ({
  useFeaturedArticleSelection: (...args: any[]) => mockUseFeaturedArticleSelection(...args),
}));

// Mock the FeaturedSection component
jest.mock('@/components/home/FeaturedSection', () => {
  const { Text } = require('react-native');
  return function MockFeaturedSection({ article }: { article: Article }) {
    return <Text testID="featured-section">{article.title}</Text>;
  };
});

const createArticle = (id: number, title: string): Article => ({ id, title } as Article);

const onArticlePress = jest.fn();

describe('GenericFeaturedSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders FeaturedSection when article is selected', () => {
    const article = createArticle(1, 'Test Article');
    mockUseFeaturedArticleSelection.mockReturnValue({
      article,
      reason: 'Test reason',
      type: 'random',
      dueWordRootIds: new Set<number>(),
    });

    const { getByTestId } = render(
      <GenericFeaturedSection
        articlesData={[article]}
        refreshKey={0}
        scope="test"
        onArticlePress={onArticlePress}
      />
    );

    expect(getByTestId('featured-section').props.children).toBe('Test Article');
  });

  it('returns null when no article is selected', () => {
    mockUseFeaturedArticleSelection.mockReturnValue({
      article: null,
      reason: 'No articles',
      type: 'random',
      dueWordRootIds: new Set<number>(),
    });

    const { queryByTestId } = render(
      <GenericFeaturedSection
        articlesData={[]}
        refreshKey={0}
        scope="test"
        onArticlePress={onArticlePress}
      />
    );

    expect(queryByTestId('featured-section')).toBeNull();
  });

  it('calls useFeaturedArticleSelection with correct parameters', () => {
    const articles = [createArticle(1, 'Article 1'), createArticle(2, 'Article 2')];
    mockUseFeaturedArticleSelection.mockReturnValue({
      article: articles[0],
      reason: 'Test',
      type: 'random',
      dueWordRootIds: new Set<number>(),
    });

    render(
      <GenericFeaturedSection
        articlesData={articles}
        refreshKey={5}
        scope="category-123"
        onArticlePress={onArticlePress}
      />
    );

    expect(mockUseFeaturedArticleSelection).toHaveBeenCalledWith(articles, 5, 'category-123');
  });

  it('uses default scope when not provided', () => {
    const articles = [createArticle(1, 'Test Article')];
    mockUseFeaturedArticleSelection.mockReturnValue({
      article: articles[0],
      reason: 'Test',
      type: 'random',
      dueWordRootIds: new Set<number>(),
    });

    render(
      <GenericFeaturedSection
        articlesData={articles}
        refreshKey={0}
        onArticlePress={onArticlePress}
      />
    );

    expect(mockUseFeaturedArticleSelection).toHaveBeenCalledWith(articles, 0, 'global');
  });
});
