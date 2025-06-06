/* eslint-disable react/no-unused-prop-types */
import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useCallback } from 'react';
import { StyleSheet, RefreshControl, View } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { Article } from '../../types/articles.types';
import { ThemedView } from '../ThemedView';

import ListArticleItem from './ListArticleItem';

const NOOP_ARTICLE_PRESS = () => {};

interface FilteredArticleViewProps {
  /**
   * Articles to display in the filtered view
   */
  articles: Article[];

  /**
   * Whether the view is in a refreshing state
   */
  isRefreshing: boolean;

  /**
   * Callback when the view is refreshed
   */
  onRefresh: () => void;

  /**
   * Callback when an article is pressed
   */
  onArticlePress?: (article: Article) => void;
}

/**
 * A specialized component for displaying filtered articles
 * Uses a simple ScrollView instead of FlashList to avoid recycling issues
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  isRefreshing,
  onRefresh,
  onArticlePress = NOOP_ARTICLE_PRESS,
}) => {
  const colors = useColors();
  const navHeaderHeight = useHeaderHeight();

  // Determine the header title based on selected filters

  // Calculate header height for spacer
  const headerHeight = useMemo(() => navHeaderHeight + LAYOUT.SPACING.SMALL, [navHeaderHeight]);

  const renderItemCallback = useCallback(
    ({ item }: { item: Article }) => <ListArticleItem article={item} onPress={onArticlePress} />,
    [onArticlePress]
  );

  const ListFooterComponent = useMemo(() => {
    return null;
  }, [articles.length]);

  // Create a header spacer component
  const HeaderSpacer = useMemo(() => {
    return <View style={[styles.headerSpacer, { height: headerHeight }]} />;
  }, [headerHeight]);

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
        ListHeaderComponent={HeaderSpacer}
        renderItem={renderItemCallback}
        showsVerticalScrollIndicator={true}
        overrideItemLayout={layout => {
          layout.size = ITEM_HEIGHT;
        }}
        refreshControl={
          <RefreshControl
            colors={[colors.tint]}
            refreshing={isRefreshing}
            tintColor={colors.tint}
            onRefresh={onRefresh}
          />
        }
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerSpacer: {
    height: 0, // This will be dynamically set
  },
  listContent: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
