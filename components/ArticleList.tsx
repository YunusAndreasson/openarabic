import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from 'react';
import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  RefreshControl,
  ViewToken,
  ViewabilityConfig,
  Platform,
  View,
} from 'react-native';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { Article } from '../types/articles.types';
import ThemedCard from './ThemedCard';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  FadeIn,
} from 'react-native-reanimated';
import { CopyrightFooter } from './CopyrightFooter';
import { ArticleListProps } from '../types/ui.types';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';
import { TIMING_CONFIG } from '../hooks/animations/animationConfigs';

const ITEM_HEIGHT = 360; // Approximate height of each article card

/**
 * An optimized FlatList component for rendering articles
 */
const ArticleList = forwardRef<FlatList<Article>, ArticleListProps>(
  (
    {
      articles,
      isLoading,
      isRefreshing,
      onRefresh,
      onArticlePress,
      ListHeaderComponent,
      ListEmptyComponent,
      contentContainerStyle,
    },
    ref
  ) => {
    const colors = useColors();
    const [viewableItemIds, setViewableItemIds] = useState<Set<number>>(new Set());
    const listRef = useRef<FlatList<Article>>(null);
    const queryClient = useQueryClient();

    // Forward the ref to the parent component
    useImperativeHandle(ref, () => listRef.current!, []);

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
        // Update viewable items set
        const newViewableIds = new Set<number>();

        items.forEach(({ item, isViewable }) => {
          if (item && item.id && isViewable) {
            newViewableIds.add(item.id);

            // Prefetch the article data in the background
            queryClient.prefetchQuery({
              queryKey: ['article', item.id],
              queryFn: () => articlesService.getArticleById(item.id),
              staleTime: 60000, // 1 minute cache
            });
          }
        });

        setViewableItemIds(newViewableIds);
      },
      [queryClient]
    );

    // Create a simplified article item component
    const ArticleItem = React.memo(({ item }: { item: Article }) => {
      // Determine if the item is visible
      const isVisible = viewableItemIds.has(item.id);

      // Simplified approach: only render content when visible
      return (
        <View style={styles.articleItemContainer}>
          {isVisible ? (
            <Animated.View entering={FadeIn.duration(300)}>
              <ThemedCard
                imageUrl={item.image_url || 'https://picsum.photos/800/400'}
                title={item.title}
                category={item.category?.name ?? 'Uncategorized'}
                author={item.author?.name ?? 'Anonymous'}
                onPress={() => onArticlePress(item)}
                style={styles.articleCard}
              />
            </Animated.View>
          ) : (
            <ThemedCard
              imageUrl={item.image_url || 'https://picsum.photos/800/400'}
              title={item.title}
              category={item.category?.name ?? 'Uncategorized'}
              author={item.author?.name ?? 'Anonymous'}
              onPress={() => onArticlePress(item)}
              style={styles.articleCard}
              isLoading={true}
            />
          )}
        </View>
      );
    });

    ArticleItem.displayName = 'ArticleItem';

    // Render item function with better memoization
    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} />,
      []
    );

    // End message animation
    const footerOpacity = useSharedValue(0);
    const footerAnimatedStyle = useAnimatedStyle(() => ({
      opacity: footerOpacity.value,
    }));

    // Start the end message animation when the component mounts
    useEffect(() => {
      // Simple timeout instead of using worklets
      setTimeout(() => {
        footerOpacity.value = withTiming(1, {
          duration: 400,
          easing: TIMING_CONFIG.MEDIUM.easing,
        });
      }, 800);
    }, []);

    // Render the footer component
    const renderFooter = useCallback(() => {
      if (isLoading && articles.length === 0) return null;

      return (
        <>
          <Animated.View style={[styles.endMessageContainer, footerAnimatedStyle]} />
          <CopyrightFooter />
        </>
      );
    }, [isLoading, articles.length, footerAnimatedStyle]);

    // Ensure the list starts at the top on mount
    useEffect(() => {
      setTimeout(() => {
        if (listRef.current && 'scrollToOffset' in listRef.current) {
          try {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
          } catch (e) {
            console.warn('Failed to scroll to top:', e);
          }
        }
      }, 100);
    }, []);

    const refreshControl = useMemo(
      () => (
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.tint]}
          tintColor={colors.tint}
        />
      ),
      [isRefreshing, onRefresh, colors.tint]
    );

    return (
      <FlatList
        ref={listRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { backgroundColor: colors.background },
          contentContainerStyle,
        ]}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={isLoading ? null : ListEmptyComponent}
        ListFooterComponent={renderFooter()}
        refreshControl={refreshControl}
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
  }
);

ArticleList.displayName = 'ArticleList';

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: LAYOUT.SPACING.LARGE,
    flexGrow: 1,
  },
  articleItemContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  articleCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  endMessageContainer: {
    paddingVertical: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ArticleList;
