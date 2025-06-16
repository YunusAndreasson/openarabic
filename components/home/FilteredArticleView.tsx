/* eslint-disable react/no-unused-prop-types */
import { FlashList } from '@shopify/flash-list';
import { useMemo, useCallback, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import EmptyState from '@/components/EmptyState';
import FilterSummary from '@/components/FilterSummary';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';

import ListArticleItem from './ListArticleItem';

const NOOP_ARTICLE_PRESS = () => {};

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
 * A specialized component for displaying filtered articles in modal contexts
 */
const FilteredArticleView: FC<FilteredArticleViewProps> = ({
  articles,
  onArticlePress = NOOP_ARTICLE_PRESS,
  totalCount,
  loading = false,
}) => {
  const renderItemCallback = useCallback(
    ({ item }: { item: Article }) => <ListArticleItem article={item} onPress={onArticlePress} />,
    [onArticlePress]
  );

  const colors = useColors();

  const ListFooterComponent = useMemo(() => {
    return <View style={{ height: LAYOUT.SPACING.LARGE }} />;
  }, []);

  const ListHeaderComponent = useMemo(() => {
    return <FilterSummary filteredCount={articles.length} totalCount={totalCount} />;
  }, [articles.length, totalCount]);

  const renderSeparator = useCallback(
    () => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />,
    []
  );

  const overrideItemLayout = useCallback((layout: any) => {
    layout.size = ITEM_HEIGHT;
  }, []);

  // Calculate the estimated item height based on content + padding + margins
  const ITEM_HEIGHT = 100; // Adjust this based on your actual card height

  if (!loading && articles.length === 0) {
    return (
      <ThemedView
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        style={styles.container}
      >
        <EmptyState
          colors={colors}
          description="Try adjusting your filters"
          icon="search-outline"
          title="No Articles Found"
          hideArticlesButton={true}
          containerStyle={styles.emptyContainer}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <FlashList
        contentContainerStyle={styles.listContent}
        data={articles}
        drawDistance={ITEM_HEIGHT * 5}
        estimatedItemSize={ITEM_HEIGHT}
        keyExtractor={item => item.id.toString()}
        ListFooterComponent={ListFooterComponent}
        ListHeaderComponent={ListHeaderComponent}
        ItemSeparatorComponent={renderSeparator}
        renderItem={renderItemCallback}
        showsVerticalScrollIndicator={true}
        overrideItemLayout={overrideItemLayout}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
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
});

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
