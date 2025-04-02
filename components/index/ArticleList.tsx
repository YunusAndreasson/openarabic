import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, Platform, View, RefreshControl } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import { Article } from '../../types/articles.types';
import ThemedCard from '../ThemedCard';
import { CopyrightFooter } from './CopyrightFooter';
import { ArticleListProps } from '@/types/ui/article.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    },
    ref
  ) => {
    const colors = useColors();
    const listRef = useRef<FlashList<Article>>(null);
    const insets = useSafeAreaInsets();

    // Forward the ref to the parent component
    useImperativeHandle(ref, () => listRef.current!, []);

    // Memoize the key extractor for better performance
    const keyExtractor = useCallback((item: Article) => `article-${item.id}`, []);

    // Create a simplified article item component
    const ArticleItem = React.memo(({ item }: { item: Article }) => {
      return (
        <View style={styles.articleItemContainer}>
          <ThemedCard
            variant="article"
            imageUrl={item.image_url || 'https://picsum.photos/800/400'}
            title={item.title}
            category={item.category?.name ?? 'Uncategorized'}
            author={item.author?.name ?? 'Anonymous'}
            onPress={() => onArticlePress(item)}
            style={styles.articleCard}
            shadowSize="medium"
          />
        </View>
      );
    });

    ArticleItem.displayName = 'ArticleItem';

    // Render item function with better memoization
    const renderItem: ListRenderItem<Article> = useCallback(
      ({ item }) => <ArticleItem item={item} />,
      [ArticleItem]
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

    // Create a wrapper View to handle the background color and padding
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <FlashList
          ref={listRef}
          data={hideMainList ? [] : articles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={ITEM_HEIGHT}
          showsVerticalScrollIndicator={true}
          contentContainerStyle={{
            paddingTop: Math.max(insets.top + LAYOUT.SPACING.XXLARGE + LAYOUT.SPACING.MEDIUM),
            paddingBottom:
              LAYOUT.CONTENT_SPACING.BOTTOM +
              LAYOUT.BOTTOM_BAR.HEIGHT +
              insets.bottom +
              LAYOUT.SPACING.SMALL,
          }}
          ListHeaderComponent={ListHeaderComponent}
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
  articleItemContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  articleCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
  },
});

export default ArticleList;
