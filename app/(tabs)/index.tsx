import {
  StyleSheet,
  FlatList,
  ListRenderItem,
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Animated,
  RefreshControl,
  ViewStyle,
} from 'react-native';
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

// Constants
const ITEM_HEIGHT = 360;
const SCROLL_THRESHOLD = 20;
const ANIMATION_DURATION = 200;
const INITIAL_SCROLL_THRESHOLD = 50;

// Memoize the card component for better performance
const MemoizedCard = memo(ThemedCard);

export default function TextsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Refs
  const lastScrollY = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  const categoryVisibleAnim = useRef(new Animated.Value(1)).current;

  // State
  const [isTabBarVisible, setIsTabBarVisible] = useState(true);
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Tables<'categories'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized values
  const categoryPillsHeight = useMemo(
    () => Math.max(insets.top, 16) + 12 + 8 + 32, // paddingTop + paddingVertical + pillHeight
    [insets.top]
  );

  const tabBarStyle = useMemo(() => {
    const style: ViewStyle = {
      ...Platform.select({
        ios: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.icon,
        },
        android: {
          backgroundColor: colors.cardBackground,
          borderTopColor: colors.icon,
          elevation: 8,
        },
      }),
      position: 'absolute' as const,
      bottom: isTabBarVisible ? 0 : -100,
      height: isTabBarVisible ? 'auto' : 0,
      opacity: isTabBarVisible ? 1 : 0,
    };
    return style;
  }, [colors.cardBackground, colors.icon, isTabBarVisible]);

  // Callbacks
  const fetchArticles = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setIsRefreshing(true);
        } else if (!isRefreshing) {
          setIsLoading(true);
        }
        setError(null);

        const fetchedArticles = await articlesService.getArticles(
          selectedCategory ? selectedCategory.id : undefined
        );
        setArticles(fetchedArticles);
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedCategory, isRefreshing]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await categoriesService.getCategories();
      setCategories(fetchedCategories);
    } catch {
      // We don't set error here to avoid blocking article display
      console.warn('Failed to fetch categories');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchArticles(true);
    fetchCategories();
  }, [fetchArticles, fetchCategories]);

  const handleCategorySelect = useCallback((category: Tables<'categories'> | null) => {
    setSelectedCategory(category);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const toggleTabBarVisibility = useCallback(
    (visible: boolean) => {
      if (visible !== isTabBarVisible) {
        setIsTabBarVisible(visible);
        navigation.setOptions({ tabBarStyle });

        Animated.timing(categoryVisibleAnim, {
          toValue: visible ? 1 : 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }).start();
      }
    },
    [categoryVisibleAnim, isTabBarVisible, navigation, tabBarStyle]
  );

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentScrollY = event.nativeEvent.contentOffset.y;
      const scrollingDown = currentScrollY > lastScrollY.current;

      if (scrollingDown && isTabBarVisible && currentScrollY > INITIAL_SCROLL_THRESHOLD) {
        const scrollDelta = currentScrollY - lastScrollY.current;
        if (scrollDelta > SCROLL_THRESHOLD) {
          toggleTabBarVisibility(false);
        }
      } else if (!scrollingDown && !isTabBarVisible) {
        const scrollDelta = lastScrollY.current - currentScrollY;
        if (scrollDelta > SCROLL_THRESHOLD) {
          toggleTabBarVisibility(true);
        }
      }

      lastScrollY.current = currentScrollY;
    },
    [isTabBarVisible, toggleTabBarVisibility]
  );

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

  const keyExtractor = useCallback((item: Article) => item.id.toString(), []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const ListEmptyComponent = useCallback(() => {
    if (isLoading && !isRefreshing) {
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
  }, [isLoading, isRefreshing, error, colors.tint]);

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
        tintColor={colors.tint}
        colors={[colors.tint]}
        progressBackgroundColor={colors.cardBackground}
      />
    ),
    [isRefreshing, handleRefresh, colors.tint, colors.cardBackground]
  );

  // Effects
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Update tab bar style when colors change
  useEffect(() => {
    if (isTabBarVisible) {
      navigation.setOptions({ tabBarStyle });
    }
  }, [colors, isTabBarVisible, navigation, tabBarStyle]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.cardBackground }]}>
      <FlatList
        ref={flatListRef}
        data={articles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        contentContainerStyle={[styles.flatListContent, { paddingTop: categoryPillsHeight }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        ListEmptyComponent={ListEmptyComponent}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={5}
      />
      <CategoryPills
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleCategorySelect}
        visible={categoryVisibleAnim}
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
    minHeight: 200,
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
