import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  RefreshControl,
  View,
  ViewToken,
  ViewabilityConfig,
} from 'react-native';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { Article } from '../types/articles.types';
import ThemedCard from './ThemedCard';
import { ArticleSkeletonRow } from './ArticleSkeleton';
import Animated, { FadeIn } from 'react-native-reanimated';
import EndMessage from './EndMessage';
import { CopyrightFooter } from './CopyrightFooter';
import { ArticleListProps } from '../types/ui.types';

const ITEM_HEIGHT = 360; // Approximate height of each article card

/**
 * An optimized FlatList component for rendering articles
 */
const ArticleList: React.FC<ArticleListProps> = ({
  articles,
  isLoading,
  isRefreshing,
  onRefresh,
  onArticlePress,
  ListHeaderComponent,
  ListEmptyComponent,
  contentContainerStyle,
}) => {
  const colors = useColors();
  const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);

  // Memoize the key extractor for better performance
  const keyExtractor = useCallback((item: Article) => `article-${item.id}`, []);

  // Memoize the getItemLayout function for better performance
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Memoize the viewability configuration
  const viewabilityConfig = useMemo<ViewabilityConfig>(
    () => ({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 300,
    }),
    []
  );

  // Handle viewable items change
  const onViewableItemsChanged = useCallback(
    ({ viewableItems: items }: { viewableItems: ViewToken[] }) => {
      setViewableItems(items);
    },
    []
  );

  // Memoize the render item function for better performance
  const renderItem: ListRenderItem<Article> = useCallback(
    ({ item, index }) => {
      const isViewable = viewableItems.some(viewable => viewable.item?.id === item.id);

      return (
        <Animated.View
          style={styles.articleItemContainer}
          entering={FadeIn.duration(300).delay(index * 50)}
        >
          <ThemedCard
            imageUrl={item.image_url || 'https://picsum.photos/800/400'}
            title={item.title}
            category={item.category?.name ?? 'Uncategorized'}
            author={item.author?.name ?? 'Anonymous'}
            onPress={() => onArticlePress(item)}
            style={styles.articleCard}
            isLoading={!isViewable}
          />
        </Animated.View>
      );
    },
    [onArticlePress, viewableItems]
  );

  // Render the loading skeleton when loading
  const renderLoading = () => {
    if (!isLoading || isRefreshing || articles.length > 0) return null;

    return (
      <View style={styles.loadingContainer}>
        <ArticleSkeletonRow count={3} type="card" horizontal={false} />
      </View>
    );
  };

  // Render the footer component
  const renderFooter = () => {
    if (isLoading && articles.length === 0) return null;

    return (
      <>
        <EndMessage />
        <CopyrightFooter />
      </>
    );
  };

  // If loading and no articles, show skeleton loading
  if (isLoading && !isRefreshing && articles.length === 0) {
    return renderLoading();
  }

  return (
    <FlatList
      data={articles}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      initialNumToRender={5}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={true}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={isLoading ? null : ListEmptyComponent}
      ListFooterComponent={renderFooter}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          progressBackgroundColor={colors.cardBackground}
          colors={[colors.tint]}
          tintColor={colors.tint}
        />
      }
    />
  );
};

export default React.memo(ArticleList);

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: LAYOUT.SPACING.XLARGE,
  },
  articleItemContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  articleCard: {
    width: '100%',
  },
  loadingContainer: {
    flex: 1,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
});
