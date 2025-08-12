import { useHeaderHeight } from '@react-navigation/elements';
import type { ContentStyle, ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useTransition,
  type ComponentType,
  type ReactElement,
} from 'react';
import { RefreshControl, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ArticleCard from '@read/ArticleCard';

import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';

// Optimized constants for better performance
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM + LAYOUT.SPACING.XXXLARGE * 8;
const DRAW_DISTANCE = ITEM_HEIGHT * LIST_DRAW_DISTANCE_MULTIPLIER;
const ESTIMATED_LIST_SIZE = { height: ITEM_HEIGHT * 10, width: SCREEN_WIDTH };

// Static key extractor for better performance
const articleKeyExtractor = (item: Article) => `article-${item.id}`;

// Static separator component with StyleSheet to avoid recreating inline style objects
const styles = StyleSheet.create({
  articleCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  pendingCard: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
  separator: {
    height: LAYOUT.SPACING.MEDIUM,
  },
});

const SeparatorComponent = () => <View style={styles.separator} />;

interface ArticleItemProps {
  item: Article;
  onPress: (article: Article) => void;
}

const ArticleItem = memo(({ item, onPress }: ArticleItemProps) => {
  const [isPending, startTransition] = useTransition();

  const handlePress = useCallback(() => {
    startTransition(() => {
      onPress(item);
    });
  }, [item, onPress]);

  return (
    <ArticleCard
      author={item.author.name}
      category={item.category.name}
      categoryForDisplay={item.category.name}
      imageUrl={String(item.image_url)}
      style={[styles.articleCard, isPending && styles.pendingCard]}
      summary={String(item.summary)}
      title={item.title}
      onPress={handlePress}
      testID={`article-${item.id}`}
    />
  );
});

ArticleItem.displayName = 'ArticleItem';

interface ArticleListProps {
  onRefresh?: () => void;
  onArticlePress: (article: Article) => void;
  ListHeaderComponent?: ComponentType<object> | ReactElement | null;
  ListFooterComponent?: ComponentType<object> | ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  progressViewOffset?: number;
  isRefreshing?: boolean;
}

const ArticleList = forwardRef<FlashList<Article>, ArticleListProps>(
  (
    {
      onRefresh,
      onArticlePress,
      ListHeaderComponent,
      ListFooterComponent,
      contentContainerStyle,
      progressViewOffset,
      isRefreshing = false,
    },
    ref
  ) => {
    const colors = useColors();
    const listRef = useRef<FlashList<Article>>(null);
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const [, startTransition] = useTransition();

    useImperativeHandle(ref, () => listRef.current!, []);

    // Optimized render item with stable reference
    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} onPress={onArticlePress} />,
      [onArticlePress]
    );

    // Optimized refresh handler
    const handleRefreshWithTransition = useCallback(() => {
      if (onRefresh) {
        startTransition(() => {
          onRefresh();
        });
      }
    }, [onRefresh]);

    // Memoized refresh control
    const refreshControl = useMemo(
      () => (
        <RefreshControl
          colors={[colors.tint]}
          progressBackgroundColor={colors.background}
          refreshing={isRefreshing}
          tintColor={colors.tint}
          title={STRINGS.ARTICLES_SELECTED_FOR_YOU}
          titleColor={colors.secondaryText}
          progressViewOffset={
            progressViewOffset !== undefined
              ? progressViewOffset
              : headerHeight + LAYOUT.SPACING.XXLARGE
          }
          onRefresh={handleRefreshWithTransition}
        />
      ),
      [
        isRefreshing,
        handleRefreshWithTransition,
        colors.tint,
        colors.background,
        colors.secondaryText,
        headerHeight,
        progressViewOffset,
      ]
    );

    // Optimized content container style
    const safeContentContainerStyle = useMemo(
      () => ({
        ...(contentContainerStyle as ContentStyle),
        paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
      }),
      [contentContainerStyle, insets.bottom]
    );

    // Simplified FlashList configuration - removed empty data array
    const flashListConfig = useMemo(
      () => ({
        data: [] as Article[], // Empty data since articles are in header
        renderItem,
        keyExtractor: articleKeyExtractor,
        estimatedItemSize: ITEM_HEIGHT,
        showsVerticalScrollIndicator: false,
        contentContainerStyle: safeContentContainerStyle,
        ListHeaderComponent,
        ListFooterComponent,
        refreshControl,
        scrollEventThrottle: 16,
        ItemSeparatorComponent: SeparatorComponent,
        overrideItemLayout: (
          layout: { span?: number; size?: number },
          _item: Article,
          _index: number,
          _maxColumns: number
        ) => {
          layout.size = ITEM_HEIGHT;
        },
        drawDistance: DRAW_DISTANCE,
        estimatedListSize: ESTIMATED_LIST_SIZE,
        removeClippedSubviews: true,
        maxToRenderPerBatch: 10,
        windowSize: 10,
        initialNumToRender: 5,
        updateCellsBatchingPeriod: 50,
        disableIntervalMomentum: true,
        disableScrollViewPanResponder: false,
        keyboardShouldPersistTaps: 'handled' as const,
      }),
      [
        renderItem,
        safeContentContainerStyle,
        ListHeaderComponent,
        ListFooterComponent,
        refreshControl,
      ]
    );

    return <FlashList ref={listRef} {...flashListConfig} />;
  }
);

ArticleList.displayName = 'ArticleList';

// styles moved above to share separator style

export default memo(ArticleList);
