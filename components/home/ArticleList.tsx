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

import ArticleCard from '@/components/ArticleCard';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';

// Use responsive height calculation based on content and spacing
const ITEM_HEIGHT = LAYOUT.CARD.HEIGHT.LIST_ITEM + LAYOUT.SPACING.XXXLARGE * 8; // Base + content space
const DRAW_DISTANCE = ITEM_HEIGHT * 5;
const ESTIMATED_LIST_SIZE = { height: ITEM_HEIGHT * 10, width: 0 };
const articleKeyExtractor = (item: Article) => `article-${item.id}`;
const SeparatorComponent = () => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />;

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

// Simplified props for single usage
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

    useImperativeHandle(ref, () => listRef.current as FlashList<Article>, []);

    const keyExtractor = useCallback(articleKeyExtractor, []);

    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} onPress={onArticlePress} />,
      [onArticlePress]
    );

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

    const safeContentContainerStyle = useMemo(
      () => ({
        ...(contentContainerStyle as ContentStyle),
        paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
      }),
      [contentContainerStyle, insets]
    );

    const flashListConfig = useMemo(
      () => ({
        // Always hide main list since we only show header/footer
        data: [] as Article[],
        renderItem,
        keyExtractor,
        estimatedItemSize: ITEM_HEIGHT,
        showsVerticalScrollIndicator: false,
        contentContainerStyle: safeContentContainerStyle,
        ListHeaderComponent,
        ListFooterComponent,
        ListEmptyComponent: null,
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
        keyExtractor,
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

const styles = StyleSheet.create({
  articleCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  pendingCard: {
    opacity: LAYOUT.OPACITY.HIGH,
  },
});

export default ArticleList;
