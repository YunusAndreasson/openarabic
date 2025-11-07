import { EmptyState } from '@/components/common';
import { ListSeparator } from '@/components/common';
import { FlashList } from '@shopify/flash-list';
import React, { type FC, useDeferredValue, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ListenListItemCard } from '@/components/bookmarks/ListenListItemCard';
import { PulsatingLoader } from '@/components/ui';
import {
  LIST_DRAW_DISTANCE_MULTIPLIER,
  SCROLL_EVENT_THROTTLE,
  TIMING_CONFIG,
} from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';
import { capitalizeFirstLetter, formatArticleMetadata } from '@/utils/stringUtils';
import { calculateReadingTime } from '@/utils/textUtils';
// v2 handles layout automatically - no overrideFixedHeight needed

// Completion threshold matches articleUtils.ts
const COMPLETION_THRESHOLD = 95;

// List item types
type SectionHeaderItem = {
  type: 'header';
  id: string;
  title: string;
};

type ArticleItem = {
  type: 'article';
  id: string;
  data: Article;
};

type ListItem = SectionHeaderItem | ArticleItem;

// Use responsive height for filtered article items
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM;
const DRAW_DISTANCE_MULTIPLIER = LIST_DRAW_DISTANCE_MULTIPLIER;

const SeparatorComponent = () => <ListSeparator height={LAYOUT.SPACING.SMALL} />;

