import EmptyState from '@common/EmptyState';
import ListSeparator from '@common/ListSeparator';
import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';


import { ThemedView } from '@/components/ThemedView';
import { ListenListItemCard } from '@/components/bookmarks/ListenListItemCard';
import PulsatingLoader from '@/components/ui/PulsatingLoader';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useFilteredArticles } from '@/hooks/articles/useFilteredArticles';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';
import { capitalizeFirstLetter } from '@/utils/stringUtils';
// v2 handles layout automatically - no overrideFixedHeight needed

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
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  headerSpacing: {
    height: LAYOUT.SPACING.MEDIUM,
  },
  footerSpacer: {
    height: LAYOUT.SPACING.LARGE,
  },
});

// Static footer component
const FooterComponent = () => <View style={STATIC_STYLES.footerSpacer} />;

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
  if (prevProps.filterType !== nextProps.filterType) return false;
  if (prevProps.onArticlePress !== nextProps.onArticlePress) return false;
  if (prevProps.onArticleDelete !== nextProps.onArticleDelete) return false;
  if (prevProps.onArticleReorder !== nextProps.onArticleReorder) return false;
  if (prevProps.HeaderComponent !== nextProps.HeaderComponent) return false;

  // Array length checks before deep comparison
  if (prevProps.articles?.length !== nextProps.articles?.length) return false;

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
  loading = false,
  HeaderComponent = null,
  filterType,
}) => {
  // Apply global filters/sorting state to incoming articles
  // useFilteredArticles now returns BOTH articles AND their progress (single source of truth)
  const { articles: visibleArticles, progressMap, isProgressLoading } = useFilteredArticles(articles);

  // Simple derived state (no need for useMemo on primitives)
  const hasArticles = visibleArticles.length > 0;
  const shouldShowEmpty = !loading && !hasArticles;

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

  // Memoize header component (only depends on HeaderComponent prop)
  const ListHeaderComponent = useMemo(() => {
    if (!HeaderComponent) return null;
    return (
      <>
        {typeof HeaderComponent === 'function' ? <HeaderComponent /> : HeaderComponent}
        <View style={STATIC_STYLES.headerSpacing} />
      </>
    );
  }, [HeaderComponent]);

  // Render item for both FlashList and DraggableFlatList
  const renderItem: (
    params: { item: Article; index?: number } | RenderItemParams<Article>
  ) => React.JSX.Element = useCallback(
    params => {
      const { item } = params;
      const progress = progressMap.get(item.id);
      const progressPercentage = progress?.progress_percentage ?? 0;

      // Extract drag props if available (only in DraggableFlatList)
      const drag = 'drag' in params ? params.drag : undefined;
      const isDragging = 'isActive' in params ? params.isActive : false;

      // Determine which metadata to show based on filter context
      const secondaryText = filterType === 'author' ? capitalizeFirstLetter(item.category.name) : item.author.name;

      return (
        <ListenListItemCard
          title={item.title}
          secondaryText={secondaryText}
          imageUrl={generateImageUrl(item.image_url)}
          articleId={item.id}
          editMode={editMode}
          onPress={!editMode ? () => onArticlePress(item) : undefined}
          onDelete={createDeleteHandler(item.id)}
          dragHandleProps={drag ? createDragHandleProps(drag) : undefined}
          isBeingDragged={isDragging}
          progressPercentage={progressPercentage}
          shouldAnimateOnMount={false}
        />
      );
    },
    [editMode, onArticlePress, createDeleteHandler, createDragHandleProps, progressMap, filterType]
  );

  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  // v2 handles layout automatically - no overrideItemLayout needed

  // Memoize empty state props - only shows when filters eliminate all results
  const emptyStateProps = useMemo(
    () => ({
      description: STRINGS.TRY_ADJUSTING_FILTERS,
      icon: 'funnel' as const,
      title: STRINGS.NO_ARTICLES_FOUND,
      hideArticlesButton: true,
      containerStyle: STATIC_STYLES.emptyContainer,
    }),
    []
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

  // Show loading state when:
  // 1. Loading articles and no articles cached yet
  // 2. Loading progress data on first render (prevents showing items without indicators)
  const isInitialProgressLoad = isProgressLoading && visibleArticles.length > 0 && progressMap.size === 0;
  const shouldShowLoading =
    loading && (visibleArticles.length === 0 || (articles?.length && !shouldShowEmpty)) ||
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
        <DraggableFlatList<Article>
          data={visibleArticles}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          onDragEnd={handleDragEnd}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={STATIC_STYLES.listContent}
          ItemSeparatorComponent={SeparatorComponent}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={FooterComponent}
        />
      ) : (
        // Use FlashList v2 in normal mode - automatic layout
        <FlashList<Article>
          data={visibleArticles}
          drawDistance={ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={STATIC_STYLES.listContent}
          ItemSeparatorComponent={SeparatorComponent}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={FooterComponent}
          renderItem={renderItem}
          // v2 performance optimizations
          maxItemsInRecyclePool={25} // Control memory usage for article lists
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
