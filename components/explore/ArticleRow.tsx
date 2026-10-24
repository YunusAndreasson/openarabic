import type { ComponentType } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ListSeparator } from '@/components/common';
import { PlaylistItemCard } from '@/components/playlist';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import type { Article } from '@/types/articles.types';
import type { PressableLikeProps } from '@/types/ui/base.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import { getArticleMetadataWithoutCategory } from '@/utils/stringUtils';

interface ArticleRowProps {
  article: Article;
  /** Defaults to the catalogue's own subtitle (the metadata minus the category). */
  secondaryText?: string;
  progressPercentage?: number;
  onPress?: (article: Article) => void;
  /** The rail size: a smaller title for a card in a horizontal rail. */
  compact?: boolean;
  /** Forwarded to the card. Inside the article reader, pass `ReaderPressable`. */
  PressableComponent?: ComponentType<PressableLikeProps>;
}

/**
 * An article as a row: its card, wired to warm the reader's cache on press-in.
 *
 * The filter list, the search results, the Explore rails and the reader's
 * "More from …" lists each mapped an `Article` onto a `PlaylistItemCard` by
 * hand — and three of the four prefetched the article on press-in while the
 * reader's own related rows, the one place a learner goes straight from one
 * text to the next, did not.
 */
export function ArticleRow({
  article,
  secondaryText,
  progressPercentage,
  onPress,
  compact,
  PressableComponent,
}: ArticleRowProps) {
  const prefetchArticle = useArticlePrefetch();

  return (
    <PlaylistItemCard
      title={article.title}
      secondaryText={secondaryText ?? getArticleMetadataWithoutCategory(article)}
      imageUrl={generateStorageUrl('images', article.image_url)}
      articleId={article.id}
      progressPercentage={progressPercentage}
      onPress={onPress ? () => onPress(article) : undefined}
      onPressIn={() => prefetchArticle(article.id)}
      compact={compact}
      PressableComponent={PressableComponent}
    />
  );
}

/** How far past the viewport a FlashList of article rows renders ahead. */
export const ARTICLE_LIST_DRAW_DISTANCE =
  LAYOUT.CARD.HEIGHT.LIST_ITEM * LIST_DRAW_DISTANCE_MULTIPLIER;

/** The gap between article rows, as a list's `ItemSeparatorComponent`. */
export const ArticleRowSeparator = () => <ListSeparator height={LAYOUT.SPACING.SMALL} />;

/** The content inset of a full-screen list of article rows. */
export function useArticleListContentStyle() {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SCREEN_PADDING.bottomDefault + insets.bottom,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  };
}
