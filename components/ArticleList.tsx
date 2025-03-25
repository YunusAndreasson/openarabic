import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet, FlatList, ListRenderItem, RefreshControl, Platform, View } from 'react-native';
import { LAYOUT } from '../constants/layout';
import { useColors } from '../hooks/useColors';
import { Article } from '../types/articles.types';
import ThemedCard from './ThemedCard';
import { CopyrightFooter } from './CopyrightFooter';
import { ArticleListProps } from '@/types/ui/article.types';

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

const ArticleList = forwardRef<FlatList<Article>, ArticleListProps>(
  (
    {
      articles,
      isLoading,
      isRefreshing = false,
      onRefresh,
      onArticlePress,
      ListHeaderComponent,
      ListEmptyComponent,
      contentContainerStyle,
    },
    ref
  ) => {
    const colors = useColors();
    const listRef = useRef<FlatList<Article>>(null);

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

    // Create a simplified article item component
    const ArticleItem = React.memo(({ item }: { item: Article }) => {
      return (
        <View style={styles.articleItemContainer}>
          <ThemedCard
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
      []
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
        initialNumToRender={1}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          { backgroundColor: colors.background },
          contentContainerStyle,
        ]}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={isLoading ? null : ListEmptyComponent}
        ListFooterComponent={footerElement}
        refreshControl={refreshControl}
        scrollEventThrottle={16}
        disableVirtualization={false}
        persistentScrollbar={false}
        updateCellsBatchingPeriod={50}
        onContentSizeChange={() => {
          if (listRef.current) {
            listRef.current.scrollToOffset({ offset: 0, animated: false });
          }
        }}
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
});

export default ArticleList;
