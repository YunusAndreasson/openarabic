/* eslint-disable react/no-unused-prop-types */
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import SortingControls from '@/components/SortingControls';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import type { SortOption, SortDirection } from '@/types/ui/sorting.types';

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
   * Sort options for the articles
   */
  sortOptions?: SortOption<string>[];

  /**
   * Current sort option
   */
  currentSort?: string;

  /**
   * Current sort direction
   */
  sortDirection?: SortDirection;

  /**
   * Callback when sort changes
   */
  onSortChange?: (sort: string, direction: SortDirection) => void;
}

/**
 * A specialized component for displaying filtered articles in modal contexts
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  onArticlePress = NOOP_ARTICLE_PRESS,
  sortOptions,
  currentSort,
  sortDirection = 'desc',
  onSortChange,
}) => {
  const renderItemCallback = useCallback(
    ({ item }: { item: Article }) => <ListArticleItem article={item} onPress={onArticlePress} />,
    [onArticlePress]
  );

  const ListFooterComponent = useMemo(() => {
    return <View style={{ height: LAYOUT.SPACING.LARGE }} />;
  }, []);

  const ListHeaderComponent = useMemo(() => {
    // Only show sorting controls if sorting props are provided and there are articles
    if (!sortOptions || !currentSort || !onSortChange || articles.length === 0) {
      return null;
    }

    return (
      <SortingControls
        currentSort={currentSort}
        options={sortOptions}
        sortDirection={sortDirection}
        onSortChange={onSortChange}
      />
    );
  }, [sortOptions, currentSort, sortDirection, onSortChange, articles.length]);

  // Calculate the estimated item height based on content + padding + margins
  const ITEM_HEIGHT = 100; // Adjust this based on your actual card height

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
        renderItem={renderItemCallback}
        showsVerticalScrollIndicator={true}
        overrideItemLayout={layout => {
          layout.size = ITEM_HEIGHT;
        }}
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
});

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
