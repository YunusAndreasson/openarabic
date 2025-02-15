import { StyleSheet, FlatList, ListRenderItem, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
import { router } from 'expo-router';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '../../services/articles';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';

const ITEM_HEIGHT = 360;

// Memoize the card component for better performance
const MemoizedCard = memo(ThemedCard);

export default function TextsScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const colors = useColors();

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await articlesService.getArticles();
      setArticles(data);
    } catch {
      setError('Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const renderItem: ListRenderItem<Article> = useCallback(({ item }) => {
    return (
      <MemoizedCard
        imageUrl={'https://picsum.photos/800/400'}
        title={item.title}
        category={item.category?.name ?? 'Uncategorized'}
        author={item.author?.name ?? 'Anonymous'}
        onPress={() => {
          router.push({
            pathname: '/article/[id]',
            params: { id: item.id },
          });
        }}
      />
    );
  }, []);

  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<Article> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  if (isLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={styles.loadingText}>Loading articles...</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <ThemedText style={styles.errorSubtext}>Pull down to try again</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        maxToRenderPerBatch={2}
        windowSize={3}
        initialNumToRender={2}
        removeClippedSubviews={true}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onEndReachedThreshold={0.5}
        refreshing={isLoading}
        onRefresh={fetchArticles}
        updateCellsBatchingPeriod={100}
        scrollEventThrottle={16}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingVertical: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    textAlign: 'center',
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  errorSubtext: {
    textAlign: 'center',
    marginHorizontal: 20,
    fontSize: 14,
    opacity: 0.7,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.8,
  },
});
