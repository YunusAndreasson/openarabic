import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useRef, memo, useMemo } from 'react';
import { router, useNavigation } from 'expo-router';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '../../services/articles';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { CategoryPills } from '@/components/CategoryPills';
import { categoriesService } from '@/services/categories';
import type { Tables } from '@/types/database.types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ITEM_HEIGHT = 360;

// Memoize the card component for better performance
const MemoizedCard = memo(ThemedCard);

export default function TextsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const lastScrollY = useRef(0);
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const categoryVisibleAnim = useRef(new Animated.Value(1)).current;
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Calculate the total height of the CategoryPills component
  const categoryPillsHeight = useMemo(
    () => Math.max(insets.top, 16) + 12 + 8 + 32, // paddingTop + paddingVertical + pillHeight
    [insets.top]
  );

  // Memoize the scroll handler to prevent unnecessary rerenders
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollingDown = currentScrollY > lastScrollY.current;
      const scrollThreshold = 20;

      if (scrollingDown && isTabBarVisible && currentScrollY > 50) {
        const scrollDelta = currentScrollY - lastScrollY.current;
        if (scrollDelta > scrollThreshold) {
          setIsTabBarVisible(false);
          navigation.setOptions({
            tabBarStyle: {
              ...Platform.select({
                ios: {
                  backgroundColor: colors.background,
                  borderTopColor: colors.icon,
                },
                android: {
                  backgroundColor: colors.background,
                  borderTopColor: colors.icon,
                  elevation: 8,
                },
              }),
              position: 'absolute',
              bottom: -100,
              height: 0,
              opacity: 0,
            },
          });
          Animated.timing(categoryVisibleAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      } else if (!scrollingDown && !isTabBarVisible) {
        const scrollDelta = lastScrollY.current - currentScrollY;
        if (scrollDelta > scrollThreshold) {
          setIsTabBarVisible(true);
          navigation.setOptions({
            tabBarStyle: {
              ...Platform.select({
                ios: {
                  backgroundColor: colors.background,
                  borderTopColor: colors.icon,
                },
                android: {
                  backgroundColor: colors.background,
                  borderTopColor: colors.icon,
                  elevation: 8,
                },
              }),
              position: 'absolute',
              bottom: 0,
              height: 'auto',
              opacity: 1,
            },
          });
          Animated.timing(categoryVisibleAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      }

      lastScrollY.current = currentScrollY;
    },
    [categoryVisibleAnim, colors.background, colors.icon, isTabBarVisible, navigation]
  );

  // Memoize the fetchArticles function to prevent unnecessary rerenders
  const fetchArticles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedArticles = await articlesService.getArticles(
        selectedCategory ? selectedCategory.id : undefined
      );
      setArticles(fetchedArticles);
    } catch {
      setError('Failed to fetch articles');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory]);

  // Memoize the fetchCategories function to prevent unnecessary rerenders
  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await categoriesService.getCategories();
      setCategories(fetchedCategories);
    } catch {
      setError('Failed to fetch categories');
    }
  }, []);

  // Memoize the handleCategorySelect function to prevent unnecessary rerenders
  const handleCategorySelect = useCallback((category: Tables<'categories'> | null) => {
    setSelectedCategory(category);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Memoize the renderItem function to prevent unnecessary rerenders
  const renderItem = useCallback<ListRenderItem<Article>>(
    ({ item }) => (
      <MemoizedCard
        imageUrl={'https://picsum.photos/800/400'}
        title={item.title}
        category={item.category?.name ?? 'Uncategorized'}
        author={item.author?.name ?? 'Anonymous'}
        onPress={() => router.push(`/article/${item.id}`)}
      />
    ),
    []
  );

  // Memoize the keyExtractor function to prevent unnecessary rerenders
  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  // Memoize the getItemLayout function to prevent unnecessary rerenders
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Memoize the ListEmptyComponent to prevent unnecessary rerenders
  const ListEmptyComponent = useCallback(() => {
    if (isLoading) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </ThemedView>
      );
    }

    if (error) {
      return (
        <ThemedView style={styles.emptyContainer}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </ThemedView>
      );
    }

    return (
      <ThemedView style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>No articles found</ThemedText>
      </ThemedView>
    );
  }, [isLoading, error, colors.tint]);

  // Fetch articles and categories on mount
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return (
    <ThemedView style={styles.container}>
      <CategoryPills
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        visible={categoryVisibleAnim}
      />
      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={[styles.flatListContent, { paddingTop: categoryPillsHeight + 16 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorText: {
    textAlign: 'center',
    marginHorizontal: 20,
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    opacity: 0.7,
  },
  flatListContent: {
    paddingVertical: 12,
  },
});
