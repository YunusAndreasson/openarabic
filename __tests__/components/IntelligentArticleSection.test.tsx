import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { describe, it, expect, jest } from '@jest/globals';

import IntelligentArticleSection from '@/components/home/IntelligentArticleSection';

const mockUseIntelligentArticleSelection = jest.fn();
jest.mock('@/hooks/articles/useIntelligentArticleSelection', () => ({
  useIntelligentArticleSelection: (...args: any[]) =>
    mockUseIntelligentArticleSelection(...args),
}));

const mockUseAuth = jest.fn();
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/components/home/FeaturedSection', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return ({ article }: { article: any }) => (
    <Text testID="featured">{article?.title}</Text>
  );
});

const createArticle = (id: number, title: string) =>
  ({ id, title } as any);

const onArticlePress = jest.fn();

describe('IntelligentArticleSection', () => {
  it('renders featured article when available', () => {
    const user = { id: 'u1' } as any;
    const article = createArticle(1, 'A1');
    mockUseAuth.mockReturnValue({ user });
    mockUseIntelligentArticleSelection.mockReturnValue({
      article,
      reason: 'test',
      type: 'random',
      dueWordRootIds: new Set<number>(),
    });

    const { getByTestId } = render(
      <IntelligentArticleSection
        articlesData={[article]}
        refreshKey={0}
        onArticlePress={onArticlePress}
      />,
    );

    expect(mockUseIntelligentArticleSelection).toHaveBeenCalledWith(user, [article]);
    expect(getByTestId('featured').props.children).toBe('A1');
  });

  it('renders even when user is null', () => {
    const article = createArticle(2, 'A2');
    mockUseAuth.mockReturnValue({ user: null });
    mockUseIntelligentArticleSelection.mockReturnValue({
      article,
      reason: 'test',
      type: 'random',
      dueWordRootIds: new Set<number>(),
    });

    const { getByTestId } = render(
      <IntelligentArticleSection
        articlesData={[article]}
        refreshKey={0}
        onArticlePress={onArticlePress}
      />,
    );

    expect(mockUseIntelligentArticleSelection).toHaveBeenCalledWith(null, [article]);
    expect(getByTestId('featured').props.children).toBe('A2');
  });

  it('returns null when no article selected', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockUseIntelligentArticleSelection.mockReturnValue({
      article: null,
      reason: 'none',
      type: 'random',
      dueWordRootIds: new Set<number>(),
    });

    const { queryByTestId } = render(
      <IntelligentArticleSection
        articlesData={[]}
        refreshKey={0}
        onArticlePress={onArticlePress}
      />,
    );

    expect(queryByTestId('featured')).toBeNull();
  });
});