const STATIC_STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  headerSpacing: {
    height: LAYOUT.SPACING.MEDIUM,
  },
  footerSpacer: {
    height: LAYOUT.SPACING.LARGE,
  },
  sectionHeader: {
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

// Static footer component
const FooterComponent = () => <View style={STATIC_STYLES.footerSpacer} />;

// Section header component
const SectionHeader = ({ title }: { title: string }) => (
  <View style={STATIC_STYLES.sectionHeader}>
    <ThemedText type="heading3" weight="bold">
      {title}
    </ThemedText>
  </View>
);

/**
 * Groups articles by progress state and flattens them with section headers
 */
function groupArticlesWithHeaders(
  articles: Article[],
  progressMap: Map<number, { progress_percentage: number | null }>,
): ListItem[] {
  if (articles.length === 0) return [];

  // Group articles by progress state
  const continueReading: Article[] = [];
  const unread: Article[] = [];
  const completed: Article[] = [];

  articles.forEach(article => {
    const progress = progressMap.get(article.id)?.progress_percentage ?? 0;
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
    continueReading.forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  if (unread.length > 0) {
    listItems.push({ type: 'header', id: 'header-unread', title: STRINGS.UNREAD });
    unread.forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  if (completed.length > 0) {
    listItems.push({ type: 'header', id: 'header-completed', title: STRINGS.COMPLETED });
    completed.forEach(article => {
      listItems.push({ type: 'article', id: `article-${article.id}`, data: article });
    });
  }

  return listItems;
}

interface FilteredArticleViewProps {
  /**
   * Articles to display in the filtered view
   */
  articles: Article[];

  /**
   * Callback when an article is pressed
   */
  onArticlePress?: (article: Article) => void;

  /**
   * Optional callback when an article is deleted (for edit mode)
   */
  onArticleDelete?: (articleId: number) => void;

  /**
   * Optional callback when articles are reordered (for edit mode)
   */
  onArticleReorder?: (orderedArticleIds: number[]) => void;

  /**
   * Whether edit mode is enabled
   */
  editMode?: boolean;

  /**
   * Loading state when fetching articles
   */
  loading?: boolean;

  /**
   * Optional header component to display above the filter summary
   */
  HeaderComponent?: React.ComponentType | React.ReactElement | null;

  /**
   * Type of filter being applied (used to determine which metadata to show)
   */
  filterType?: string;
}

// Static empty functions to avoid infinite render loops
const noop = () => {};

/**
 * A specialized component for displaying filtered articles in modal contexts
 */
export const FilteredArticleView: FC<FilteredArticleViewProps> = ({
  articles,
  onArticlePress = noop,
  onArticleDelete = noop,
  onArticleReorder = noop,
  editMode = false,
  loading = false,
  HeaderComponent = null,
  filterType,
}) => {
  const insets = useSafeAreaInsets();

  // Apply global filters/sorting state to incoming articles
  // useFilteredArticles now returns BOTH articles AND their progress (single source of truth)
  const {
    articles: visibleArticles,
    progressMap,
    isProgressLoading,
  } = useFilteredArticles(articles);

  // React 19: Defer article grouping to keep scrolling smooth during re-sorts
  // Scroll remains responsive, sections reorganize smoothly in background
  const deferredVisibleArticles = useDeferredValue(visibleArticles);

  // Group articles with section headers
  const listData = useMemo(
    () => groupArticlesWithHeaders(deferredVisibleArticles, progressMap),
    [deferredVisibleArticles, progressMap],
  );

  // Simple derived state (no need for useMemo on primitives)
  const hasArticles = visibleArticles.length > 0;
  const shouldShowEmpty = !loading && !hasArticles;

  // Dynamic list content style with safe area inset for bottom padding
  const listContentStyle = useMemo(
    () => ({
      paddingTop: LAYOUT.SPACING.MEDIUM, // Add spacing between header and first card
      paddingBottom: LAYOUT.SCREEN_PADDING.bottomDefault + insets.bottom, // Safe area for home indicator
      paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    }),
    [insets.bottom],
  );

  // Handle drag end for reordering
  const handleDragEnd = ({ data }: { data: ListItem[] }) => {
    // Extract only article IDs (skip headers)
    const orderedIds = data
      .filter((item): item is ArticleItem => item.type === 'article')
      .map(item => item.data.id);
    onArticleReorder(orderedIds);
  };

  // Delete handler creator
  const createDeleteHandler = (articleId: number) => () => onArticleDelete(articleId);

  // Drag handle props creator
  const createDragHandleProps = (drag: () => void) => ({
    onLongPress: drag,
    delayLongPress: TIMING_CONFIG.FAST.duration,
  });

  // Header component
  let ListHeaderComponent = null;
  if (HeaderComponent) {
    ListHeaderComponent = (
      <>
        {typeof HeaderComponent === 'function' ? <HeaderComponent /> : HeaderComponent}
        <View style={STATIC_STYLES.headerSpacing} />
      </>
    );
  }

  // Render item for both FlashList and DraggableFlatList
  const renderItem = (
    params: { item: ListItem; index?: number } | RenderItemParams<ListItem>,
  ): React.JSX.Element => {
    const { item } = params;

    // Render section header
    if (item.type === 'header') {
      return <SectionHeader title={item.title} />;
    }

    // Render article item
    const article = item.data;
    const progress = progressMap.get(article.id);
    const progressPercentage = progress?.progress_percentage ?? 0;

    // Extract drag props if available (only in DraggableFlatList)
    const drag = 'drag' in params ? params.drag : undefined;
    const isDragging = 'isActive' in params ? params.isActive : false;

    // Determine which metadata to show based on filter context
    const readingTime = calculateReadingTime(article.article_sentences?.length ?? 0);

    // When filtering by author, show "Category · Xm" (author is redundant)
    // Otherwise show full "Author · Category · Xm"
    const secondaryText =
      filterType === 'author'
        ? `${capitalizeFirstLetter(article.category.name)} · ${readingTime}`
        : formatArticleMetadata(article.author.name, article.category.name, readingTime);

    return (
      <ListenListItemCard
        title={article.title}
        secondaryText={secondaryText}
        imageUrl={generateImageUrl(article.image_url)}
        articleId={article.id}
        editMode={editMode}
        onPress={!editMode ? () => onArticlePress(article) : undefined}
        onDelete={createDeleteHandler(article.id)}
        dragHandleProps={drag ? createDragHandleProps(drag) : undefined}
        isBeingDragged={isDragging}
        progressPercentage={progressPercentage}
        shouldAnimateOnMount={false}
      />
    );
  };

  const keyExtractor = (item: ListItem) => item.id;

  // v2 handles layout automatically - no overrideItemLayout needed

  // Empty state props - only shows when filters eliminate all results
  const emptyStateProps = {
    description: STRINGS.TRY_ADJUSTING_FILTERS,
    icon: 'funnel' as const,
    title: STRINGS.NO_ARTICLES_FOUND,
    hideArticlesButton: true,
    containerStyle: STATIC_STYLES.emptyContainer,
  };

  // ThemedView props
  const themedViewProps = {
    includeBottomInset: false,
    safeAreaEdges: ['left', 'right'] as ('left' | 'right' | 'bottom' | 'top')[],
    style: STATIC_STYLES.container,
  };

  // Show loading state when:
  // 1. Loading articles and no articles cached yet
  // 2. Loading progress data on first render (prevents showing items without indicators)
  const isInitialProgressLoad =
    isProgressLoading && visibleArticles.length > 0 && progressMap.size === 0;
  const shouldShowLoading =
    (loading && (visibleArticles.length === 0 || (articles?.length && !shouldShowEmpty))) ||
    isInitialProgressLoad;

  if (shouldShowLoading) {
    return (
      <ThemedView {...themedViewProps}>
        <View style={[STATIC_STYLES.emptyContainer, { paddingTop: LAYOUT.SPACING.XXLARGE }]}>
          <PulsatingLoader size={64} />
        </View>
      </ThemedView>
    );
  }

  if (shouldShowEmpty) {
    return (
      <ThemedView {...themedViewProps}>
        <EmptyState {...emptyStateProps} />
      </ThemedView>
    );
  }

  return (
    <ThemedView {...themedViewProps}>
      {editMode ? (
        // Use DraggableFlatList in edit mode
        <DraggableFlatList<ListItem>
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={listContentStyle}
          ItemSeparatorComponent={SeparatorComponent}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={FooterComponent}
        />
      ) : (
        // Use FlashList v2 in normal mode - automatic layout
        <FlashList<ListItem>
          data={listData}
          drawDistance={ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          scrollEventThrottle={SCROLL_EVENT_THROTTLE}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={listContentStyle}
          ItemSeparatorComponent={SeparatorComponent}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={FooterComponent}
          renderItem={renderItem}
        />
      )}
    </ThemedView>
  );
};

FilteredArticleView.displayName = 'FilteredArticleView';
