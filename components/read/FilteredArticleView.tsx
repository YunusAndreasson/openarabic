import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';

import EmptyState from '@common/EmptyState';
import ListSeparator from '@common/ListSeparator';
import FilterSummary from '@read/FilterSummary';
import SortingHeader from '@read/SortingHeader';

import { ThemedView } from '@/components/ThemedView';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import { useSafeBulkReadingProgress } from '@/hooks/articles/useReadingProgress';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { overrideFixedHeight } from '@/utils/list';

import ListArticleItem from './ListArticleItem';

// Use responsive height for filtered article items
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM;
const DRAW_DISTANCE_MULTIPLIER = LIST_DRAW_DISTANCE_MULTIPLIER;

const SeparatorComponent = () => <ListSeparator height={LAYOUT.SPACING.MEDIUM} />;

const STATIC_STYLES = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  footerSpacer: {
    height: LAYOUT.SPACING.LARGE,
  },
});

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
   * Total count of articles before filtering (optional)
   */
  totalCount?: number;

  /**
   * Loading state when fetching articles
   */
  loading?: boolean;

  /**
   * Optional header component to display above the filter summary
   */
  HeaderComponent?: React.ComponentType | React.ReactElement | null;
}

/**
 * Custom comparison function for React.memo optimization
 */
const FilteredArticleViewComparison = (
  prevProps: FilteredArticleViewProps,
  nextProps: FilteredArticleViewProps
): boolean => {
  // Quick path comparisons first (most likely to change)
  if (prevProps.articles !== nextProps.articles) return false;
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.editMode !== nextProps.editMode) return false;
  if (prevProps.onArticlePress !== nextProps.onArticlePress) return false;
  if (prevProps.onArticleDelete !== nextProps.onArticleDelete) return false;
  if (prevProps.onArticleReorder !== nextProps.onArticleReorder) return false;
  if (prevProps.HeaderComponent !== nextProps.HeaderComponent) return false;

  // Array length checks before deep comparison
  if (prevProps.articles?.length !== nextProps.articles?.length) return false;

  // Optional props comparison
  if (prevProps.totalCount !== nextProps.totalCount) return false;

  return true;
};

// Static empty functions to avoid infinite render loops
const noop = () => {};

/**
 * Internal component implementation
 */
