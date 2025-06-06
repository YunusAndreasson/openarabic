import { useHeaderHeight } from '@react-navigation/elements';
import type { ListRenderItem, ContentStyle } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import React, {
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  memo,
  useDeferredValue,
  useTransition,
} from 'react';
import { StyleSheet, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ArticleListProps } from '@/types/ui/article.types';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { Article } from '../../types/articles.types';
import ThemedCard from '../ThemedCard';

const ITEM_HEIGHT = 360;
const DRAW_DISTANCE = ITEM_HEIGHT * 5;
const ESTIMATED_LIST_SIZE = { height: ITEM_HEIGHT * 10, width: 0 };

// Move ArticleItem outside the parent component
interface ArticleItemProps {
  item: Article;
  onPress: (article: Article) => void;
}

const ArticleItem = memo(({ item, onPress }: ArticleItemProps) => {
  const [isPending, startTransition] = useTransition();

  const handlePress = useCallback(() => {
    // Use transition for non-urgent navigation
    startTransition(() => {
      onPress(item);
    });
  }, [item, onPress]);

  return (
    <ThemedCard
      variant="article"
      imageUrl={item.image_url || 'https://picsum.photos/800/400'}
      title={item.title}
      category={item.category?.name ?? 'General'}
      author={item.author?.name ?? 'Author'}
      onPress={handlePress}
      style={[styles.articleCard, isPending && styles.pendingCard]}
      shadowSize="medium"
    />
  );
});

ArticleItem.displayName = 'ArticleItem';

const ArticleList = forwardRef<FlashList<Article>, ArticleListProps>(
  (
    {
      articles,
      isLoading,
      isRefreshing = false,
      onRefresh,
      onArticlePress,
      ListHeaderComponent,
      ListFooterComponent,
      ListEmptyComponent,
      hideMainList = false,
      hideWhileRefreshing = false,
      contentContainerStyle,
      progressViewOffset,
    },
    ref
  ) => {
    const colors = useColors();
    const listRef = useRef<FlashList<Article>>(null);
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const [isPending, startTransition] = useTransition();

    // Defer articles data to prevent blocking during heavy operations
    const deferredArticles = useDeferredValue(articles);

    useImperativeHandle(ref, () => listRef.current as FlashList<Article>, []);

    const keyExtractor = useCallback((item: Article) => `article-${item.id}`, []);

    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} onPress={onArticlePress} />,
      [onArticlePress]
    );

    // Optimized refresh control with transitions
    const handleRefreshWithTransition = useCallback(() => {
      if (onRefresh) {
        startTransition(() => {
          onRefresh();
        });
      }
    }, [onRefresh]);

    const refreshControl = useMemo(
      () => (
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefreshWithTransition}
          colors={[colors.tint]}
          tintColor={colors.tint}
          progressBackgroundColor={colors.background}
          progressViewOffset={
            progressViewOffset !== undefined
              ? progressViewOffset
              : headerHeight +
                LAYOUT.SPACING.TINY +
                LAYOUT.SPACING.SMALL +
                LAYOUT.SPACING.XXLARGE +
                LAYOUT.BUTTON.HEIGHT.MEDIUM
          }
        />
      ),
      [
        isRefreshing,
        handleRefreshWithTransition,
        colors.tint,
        colors.background,
        headerHeight,
        progressViewOffset,
      ]
    );

    const shouldHideContent = (hideWhileRefreshing && isRefreshing) || hideMainList;
    const displayData = shouldHideContent ? [] : deferredArticles;
    const displayHeader = shouldHideContent ? null : ListHeaderComponent;
    const displayFooter = shouldHideContent ? null : ListFooterComponent;

    const safeContentContainerStyle = useMemo(
      () => ({
        ...(contentContainerStyle as ContentStyle),
        paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
      }),
      [contentContainerStyle, insets]
    );

    // Enhanced FlashList configuration for React Native 0.79
    const flashListConfig = useMemo(
      () => ({
        data: displayData,
        renderItem,
        keyExtractor,
        estimatedItemSize: ITEM_HEIGHT,
        showsVerticalScrollIndicator: false,
        contentContainerStyle: safeContentContainerStyle,
        ListHeaderComponent: displayHeader,
        ListFooterComponent: displayFooter,
        ListEmptyComponent: isLoading ? null : ListEmptyComponent,
        refreshControl,
        scrollEventThrottle: 16,
        overrideItemLayout: (layout: any, _item: Article) => {
          layout.size = ITEM_HEIGHT;
        },
        drawDistance: DRAW_DISTANCE,
        estimatedListSize: ESTIMATED_LIST_SIZE,
        // React Native 0.79 optimizations
        removeClippedSubviews: true,
        maxToRenderPerBatch: 10,
        windowSize: 10,
        initialNumToRender: 5,
        updateCellsBatchingPeriod: 50,
        // Performance optimizations
        disableIntervalMomentum: true,
        disableScrollViewPanResponder: false,
        keyboardShouldPersistTaps: 'handled' as const,
      }),
      [
        displayData,
        renderItem,
        keyExtractor,
        safeContentContainerStyle,
        displayHeader,
        displayFooter,
        ListEmptyComponent,
        isLoading,
        refreshControl,
      ]
    );

    return <FlashList ref={listRef} {...flashListConfig} />;
  }
);

ArticleList.displayName = 'ArticleList';

const styles = StyleSheet.create({
  articleCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
  pendingCard: {
    opacity: 0.7,
  },
});

export default ArticleList;
