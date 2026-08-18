/**
 * RelatedArticlesByFilter Component Tests
 *
 * The "More from ..." rows in the article reader's footer. Both things locked
 * down here are the bug that made them dead: they could not be pressed at all,
 * and the handler behind them navigated as if the reader were a modal.
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

const mockUseMultipleFeaturedArticles = jest.fn((..._args: unknown[]) => ({
  articles: [RELATED_ARTICLE],
}));
jest.mock('@/hooks/articles/useMultipleFeaturedArticles', () => ({
  useMultipleFeaturedArticles: (...args: unknown[]) => mockUseMultipleFeaturedArticles(...args),
}));

jest.mock('@/hooks/articles/useReadingProgress', () => ({
  useBulkReadingProgress: () => ({ data: new Map() }),
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
};

const renderSection = () =>
  render(
    <RelatedArticlesByFilter
      currentArticleId={1}
      articlesData={[RELATED_ARTICLE] as never}
      filterType="author"
      filterId={7}
      filterName="Ibn Kathir"
    />,
  );

describe('RelatedArticlesByFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMultipleFeaturedArticles.mockReturnValue({ articles: [RELATED_ARTICLE] });
  });

  test('gives each card the gesture-handler Pressable', () => {
    // The reader wraps its whole content in a gesture-handler Pressable to
    // dismiss the word tooltip. An RNGH ancestor wins the gesture arena against
    // descendants on the JS responder system, so a card built on react-native's
    // Pressable silently took no taps at all.
    renderSection();

    expect(mockPlaylistItemCard).toHaveBeenCalledTimes(1);
    const props = mockPlaylistItemCard.mock.calls[0][0] as { PressableComponent: unknown };
    expect(props.PressableComponent).toBe(GestureHandlerPressable);
  });

  test('pushes the next article rather than popping the reader first', () => {
    // article/[id] is a plain pushed screen, not a modal. The old handler called
    // router.back() and pushed 100ms later, which popped the reader to Explore
    // and raced a push into the pop animation.
    renderSection();

    const props = mockPlaylistItemCard.mock.calls[0][0] as { onPress: () => void };
    props.onPress();

    expect(mockBack).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/article/42?headerTitle=The%20Second%20Article');
  });

  test('renders nothing when no related article survives filtering', () => {
    mockUseMultipleFeaturedArticles.mockReturnValue({ articles: [] });

    const { toJSON } = renderSection();

    expect(toJSON()).toBeNull();
    expect(mockPlaylistItemCard).not.toHaveBeenCalled();
  });
});