const FilteredArticleViewInternal: FC<FilteredArticleViewProps> = ({
  articles,
  onArticlePress = noop,
  onArticleDelete = noop,
  onArticleReorder = noop,
  editMode = false,
  totalCount,
  loading = false,
  HeaderComponent = null,
}) => {
  const colors = useColors();

  // Apply global filters/sorting state to incoming articles
  const visibleArticles = useFilteredArticles(articles);

  // Fetch bulk reading progress for all articles
  const articleIds = useMemo(() => visibleArticles.map(article => article.id), [visibleArticles]);
  const { data: progressMapRaw = new Map() } = useSafeBulkReadingProgress(articleIds);
  // Ensure progressMap is always a Map to prevent runtime errors
  const progressMap = progressMapRaw instanceof Map ? progressMapRaw : new Map();

  // Memoize expensive computations
  const articlesLength = useMemo(() => visibleArticles.length, [visibleArticles.length]);
  const hasArticles = useMemo(() => articlesLength > 0, [articlesLength]);
  const shouldShowEmpty = useMemo(() => !loading && !hasArticles, [loading, hasArticles]);

  // Handle drag end for reordering
  const handleDragEnd = useCallback(
    ({ data }: { data: Article[] }) => {
      const orderedIds = data.map(article => article.id);
      onArticleReorder(orderedIds);
    },
    [onArticleReorder]
  );

  // Memoize delete handler creator to prevent inline function creation
  const createDeleteHandler = useCallback(
    (articleId: number) => () => onArticleDelete(articleId),
    [onArticleDelete]
  );

  // Memoize drag handle props creator to prevent object recreation
  const createDragHandleProps = useCallback(
    (drag: () => void) => ({
      onLongPress: drag,
      delayLongPress: 100,
    }),
    []
  );

  // Memoize list components
  const ListFooterComponent = useMemo(() => {
    return <View style={STATIC_STYLES.footerSpacer} />;
  }, []);

  const ListHeaderComponent = useMemo(() => {
    return (
      <>
        {HeaderComponent && (
          <>
            {typeof HeaderComponent === 'function' ? <HeaderComponent /> : HeaderComponent}
            <View style={{ height: LAYOUT.SPACING.MEDIUM }} />
          </>
        )}
        <SortingHeader />
        <FilterSummary filteredCount={articlesLength} totalCount={totalCount} />
      </>
    );
  }, [HeaderComponent, articlesLength, totalCount]);

  // Render item for both FlashList and DraggableFlatList
  const renderItem: (
    params: { item: Article; index?: number } | RenderItemParams<Article>
  ) => React.JSX.Element = useCallback(
    params => {
      const { item } = params;
      const progress = progressMap.get(item.id);
      const progressPercentage = progress?.progress_percentage ?? 0;
      const hasStartedReading = progress !== undefined; // Article has been started if there's a progress record

      if (editMode && 'drag' in params) {
        // DraggableFlatList render
        const { drag, isActive: isDragging } = params;
        return (
          <ListArticleItem
            article={item}
            editMode={editMode}
            onPress={!editMode ? onArticlePress : undefined}
            onDelete={createDeleteHandler(item.id)}
            dragHandleProps={drag ? createDragHandleProps(drag) : undefined}
            isBeingDragged={isDragging}
            progressPercentage={progressPercentage}
            hasStartedReading={hasStartedReading}
          />
        );
      } else {
        // FlashList render
        return (
          <ListArticleItem
            article={item}
            editMode={editMode}
            onPress={!editMode ? onArticlePress : undefined}
            onDelete={createDeleteHandler(item.id)}
            progressPercentage={progressPercentage}
            hasStartedReading={hasStartedReading}
          />
        );
      }
    },
    [editMode, onArticlePress, createDeleteHandler, createDragHandleProps, progressMap]
  );

  // Use stable reference to the separator component without recreating a function each render
  const renderSeparator = SeparatorComponent;

  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  const overrideItemLayout = useCallback(overrideFixedHeight(ITEM_HEIGHT), []);

  // Memoize empty state props - only shows when filters eliminate all results
  const emptyStateProps = useMemo(
    () => ({
      colors,
      description: STRINGS.TRY_ADJUSTING_FILTERS,
      icon: 'funnel' as const,
      title: STRINGS.NO_ARTICLES_FOUND,
      hideArticlesButton: true,
      containerStyle: STATIC_STYLES.emptyContainer,
    }),
    [colors]
  );

  // Memoize ThemedView props
  const themedViewProps = useMemo(
    () => ({
      includeBottomInset: false,
      safeAreaEdges: ['left', 'right'] as ('left' | 'right' | 'bottom' | 'top')[],
      style: STATIC_STYLES.container,
    }),
    []
  );

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
        <DraggableFlatList<Article>
          data={visibleArticles}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={STATIC_STYLES.listContent}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
        />
      ) : (
        // Use FlashList in normal mode
        <FlashList<Article>
          data={visibleArticles}
          drawDistance={ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER}
          estimatedItemSize={ITEM_HEIGHT}
          estimatedListSize={{ height: ITEM_HEIGHT * 10, width: SCREEN_WIDTH }}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={STATIC_STYLES.listContent}
          ItemSeparatorComponent={renderSeparator}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          renderItem={renderItem}
          overrideItemLayout={overrideItemLayout}
        />
      )}
    </ThemedView>
  );
};

/**
 * A specialized component for displaying filtered articles in modal contexts
 */
const FilteredArticleView = memo(FilteredArticleViewInternal, FilteredArticleViewComparison);

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
