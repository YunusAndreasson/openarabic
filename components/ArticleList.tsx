import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
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
import Animated from 'react-native-reanimated';
import EndMessage from './EndMessage';
import { CopyrightFooter } from './CopyrightFooter';
import { ArticleListProps } from '../types/ui.types';
import { useFadeInAnimation } from '../hooks/animations';

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

  // Keep a ref to the FlatList
  const flatListRef = useRef<FlatList>(null);

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

  // Create a functional component for the animated article item
  const AnimatedArticleItem = React.memo(
    ({
      item,
      index,
      onArticlePress,
      isViewable,
    }: {
      item: Article;
      index: number;
      onArticlePress: (article: Article) => void;
      isViewable: boolean;
    }) => {
      // Use animation with fixed delay based on index
      const { animatedStyle, startAnimation } = useFadeInAnimation(index * 50, 300);

      // Start the animation when the component mounts or becomes visible
      useEffect(() => {
        if (isViewable) {
          startAnimation();
        }
      }, [isViewable, startAnimation]);

      return (
        <Animated.View style={[styles.articleItemContainer, animatedStyle]}>
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
    }
  );

  AnimatedArticleItem.displayName = 'AnimatedArticleItem';

  // Then update the renderItem function to use our new component
  const renderItem: ListRenderItem<Article> = useCallback(
    ({ item, index }) => {
      const isViewable = viewableItems.some(viewable => viewable.item?.id === item.id);

      return (
        <AnimatedArticleItem
          item={item}
          index={index}
          onArticlePress={onArticlePress}
          isViewable={isViewable}
        />
      );
    },
    [viewableItems, onArticlePress]
  );

  // Render the footer component
  const renderFooter = useCallback(() => {
    if (isLoading && articles.length === 0) return null;

    return (
      <>
        <EndMessage />
        <CopyrightFooter />
      </>
    );
  }, [isLoading, articles.length]);

  return (
    <FlatList
      ref={flatListRef}
      data={articles}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={false} // Don't remove items when they're not visible
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.listContent, contentContainerStyle]}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={isLoading ? null : ListEmptyComponent}
      ListFooterComponent={renderFooter()}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.tint]}
          tintColor={colors.tint}
        />
      }
      // Use safer optimization settings
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
      }}
      scrollEventThrottle={16}
      // DO NOT disable virtualization
      disableVirtualization={false}
      // DO NOT force persist scrollbar (causes issues)
      persistentScrollbar={false}
      // Use moderate update batching period
      updateCellsBatchingPeriod={50}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  articleItemContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  articleCard: {
    width: '100%',
  },
});

export default React.memo(ArticleList);
