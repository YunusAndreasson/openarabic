import { useHeaderHeight } from '@react-navigation/elements';
import { FlashList } from '@shopify/flash-list';
import React, { useMemo, useCallback, memo } from 'react';
import { StyleSheet, RefreshControl, View } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { Article } from '../../types/articles.types';
import type { Tables } from '../../types/database.types';
import { ThemedText } from '../ThemedText';
import { ThemedView } from '../ThemedView';
import ListArticleItem from './ListArticleItem';

interface FilteredArticleViewProps {
  /**
   * Articles to display in the filtered view
   */
  articles: Article[];

  /**
   * Whether the view is in a loading state
   */
  isLoading?: boolean;

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

  /**
   * Selected author (if filtering by author)
   */
  selectedAuthor?: Tables<'authors'> | null;

  /**
   * Selected category (if filtering by category)
   */
  selectedCategory?: Tables<'categories'> | null;
}

// Move components outside of the parent component

interface EmptyViewProps {
  isLoading?: boolean;
}

const EmptyView = ({ isLoading }: EmptyViewProps) => {
  if (isLoading) return null;
  return (
    <View style={styles.noResultsContainer}>
      <ThemedText
        style={styles.noResultsText}
        accessibilityLabel="No articles found with the current filter"
      >
        No articles found
      </ThemedText>
    </View>
  );
};
EmptyView.displayName = 'EmptyView';

/**
 * A specialized component for displaying filtered articles
 * Uses a simple ScrollView instead of FlashList to avoid recycling issues
 */
const FilteredArticleView: React.FC<FilteredArticleViewProps> = ({
  articles,
  isLoading,
  isRefreshing,
  onRefresh,
  onArticlePress,
}) => {
  const colors = useColors();
  const navHeaderHeight = useHeaderHeight();

  // Determine the header title based on selected filters

  // Calculate header height for spacer
  const headerHeight = useMemo(() => navHeaderHeight + LAYOUT.SPACING.SMALL, [navHeaderHeight]);

  const renderItemCallback = useCallback(
    ({ item }: { item: Article }) => (
      <ListArticleItem article={item} onPress={onArticlePress} />
    ),
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
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <FlashList
        data={articles}
        renderItem={renderItemCallback}
        estimatedItemSize={ITEM_HEIGHT}
        keyExtractor={(_, index) => String(index)}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={HeaderSpacer}
        ListEmptyComponent={<EmptyView isLoading={isLoading} />}
        ListFooterComponent={ListFooterComponent}
        showsVerticalScrollIndicator={true}
        drawDistance={ITEM_HEIGHT * 5}
        overrideItemLayout={layout => {
          layout.size = ITEM_HEIGHT;
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.tint]}
            tintColor={colors.tint}
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
  endMessageContainer: {
    height: LAYOUT.SPACING.XLARGE,
  },
  headerSpacer: {
    height: 0, // This will be dynamically set
  },
  listContent: {
    paddingBottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  noResultsContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingVertical: LAYOUT.SPACING.XLARGE,
  },
  noResultsText: {
    textAlign: 'center',
  },
});

export default FilteredArticleView;

FilteredArticleView.displayName = 'FilteredArticleView';
