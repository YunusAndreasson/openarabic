import { FlashList } from '@shopify/flash-list';
import { memo, useCallback, useMemo, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import EmptyState from '@/components/EmptyState';
import FilterSummary from '@/components/FilterSummary';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';

import ListArticleItem from './ListArticleItem';

// Extract constants outside component to prevent recreation
const NOOP_ARTICLE_PRESS = () => {};
// Use responsive height for filtered article items
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM;
const DRAW_DISTANCE_MULTIPLIER = 5;

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
   * Total count of articles before filtering (optional)
   */
  totalCount?: number;

  /**
   * Loading state when fetching articles
   */
  loading?: boolean;
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
  if (prevProps.onArticlePress !== nextProps.onArticlePress) return false;

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
  totalCount,
  loading = false,
}) => {
  const colors = useColors();

  // Memoize expensive computations
  const articlesLength = useMemo(() => articles.length, [articles.length]);
  const hasArticles = useMemo(() => articlesLength > 0, [articlesLength]);
  const shouldShowEmpty = useMemo(() => !loading && !hasArticles, [loading, hasArticles]);

  // Memoize list components
  const ListFooterComponent = useMemo(() => {
    return <View style={STATIC_STYLES.footerSpacer} />;
  }, []);

  const ListHeaderComponent = useMemo(() => {
    return <FilterSummary filteredCount={articlesLength} totalCount={totalCount} />;
  }, [articlesLength, totalCount]);

  // Memoize render callbacks
  const renderItemCallback = useCallback(
    ({ item }: { item: Article }) => <ListArticleItem article={item} onPress={onArticlePress} />,
    [onArticlePress]
  );

  const renderSeparator = useCallback(() => SeparatorComponent(), []);

  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  const overrideItemLayout = useCallback((layout: { span?: number; size?: number }) => {
    layout.size = ITEM_HEIGHT;
  }, []);

  // Memoize FlashList props to prevent unnecessary re-renders
  const flashListProps = useMemo(
    () => ({
      contentContainerStyle: STATIC_STYLES.listContent,
      data: articles,
      drawDistance: ITEM_HEIGHT * DRAW_DISTANCE_MULTIPLIER,
      estimatedItemSize: ITEM_HEIGHT,
      keyExtractor,
      ListFooterComponent,
      ListHeaderComponent,
      ItemSeparatorComponent: renderSeparator,
      renderItem: renderItemCallback,
      showsVerticalScrollIndicator: true,
      overrideItemLayout,
    }),
    [
      articles,
      keyExtractor,
      ListFooterComponent,
      ListHeaderComponent,
      renderSeparator,
      renderItemCallback,
      overrideItemLayout,
    ]
  );

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
      <FlashList {...flashListProps} />
    </ThemedView>
  );
};

/**
 * A specialized component for displaying filtered articles in modal contexts
 */
const FilteredArticleView = memo(FilteredArticleViewInternal, FilteredArticleViewComparison);

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
