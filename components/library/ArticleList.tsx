import { useHeaderHeight } from '@react-navigation/elements';
import type { ListRenderItem } from '@shopify/flash-list';
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

import ArticleCard from '@/components/library/ArticleCard';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { Article } from '@/types/articles.types';
import { generateImageUrl } from '@/utils/imageUtils';

// v2 optimized constants - no need for item height estimates
const DRAW_DISTANCE = LAYOUT.CARD.HEIGHT.LIST_ITEM * LIST_DRAW_DISTANCE_MULTIPLIER;

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
}

const ArticleItem = memo(({ item }: ArticleItemProps) => {
  const [isPending] = useTransition();

  // Note: Navigation is now handled by Link component in ArticleCard

  return (
    <ArticleCard
      article={item}
      author={item.author.name}
      category={item.category.name}
      categoryForDisplay={item.category.name}
      imageUrl={generateImageUrl(item.image_url)}
      style={[styles.articleCard, isPending && styles.pendingCard]}
      summary={String(item.summary)}
      title={item.title}
      prefetch={true}
      isRelatedArticle={false}
      testID={`article-${item.id}`}
    />
  );
});

ArticleItem.displayName = 'ArticleItem';

interface ArticleListProps {
  onRefresh?: () => void;
  ListHeaderComponent?: ComponentType<object> | ReactElement | null;
  ListFooterComponent?: ComponentType<object> | ReactElement | null;
  contentContainerStyle?: StyleProp<ViewStyle>;
  progressViewOffset?: number;
  isRefreshing?: boolean;
}

const ArticleList = forwardRef<any, ArticleListProps>(
  (
    {
      onRefresh,
      ListHeaderComponent,
      ListFooterComponent,
      contentContainerStyle,
      progressViewOffset,
      isRefreshing = false,
    },
    ref
  ) => {
    const colors = useColors();
    const listRef = useRef<any>(null);
    const insets = useSafeAreaInsets();
    const headerHeight = useHeaderHeight();
    const [, startTransition] = useTransition();

    // Use refs to store stable values and only update when significantly changed
    const stableHeaderHeightRef = useRef(headerHeight);
    const stableInsetsBottomRef = useRef(insets.bottom);

    // Update refs only when values change significantly (reduce noise from small changes)
    if (Math.abs(stableHeaderHeightRef.current - headerHeight) > 5) {
      stableHeaderHeightRef.current = headerHeight;
    }
    if (Math.abs(stableInsetsBottomRef.current - insets.bottom) > 5) {
      stableInsetsBottomRef.current = insets.bottom;
    }

    useImperativeHandle(ref, () => listRef.current, []);

    // Optimized render item with stable reference
    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} />,
      []
    );

    // Optimized refresh handler
    const handleRefreshWithTransition = useCallback(() => {
      if (onRefresh) {
        startTransition(() => {
          onRefresh();
        });
      }
    }, [onRefresh]);

    // Memoized refresh control - extract colors to avoid re-creation
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
              : stableHeaderHeightRef.current + LAYOUT.SPACING.XXLARGE
          }
          onRefresh={handleRefreshWithTransition}
        />
      ),
      [
        isRefreshing,
        handleRefreshWithTransition,
        colors, // Use entire colors object as dependency
        stableHeaderHeightRef.current,
        progressViewOffset,
      ]
    );

    // Optimized content container style - cache the base style and only update when necessary
    const safeContentContainerStyle = useMemo(
      () => ({
        ...(contentContainerStyle as any),
        paddingBottom:
          stableInsetsBottomRef.current + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
      }),
      [contentContainerStyle, stableInsetsBottomRef.current]
    );

    // FlashList v2 configuration - no estimates needed, automatic layout
    const flashListConfig = useMemo(
      () => ({
        data: [] as Article[], // Empty data since articles are in header
        renderItem,
        keyExtractor: articleKeyExtractor,
        showsVerticalScrollIndicator: false,
        contentContainerStyle: safeContentContainerStyle,
        ListHeaderComponent,
        ListFooterComponent,
        refreshControl,
        scrollEventThrottle: 16,
        ItemSeparatorComponent: SeparatorComponent,
        drawDistance: DRAW_DISTANCE,
        removeClippedSubviews: true,
        // v2 performance optimizations
        maxItemsInRecyclePool: 20, // Control memory usage for better performance
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
