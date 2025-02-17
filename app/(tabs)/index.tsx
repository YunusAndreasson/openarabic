import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  View,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useState, useCallback, useRef, memo } from 'react';
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
  const categoryPillsHeight = Math.max(insets.top, 16) + 12 + 8 + 32; // paddingTop + paddingVertical + pillHeight

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
              height: 49,
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
    [isTabBarVisible, navigation, colors, categoryVisibleAnim]
  );

  const fetchArticles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [articlesData, categoriesData] = await Promise.all([
        articlesService.getArticles(selectedCategory?.id),
        categoriesService.getCategories(),
      ]);
      setArticles(articlesData);
      setCategories(categoriesData);
    } catch {
      setError('Failed to load articles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [selectedCategory]);

  const filteredArticles = articles;

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

  const handleCategorySelect = useCallback((category: Tables<'categories'> | null) => {
    setSelectedCategory(category);
    // Scroll to top smoothly when changing categories
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

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
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ThemedView style={styles.container}>
        <CategoryPills
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleCategorySelect}
          visible={categoryVisibleAnim}
        />
        <FlatList
          ref={flatListRef}
          data={filteredArticles}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          maxToRenderPerBatch={2}
          windowSize={3}
          initialNumToRender={2}
          removeClippedSubviews={true}
          contentContainerStyle={[
            styles.listContainer,
            { paddingTop: categoryPillsHeight + 8 }, // Add some spacing between pills and list
          ]}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          refreshing={isLoading}
          onRefresh={fetchArticles}
          updateCellsBatchingPeriod={100}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          maintainVisibleContentPosition={{
            minIndexForVisible: 0,
            autoscrollToTopThreshold: 10,
          }}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
