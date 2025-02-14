import { StyleSheet, FlatList, ListRenderItem } from 'react-native';
import { useEffect, useState, useCallback, useRef } from 'react';
import { router } from 'expo-router';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '../../services/articles';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';

const ITEM_HEIGHT = 300; // Approximate height of our card

export default function HomeScreen() {
  const [articles, setArticles] = useState<Article[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const data = await articlesService.getArticles();
        setArticles(data);
      } catch (error) {
        throw error;
      }
    };

    fetchArticles();
  }, []);

  const renderItem: ListRenderItem<Article> = useCallback(({ item }) => {
    return (
      <ThemedCard
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
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <ThemedView>
      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        maxToRenderPerBatch={10}
        windowSize={5}
        initialNumToRender={5}
        removeClippedSubviews={true}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
});
