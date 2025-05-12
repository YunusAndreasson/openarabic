import { useHeaderHeight } from '@react-navigation/elements';
import type { ListRenderItem, ContentStyle } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle, memo } from 'react';
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
  return (
    <ThemedCard
      variant="article"
      imageUrl={item.image_url || 'https://picsum.photos/800/400'}
      title={item.title}
      category={item.category?.name ?? 'Uncategorized'}
      author={item.author?.name ?? 'Anonymous'}
      onPress={() => onPress(item)}
      style={styles.articleCard}
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

    useImperativeHandle(ref, () => listRef.current as FlashList<Article>, []);

    const keyExtractor = useCallback((item: Article) => `article-${item.id}`, []);

    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} onPress={onArticlePress} />,
      [onArticlePress]
    );

    const refreshControl = useMemo(
      () => (
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
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
      [isRefreshing, onRefresh, colors.tint, colors.background, headerHeight, progressViewOffset]
    );

    const shouldHideContent = (hideWhileRefreshing && isRefreshing) || hideMainList;
    const displayData = shouldHideContent ? [] : articles;
    const displayHeader = shouldHideContent ? null : ListHeaderComponent;

    const safeContentContainerStyle = useMemo(
      () => ({
        ...(contentContainerStyle as ContentStyle),
        paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
      }),
      [contentContainerStyle, insets]
    );

    return (
      <FlashList
        ref={listRef}
        data={displayData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={ITEM_HEIGHT}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={safeContentContainerStyle}
        ListHeaderComponent={displayHeader}
        ListEmptyComponent={isLoading ? null : ListEmptyComponent}
        refreshControl={refreshControl}
        scrollEventThrottle={16}
        overrideItemLayout={(layout, _item) => {
          layout.size = ITEM_HEIGHT;
        }}
        drawDistance={DRAW_DISTANCE}
        estimatedListSize={ESTIMATED_LIST_SIZE}
      />
    );
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
});

export default ArticleList;
