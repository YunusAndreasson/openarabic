import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';

import IntelligentArticleSection from '../../components/home/IntelligentArticleSection';
import type { Article } from '../../types/articles.types';

// Mock the HorizontalFeaturedSection since that's what IntelligentArticleSection uses
jest.mock('@/components/home/HorizontalFeaturedSection', () => {
  const { Text } = require('react-native');
  return function MockHorizontalFeaturedSection({
    scope,
    articlesData,
    refreshKey,
  }: {
    scope: string;
    articlesData: Article[];
    refreshKey: number;
  }) {
    return (
      <Text testID="horizontal-featured-section">
        {`scope:${scope},articles:${articlesData.length},refresh:${refreshKey}`}
      </Text>
    );
  };
});

// Mock the GenericFeaturedSection since IntelligentArticleSection is just a wrapper
jest.mock('@/components/home/GenericFeaturedSection', () => {
  const { Text } = require('react-native');
  return function MockGenericFeaturedSection({
    scope,
    articlesData,
    refreshKey,
  }: {
    scope: string;
    articlesData: Article[];
    refreshKey: number;
  }) {
    return (
      <Text testID="generic-featured-section">
        {`scope:${scope},articles:${articlesData.length},refresh:${refreshKey}`}
      </Text>
    );
  };
});

const createArticle = (id: number, title: string): Article => ({ id, title } as Article);

const onArticlePress = jest.fn();

describe('IntelligentArticleSection', () => {
  it('renders HorizontalFeaturedSection with correct props', () => {
    const articles = [createArticle(1, 'Test Article')];
    const refreshKey = 5;

    const { getByTestId } = render(
      <IntelligentArticleSection
        articlesData={articles}
        refreshKey={refreshKey}
        onArticlePress={onArticlePress}
      />
    );

    const mockComponent = getByTestId('horizontal-featured-section');
    expect(mockComponent.props.children).toBe('scope:global,articles:1,refresh:5');
  });

  it('passes through empty articles array', () => {
    const { getByTestId } = render(
      <IntelligentArticleSection articlesData={[]} refreshKey={0} onArticlePress={onArticlePress} />
    );

    const mockComponent = getByTestId('horizontal-featured-section');
    expect(mockComponent.props.children).toBe('scope:global,articles:0,refresh:0');
  });

  it('updates when props change', () => {
    const initialArticles = [createArticle(1, 'Article 1')];
    const { getByTestId, rerender } = render(
      <IntelligentArticleSection
        articlesData={initialArticles}
        refreshKey={0}
        onArticlePress={onArticlePress}
      />
    );

    expect(getByTestId('horizontal-featured-section').props.children).toBe(
      'scope:global,articles:1,refresh:0'
    );

    const updatedArticles = [createArticle(1, 'Article 1'), createArticle(2, 'Article 2')];
    rerender(
      <IntelligentArticleSection
        articlesData={updatedArticles}
        refreshKey={1}
        onArticlePress={onArticlePress}
      />
    );

    expect(getByTestId('horizontal-featured-section').props.children).toBe(
      'scope:global,articles:2,refresh:1'
    );
  });
});
