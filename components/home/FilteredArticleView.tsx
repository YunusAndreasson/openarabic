import { FlashList } from '@shopify/flash-list';
import React, { memo, useCallback, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import DraggableFlatList from 'react-native-draggable-flatlist';

import EmptyState from '@/components/EmptyState';
import FilterSummary from '@/components/FilterSummary';
import { ThemedView } from '@/components/ThemedView';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';

import ListArticleItem from './ListArticleItem';

// Extract constants outside component to prevent recreation
const NOOP_ARTICLE_PRESS = () => {};
const NOOP_DELETE = () => {};
const NOOP_DRAG_END = () => {};
// Use responsive height for filtered article items
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM;
const DRAW_DISTANCE_MULTIPLIER = LIST_DRAW_DISTANCE_MULTIPLIER;

// Static separator component
const SeparatorComponent = () => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />;

// Static styles to prevent recreation
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
  if (prevProps.editMode !== nextProps.editMode) return false; // CRITICAL: Check editMode!
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

/**
 * Internal component implementation
 */
const FilteredArticleViewInternal: FC<FilteredArticleViewProps> = ({
  articles,
  onArticlePress = NOOP_ARTICLE_PRESS,
  onArticleDelete = NOOP_DELETE,
  onArticleReorder = NOOP_DRAG_END,
  editMode = false,
  totalCount,
  loading = false,
  HeaderComponent = null,
}) => {
  const colors = useColors();

  // Memoize expensive computations
  const articlesLength = useMemo(() => articles.length, [articles.length]);
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

      if (editMode && 'drag' in params) {
        // DraggableFlatList render
        const { drag, isActive: isDragging } = params;
        return (
          <ListArticleItem
            article={item}
            editMode={editMode}
            onPress={!editMode ? onArticlePress : undefined}
            onDelete={() => onArticleDelete(item.id)}
            dragHandleProps={
              drag
                ? {
                    onLongPress: drag,
                    delayLongPress: 100,
                  }
                : undefined
            }
            isBeingDragged={isDragging}
          />
        );
      } else {
        // FlashList render
        return (
          <ListArticleItem
            article={item}
            editMode={editMode}
            onPress={!editMode ? onArticlePress : undefined}
            onDelete={editMode ? () => onArticleDelete(item.id) : undefined}
          />
        );
      }
    },
    [editMode, onArticlePress, onArticleDelete]
  );

  const renderSeparator = useCallback(() => SeparatorComponent(), []);

  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  const overrideItemLayout = useCallback((layout: { span?: number; size?: number }) => {
    layout.size = ITEM_HEIGHT;
  }, []);

  // Memoize empty state props
  const emptyStateProps = useMemo(
    () => ({
      colors,
      description: STRINGS.TRY_ADJUSTING_FILTERS,
      icon: 'search-outline' as const,
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
          data={articles}
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
          data={articles}
          drawDistance={ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER}
          estimatedItemSize={ITEM_HEIGHT}
          keyExtractor={keyExtractor}
          removeClippedSubviews={true}
          showsVerticalScrollIndicator={true}
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
