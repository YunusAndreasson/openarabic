/* eslint-disable react/no-unused-prop-types */
import { FlashList, type OverrideItemLayoutParams } from '@shopify/flash-list';
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import FilterSummary from '@/components/FilterSummary';
import { ThemedView } from '@/components/ThemedView';
import { LAYOUT } from '@/constants/layout';
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
}

/**
 * A specialized component for displaying filtered articles in modal contexts
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  onArticlePress = NOOP_ARTICLE_PRESS,
  totalCount,
}) => {
  const renderItemCallback = useCallback(
    ({ item }: { item: Article }) => <ListArticleItem article={item} onPress={onArticlePress} />,
    [onArticlePress]
  );

  const ListFooterComponent = useMemo(() => {
    return <View style={{ height: LAYOUT.SPACING.LARGE }} />;
  }, []);

  const ListHeaderComponent = useMemo(() => {
    return <FilterSummary filteredCount={articles.length} totalCount={totalCount} />;
  }, [articles.length, totalCount]);

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
        ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
        renderItem={renderItemCallback}
        showsVerticalScrollIndicator={true}
        overrideItemLayout={(
          layout: OverrideItemLayoutParams,
          _item: Article
        ) => {
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
