/**
 * RelatedArticlesByFilter Component Tests
 *
 * The "More from ..." rows in the article reader's footer. Two things here are
 * the bug that made them dead: they could not be pressed at all, and the
 * handler behind them navigated as if the reader were a modal. The third is a
 * subtitle that repeated the heading on every card.
 *
 * Which texts the list holds is `useRelatedArticles`' job and has its own suite.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Pressable as GestureHandlerPressable } from 'react-native-gesture-handler';

// The shared gesture-handler mock re-exports react-native's Pressable, which
// would make "did the card get the gesture-handler one?" pass whichever
// Pressable the component picked. Swap in something distinguishable so the
// assertion below has teeth.
jest.mock('react-native-gesture-handler', () => {
  const actual = jest.requireActual<Record<string, unknown>>('react-native-gesture-handler');
  const RN = require('react-native');
  const ReactModule = require('react');
  const Pressable = (props: Record<string, unknown>) =>
    ReactModule.createElement(RN.Pressable, props);
  Pressable.displayName = 'GestureHandlerPressable';
  return { ...actual, Pressable };
});

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

jest.mock('@/components/common', () => ({
  SectionLabel: () => null,
}));

const mockPlaylistItemCard = jest.fn((..._args: unknown[]) => null);
jest.mock('@/components/playlist', () => ({
  PlaylistItemCard: (props: Record<string, unknown>) => mockPlaylistItemCard(props),
}));

const mockPrefetchArticle = jest.fn();
jest.mock('@/hooks/articles/useArticlePrefetch', () => ({
  useArticlePrefetch: () => mockPrefetchArticle,
}));

// Reaches for the Supabase storage client, which this test has no business
// standing up just to turn a filename into a URL.
jest.mock('@/utils/storageUtils', () => ({
  generateStorageUrl: (_bucket: string, path: string) => `https://cdn.test/${path}`,
}));

import { RelatedArticlesByFilter } from '@/components/article/RelatedArticlesByFilter';

const RELATED_ARTICLE = {
  id: 42,
  title: 'The Second Article',
  author_id: 7,
  category_id: 3,
  image_url: 'second.jpg',
  author: { name: 'Ibn Kathir' },
  category: { name: 'tafsir' },
  // 8 sentences at 4 a minute
  article_sentences: Array.from({ length: 8 }, (_, index) => ({ id: index })),
};

const renderSection = (
  filterType: 'author' | 'category' = 'author',
  articles: unknown[] = [RELATED_ARTICLE],
) =>
  render(
    <RelatedArticlesByFilter
      filterType={filterType}
      filterName={filterType === 'author' ? 'Ibn Kathir' : 'tafsir'}
      articles={articles as never}
      progressMap={new Map()}
    />,
  );

const firstCardProps = () => mockPlaylistItemCard.mock.calls[0]?.[0] as Record<string, unknown>;

describe('RelatedArticlesByFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('gives each card the gesture-handler Pressable', () => {
    // The reader wraps its whole content in a gesture-handler Pressable to
    // dismiss the word tooltip. An RNGH ancestor wins the gesture arena against
    // descendants on the JS responder system, so a card built on react-native's
    // Pressable silently took no taps at all.
    renderSection();

    expect(mockPlaylistItemCard).toHaveBeenCalledTimes(1);
    expect(firstCardProps().PressableComponent).toBe(GestureHandlerPressable);
  });

  test('pushes the next article rather than popping the reader first', () => {
    // article/[id] is a plain pushed screen, not a modal. The old handler called
    // router.back() and pushed 100ms later, which popped the reader to Explore
    // and raced a push into the pop animation.
    renderSection();

    (firstCardProps().onPress as () => void)();

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/article/[id]', params: { id: 42 } });
  });

  // The one list a learner goes from one text straight to the next was the one
  // that never warmed the next text's cache; every other article list did.
  test('warms the next article on press-in, like every other article list', () => {
    renderSection();

    (firstCardProps().onPressIn as () => void)();

    expect(mockPrefetchArticle).toHaveBeenCalledWith(42);
  });

  // Under "More from Ibn Kathīr" every card used to say "Ibn Kathīr", and under
  // "More in Tafsīr" every card said "Tafsīr".
  test('leaves the author off the cards under "More from {author}"', () => {
    renderSection('author');

    const subtitle = String(firstCardProps().secondaryText);
    expect(subtitle).toMatch(/Tafs/i);
    expect(subtitle).toMatch(/2 min$/);
    expect(subtitle).not.toMatch(/Kath/);
  });

  test('leaves the category off the cards under "More in {category}"', () => {
    renderSection('category');

    const subtitle = String(firstCardProps().secondaryText);
    expect(subtitle).toMatch(/Kath/);
    expect(subtitle).not.toMatch(/Tafs/i);
  });

  test('renders nothing for an empty list', () => {
    const { toJSON } = renderSection('author', []);

    expect(toJSON()).toBeNull();
    expect(mockPlaylistItemCard).not.toHaveBeenCalled();
  });
});
