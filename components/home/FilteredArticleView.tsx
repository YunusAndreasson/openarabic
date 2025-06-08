/* eslint-disable react/no-unused-prop-types */
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import type { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';

import ListArticleItem from './ListArticleItem';

const NOOP_ARTICLE_PRESS = () => {};

interface FilteredArticleViewProps {
  /**
   * Articles to display in the filtered view
   */
  articles: Article[];

  /**
   * Whether the view is in a refreshing state
   * @deprecated Pull-to-refresh disabled in modal contexts to avoid conflicts with pull-to-close
   */
  isRefreshing: boolean;

  /**
   * Callback when the view is refreshed
   * @deprecated Pull-to-refresh disabled in modal contexts to avoid conflicts with pull-to-close
   */
  onRefresh: () => void;

  /**
   * Callback when an article is pressed
   */
  onArticlePress?: (article: Article) => void;
}

/**
 * A specialized component for displaying filtered articles in modal contexts
 * Pull-to-refresh is disabled to avoid conflicts with modal pull-to-close gestures
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  // isRefreshing and onRefresh are kept for API compatibility but not used
  isRefreshing: _isRefreshing,
  onRefresh: _onRefresh,
  onArticlePress = NOOP_ARTICLE_PRESS,
}) => {
  const renderItemCallback = useCallback(
    ({ item }: { item: Article }) => <ListArticleItem article={item} onPress={onArticlePress} />,
    [onArticlePress]
  );

  const ListFooterComponent = useMemo(() => {
    return <View style={{ height: LAYOUT.SPACING.LARGE }} />;
  }, []);

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
        renderItem={renderItemCallback}
        showsVerticalScrollIndicator={true}
        overrideItemLayout={layout => {
          layout.size = ITEM_HEIGHT;
        }}
        // Pull-to-refresh disabled to avoid conflicts with modal pull-to-close gesture
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
