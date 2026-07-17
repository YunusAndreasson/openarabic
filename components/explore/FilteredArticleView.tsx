import { EmptyState, ListSeparator, LoadingState, SectionLabel } from '@/components/common';
import { FlashList } from '@shopify/flash-list';
import { type FC, type JSX, useCallback, useDeferredValue, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { PlaylistItemCard } from '@/components/playlist';
import { LIST_DRAW_DISTANCE_MULTIPLIER, SCROLL_EVENT_THROTTLE } from '@/constants/animation';
import { COMPLETION_THRESHOLD, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useArticlePrefetch } from '@/hooks/articles/useArticlePrefetch';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import type { Article } from '@/types/articles.types';
import { generateStorageUrl } from '@/utils/storageUtils';
import { calculateProgressPercentage } from '@/utils/progressUtils';
import { calculateReadingTime, getAuthorDisplayName } from '@/utils/stringUtils';

// List item types
interface SectionHeaderItem {
  type: 'header';
  id: string;
  title: string;
}

interface ArticleItem {
  type: 'article';
  id: string;
  data: Article;
}

type ListItem = SectionHeaderItem | ArticleItem;

const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM;

const SeparatorComponent = () => <ListSeparator height={LAYOUT.SPACING.SMALL} />;

const STATIC_STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  footerSpacer: {
    height: LAYOUT.SPACING.LARGE,
  },
});

const FooterComponent = () => <View style={STATIC_STYLES.footerSpacer} />;

// Stable list callbacks — FlashList v2 treats changed identities as reasons to
// re-render every visible cell, so keep these at module scope.
const keyExtractor = (item: ListItem) => item.id;
const getItemType = (item: ListItem) => item.type;

const THEMED_VIEW_PROPS = {
  includeBottomInset: false,
  safeAreaEdges: ['left', 'right'] as ('left' | 'right' | 'bottom' | 'top')[],
  style: STATIC_STYLES.container,
};

/**
 * Reorders articles so no two consecutive items share the same image_url.
 * Preserves all articles — does not remove duplicates.
 */
function spreadByImageUrl(articles: Article[]): Article[] {
  if (articles.length === 0) return [];
  const result: Article[] = [];
  const remaining = [...articles];
  let lastImageUrl: string | null = null;

  while (remaining.length > 0) {
    const nextIdx = remaining.findIndex(a => !a.image_url || a.image_url !== lastImageUrl);
    if (nextIdx === -1) {
      result.push(...remaining);
      break;
    }
    const next = remaining[nextIdx] as Article;
    result.push(next);
    lastImageUrl = next.image_url ?? null;
    remaining.splice(nextIdx, 1);
  }
  return result;
}

/**
 * Groups articles by progress state and flattens them with section headers
 */
function groupArticlesWithHeaders(
  articles: Article[],
  progressMap: Map<number, { last_sentence_read: number; total_sentences: number }>,
): ListItem[] {
  if (articles.length === 0) return [];

  // Group articles by progress state
  const continueReading: Article[] = [];
  const unread: Article[] = [];
  const completed: Article[] = [];

  articles.forEach(article => {
    const progressData = progressMap.get(article.id);
    const progress = progressData
      ? calculateProgressPercentage(progressData.last_sentence_read, progressData.total_sentences)
      : 0;
    if (progress > 0 && progress < COMPLETION_THRESHOLD) {
      continueReading.push(article);
    } else if (progress >= COMPLETION_THRESHOLD) {
      completed.push(article);
    } else {
      unread.push(article);
    }
  });

  // Flatten into list items with headers
  const listItems: ListItem[] = [];

  if (continueReading.length > 0) {
    listItems.push({ type: 'header', id: 'header-continue', title: STRINGS.CONTINUE_READING });
    spreadByImageUrl(continueReading).forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  if (unread.length > 0) {
    listItems.push({ type: 'header', id: 'header-unread', title: STRINGS.UNREAD });
    spreadByImageUrl(unread).forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  if (completed.length > 0) {
    listItems.push({ type: 'header', id: 'header-completed', title: STRINGS.COMPLETED });
    spreadByImageUrl(completed).forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  return listItems;
}

interface FilteredArticleViewProps {
  articles: Article[];
  onArticlePress?: (article: Article) => void;
}

/**
 * A specialized component for displaying filtered articles
 */
export const FilteredArticleView: FC<FilteredArticleViewProps> = ({ articles, onArticlePress }) => {
  const insets = useSafeAreaInsets();

  const {
    articles: visibleArticles,
    progressMap,
    isProgressLoading,
  } = useFilteredArticles(articles);

  // React 19: Defer article grouping to keep scrolling smooth during re-sorts
  const deferredVisibleArticles = useDeferredValue(visibleArticles);

  const listData = useMemo(
    () => groupArticlesWithHeaders(deferredVisibleArticles, progressMap),
    [deferredVisibleArticles, progressMap],
  );

  const listContentStyle = useMemo(
    () => ({
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: LAYOUT.SCREEN_PADDING.bottomDefault + insets.bottom,
      paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    }),
    [insets.bottom],
  );

  const prefetchArticle = useArticlePrefetch();

  const shouldShowLoading =
    isProgressLoading && visibleArticles.length > 0 && progressMap.size === 0;

  // No entering/exiting layout animations here: FlashList v2 recycles cells,
  // and mount animations re-fire on recycled rows during fast scrolls.
  const renderItem = useCallback(
    ({ item }: { item: ListItem }): JSX.Element => {
      if (item.type === 'header') {
        return <SectionLabel title={item.title} />;
      }

      const article = item.data;
      const progress = progressMap.get(article.id);
      const progressPercentage = progress
        ? calculateProgressPercentage(progress.last_sentence_read, progress.total_sentences)
        : 0;

      const readingTime = calculateReadingTime(article.article_sentences.length);
      const secondaryText = `${getAuthorDisplayName(article.author.name)} · ${readingTime}`;

      return (
        <PlaylistItemCard
          title={article.title}
          secondaryText={secondaryText}
          imageUrl={generateStorageUrl('images', article.image_url)}
          articleId={article.id}
          onPress={onArticlePress ? () => onArticlePress(article) : undefined}
          onPressIn={() => prefetchArticle(article.id)}
          progressPercentage={progressPercentage}
        />
      );
    },
    [progressMap, onArticlePress, prefetchArticle],
  );

  if (shouldShowLoading) {
    return (
      <ThemedView {...THEMED_VIEW_PROPS}>
        <LoadingState />
      </ThemedView>
    );
  }

  if (listData.length === 0) {
    return (
      <ThemedView {...THEMED_VIEW_PROPS}>
        <EmptyState
          icon="library-outline"
          title={STRINGS.CATEGORY_EMPTY_TITLE}
          hint={STRINGS.CATEGORY_EMPTY_HINT}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView {...THEMED_VIEW_PROPS}>
      <FlashList<ListItem>
        data={listData}
        drawDistance={ITEM_HEIGHT * LIST_DRAW_DISTANCE_MULTIPLIER}
        keyExtractor={keyExtractor}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={listContentStyle}
        ItemSeparatorComponent={SeparatorComponent}
        ListFooterComponent={FooterComponent}
        renderItem={renderItem}
        getItemType={getItemType}
      />
    </ThemedView>
  );
};

FilteredArticleView.displayName = 'FilteredArticleView';
