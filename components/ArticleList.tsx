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
} from 'react-native';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { Article } from '../types/articles.types';
import ThemedCard from './ThemedCard';
import Animated from 'react-native-reanimated';
import { CopyrightFooter } from './CopyrightFooter';
import { ArticleListProps } from '../types/ui.types';
import { useOpacityAnimation } from '../hooks/animations';
import { useQueryClient } from '@tanstack/react-query';
import { articlesService } from '../services/articles';

const ITEM_HEIGHT = 360; // Approximate height of each article card

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

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
    const [viewableItems, setViewableItems] = useState<ViewToken[]>([]);
    const listRef = useRef<FlatList>(null);
    const queryClient = useQueryClient();

    // Forward the ref to the parent component
    useImperativeHandle(ref, () => ({
      ...listRef.current,
      // Add any additional methods as needed
    }));

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
        // Prefetch data for articles that are now visible
        items.forEach(({ item }) => {
          if (item && item.id) {
            // Prefetch the article data in the background
            queryClient.prefetchQuery({
              queryKey: ['article', item.id],
              queryFn: () => articlesService.getArticleById(item.id),
              staleTime: 60000, // 1 minute cache
            });
          }
        });
      },
      [queryClient]
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
        const { animatedStyle, startAnimation } = useOpacityAnimation({ initialOpacity: 0, delay: index * 50, duration: 300 });

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

    // Add the endMessageAnimatedStyle
    const { animatedStyle: endMessageAnimatedStyle, startAnimation: startEndMessageAnimation } =
      useOpacityAnimation({ initialOpacity: 0, delay: 800, duration: 400 });

    // Start the end message animation when the component mounts
    React.useEffect(() => {
      startEndMessageAnimation();
    }, [startEndMessageAnimation]);

    // Render the footer component
    const renderFooter = useCallback(() => {
      if (isLoading && articles.length === 0) return null;

      return (
        <>
          <Animated.View style={[styles.endMessageContainer, endMessageAnimatedStyle]} />
          <CopyrightFooter />
        </>
      );
    }, [isLoading, articles.length, endMessageAnimatedStyle]);

    // Ensure the list starts at the top on mount
    useEffect(() => {
      setTimeout(() => {
        if (listRef.current && 'scrollToOffset' in listRef.current) {
          try {
            // @ts-ignore - This is safe as we've checked that scrollToOffset exists
            listRef.current.scrollToOffset({ offset: 0, animated: false });
          } catch (e) {
            console.warn('Failed to scroll to top:', e);
          }
        }
      }, 100);
    }, []);

    const refreshControl = (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        colors={[colors.tint]}
        tintColor={colors.tint}
      />
    );

    return (
      <AnimatedFlatList
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
  endMessageContainer: {
    height: LAYOUT.SPACING.MEDIUM,
  },
});

export default React.memo(ArticleList);
