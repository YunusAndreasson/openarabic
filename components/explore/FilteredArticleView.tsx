import { EmptyState, LoadingState, SectionLabel } from '@/components/common';
import { FlashList } from '@shopify/flash-list';
import { type JSX, useCallback, useDeferredValue, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedView } from '@/components/primitives/ThemedView';
import { SCROLL_EVENT_THROTTLE } from '@/constants/animation';
import { COMPLETION_THRESHOLD, LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import type { Article } from '@/types/articles.types';
import { getArticleProgressPercentage, type ReadingProgressLookup } from '@/utils/progressUtils';

import {
  ARTICLE_LIST_DRAW_DISTANCE,
  ArticleRow,
  ArticleRowSeparator,
  useArticleListContentStyle,
} from './ArticleRow';

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

const STATIC_STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  footerSpacer: {
    height: LAYOUT.SPACING.LARGE,
  },
  // The list contentContainer already applies the screen inset — zero out the
  // label's own so it stays flush with the card edges below it.
  flushLabel: {
    paddingHorizontal: 0,
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
  progressMap: ReadingProgressLookup,
): ListItem[] {
  if (articles.length === 0) return [];

  // Group articles by progress state
  const continueReading: Article[] = [];
  const unread: Article[] = [];
  const completed: Article[] = [];

  articles.forEach(article => {
    const progress = getArticleProgressPercentage(progressMap, article.id);
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

  const sections = [
    { id: 'header-continue', title: STRINGS.CONTINUE_READING, articles: continueReading },
    { id: 'header-unread', title: STRINGS.UNREAD, articles: unread },
    { id: 'header-completed', title: STRINGS.COMPLETED, articles: completed },
  ];

  for (const section of sections) {
    if (section.articles.length === 0) continue;
    listItems.push({ type: 'header', id: section.id, title: section.title });
    spreadByImageUrl(section.articles).forEach(article => {
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
export const FilteredArticleView = ({ articles, onArticlePress }: FilteredArticleViewProps) => {
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

  const listContentStyle = useArticleListContentStyle();

  const shouldShowLoading =
    isProgressLoading && visibleArticles.length > 0 && progressMap.size === 0;

  // No entering/exiting layout animations here: FlashList v2 recycles cells,
  // and mount animations re-fire on recycled rows during fast scrolls.
  const renderItem = useCallback(
    ({ item }: { item: ListItem }): JSX.Element => {
      if (item.type === 'header') {
        return <SectionLabel title={item.title} style={STATIC_STYLES.flushLabel} />;
      }

      return (
        <ArticleRow
          article={item.data}
          progressPercentage={getArticleProgressPercentage(progressMap, item.data.id)}
          onPress={onArticlePress}
        />
      );
    },
    [progressMap, onArticlePress],
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
        drawDistance={ARTICLE_LIST_DRAW_DISTANCE}
        keyExtractor={keyExtractor}
        scrollEventThrottle={SCROLL_EVENT_THROTTLE}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={listContentStyle}
        ItemSeparatorComponent={ArticleRowSeparator}
        ListFooterComponent={FooterComponent}
        renderItem={renderItem}
        getItemType={getItemType}
      />
    </ThemedView>
  );
};

FilteredArticleView.displayName = 'FilteredArticleView';
