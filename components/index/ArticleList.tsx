import type { ListRenderItem, ContentStyle } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle, memo } from 'react';
import { StyleSheet, Platform, View, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ArticleListProps } from '@/types/ui/article.types';

import { LAYOUT, getHeaderHeight } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { Article } from '../../types/articles.types';
import ThemedCard from '../ThemedCard';

import { CopyrightFooter } from './CopyrightFooter';

const ITEM_HEIGHT = 360;

interface ListFooterProps {
  isLoading: boolean;
  articlesLength: number;
}

const ListFooter: React.FC<ListFooterProps> = ({ isLoading, articlesLength }) => {
  if (isLoading && articlesLength === 0) return null;
  return <CopyrightFooter />;
};

ListFooter.displayName = 'ListFooter';

// Move ArticleItem outside the parent component
interface ArticleItemProps {
  item: Article;
  onPress: (article: Article) => void;
}

const ArticleItem = memo(({ item, onPress }: ArticleItemProps) => {
  return (
    <View style={styles.articleItemContainer}>
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
    </View>
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
    },
    ref
  ) => {
    const colors = useColors();
    const listRef = useRef<FlashList<Article>>(null);
    const insets = useSafeAreaInsets();

    // Forward the ref to the parent component with type assertion
    useImperativeHandle(ref, () => listRef.current as FlashList<Article>, []);

    // Memoize the key extractor for better performance
    const keyExtractor = useCallback((item: Article) => `article-${item.id}`, []);

    // Render item function with better memoization
    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} onPress={onArticlePress} />,
      [onArticlePress]
    );

    const footerElement = useMemo(
      () => (isLoading && articles.length === 0 ? null : <CopyrightFooter />),
      [isLoading, articles.length]
    );

    const refreshControl = useMemo(
      () => (
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          colors={[colors.tint]}
          tintColor={colors.tint}
          progressBackgroundColor={colors.background}
          progressViewOffset={Platform.OS === 'android' ? 20 : 0}
        />
      ),
      [isRefreshing, onRefresh, colors.tint, colors.background]
    );

    // Determine if content should be hidden
    const shouldHideContent = (hideWhileRefreshing && isRefreshing) || hideMainList;
    const displayData = shouldHideContent ? [] : articles;
    const displayHeader = shouldHideContent ? null : ListHeaderComponent;

    // Create insets-aware content container style
    const safeContentContainerStyle = useMemo(
      () => ({
        ...(contentContainerStyle as ContentStyle),
        paddingBottom: insets.bottom + LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
        paddingTop: getHeaderHeight(insets),
      }),
      [contentContainerStyle, insets]
    );

    // Create a wrapper View to handle the background color and padding
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          ListFooterComponent={footerElement}
          refreshControl={refreshControl}
          scrollEventThrottle={16}
          overrideItemLayout={(layout, _item) => {
            layout.size = ITEM_HEIGHT;
          }}
          drawDistance={ITEM_HEIGHT * 5}
          estimatedListSize={{ height: ITEM_HEIGHT * 10, width: 0 }}
        />
      </View>
    );
  }
);

ArticleList.displayName = 'ArticleList';

const styles = StyleSheet.create({
  articleCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  articleItemContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    flex: 1,
  },
});

export default ArticleList;
