import { StyleSheet, FlatList, ListRenderItem, Platform, View, RefreshControl } from 'react-native';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { router } from 'expo-router';
import ThemedCard from '@/components/ThemedCard';
import { articlesService } from '../../services/articles';
import { categoriesService } from '../../services/categories';
import { Article } from '@/types/articles.types';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useColors } from '@/hooks/useColors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LAYOUT } from '@/constants/layout';
import { Loader, LoadingScreen } from '@/components/Loader';
import { useAppSelectorMemo } from '@/store/hooks';
import { Theme } from '@/constants/Colors';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { CategorySelector } from '../../components/CategorySelector';
import type { Tables } from '@/types/database.types';

// Constants
const ITEM_HEIGHT = 360;

// Fixed height for the category selector (match this with the actual component)
const CATEGORY_SELECTOR_HEIGHT = 38;

// Empty state components
const EmptyState = React.memo(() => (
  <View style={styles.emptyContainer}>
    <ThemedText style={styles.emptyText}>No articles available right now</ThemedText>
  </View>
));

const ErrorState = React.memo(({ message }: { message: string }) => (
  <View style={styles.emptyContainer}>
    <ThemedText style={styles.emptyText}>{message}</ThemedText>
  </View>
));

export default function ArticlesScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<any>>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const currentTheme = useAppSelectorMemo(state => state.theme.theme);
  const isDarkTheme = currentTheme === Theme.Dark;

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const isInitialMount = useRef(true);
  const loadingStartTime = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Memoized values
  const hasCategories = useMemo(() => categories.length > 0, [categories.length]);

  // Filter articles when category selection changes
  useEffect(() => {
    if (selectedCategoryId === null) {
      setFilteredArticles(articles);
    } else {
      setFilteredArticles(articles.filter(article => article.category_id === selectedCategoryId));
    }
  }, [articles, selectedCategoryId]);

  // Memoized content container style
  const contentContainerStyle = useMemo(
    () => ({
      ...styles.flatListContent,
      paddingTop: hasCategories
        ? CATEGORY_SELECTOR_HEIGHT + LAYOUT.SPACING.LARGE
        : LAYOUT.SPACING.LARGE,
    }),
    [hasCategories]
  );

  const fetchCategories = useCallback(async () => {
    try {
      const fetchedCategories = await categoriesService.getCategories();
      setCategories(fetchedCategories);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  }, []);

  const fetchArticles = useCallback(
    async (showRefreshing = false) => {
      // Clear any existing timeouts
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = undefined;
      }

      try {
        if (showRefreshing) {
          setIsRefreshing(true);
        } else if (!isRefreshing) {
          setIsLoading(true);
          loadingStartTime.current = Date.now();
        }
        setError(null);

        const fetchedArticles = await articlesService.getArticles();
        setArticles(fetchedArticles);

        // Also fetch categories if they haven't been fetched yet
        if (categories.length === 0) {
          fetchCategories();
        }
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
      } finally {
        // Ensure loader shows for at least 500ms for a more consistent experience
        const timeElapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
        const remainingTime = Math.max(0, 500 - timeElapsed);

        if (remainingTime > 0 && !showRefreshing) {
          loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
            loadingStartTime.current = null;
          }, remainingTime);
        } else {
          setIsLoading(false);
          setIsRefreshing(false);
          loadingStartTime.current = null;
        }
      }
    },
    [isRefreshing, categories.length, fetchCategories]
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchArticles(true);
  }, [fetchArticles]);

  const handleCategorySelect = useCallback((categoryId: number | null) => {
    // Play haptic feedback for category selection
    Haptics.selectionAsync();

    // Scroll to top when category changes
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }

    setSelectedCategoryId(categoryId);
  }, []);

  // Navigation options
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: {
        ...styles.tabBar,
        backgroundColor: colors.background,
        ...Platform.select({
          ios: {
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: LAYOUT.OPACITY.DIMMED / 2,
            shadowRadius: LAYOUT.SPACING.SMALL / 2,
            paddingBottom: LAYOUT.SPACING.SMALL,
          },
          android: {
            elevation: 8,
          },
        }),
      },
      tabBarIconStyle: Platform.OS === 'ios' ? { marginTop: LAYOUT.SPACING.TINY } : undefined,
      tabBarLabelStyle:
        Platform.OS === 'ios'
          ? {
              fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
              marginBottom: LAYOUT.SPACING.TINY,
              fontWeight: '500',
            }
          : undefined,
    });
  }, [navigation, colors]);

  // Memoize renderItem to prevent unnecessary re-renders
  const renderItem = useCallback<ListRenderItem<Article>>(
    ({ item }) => (
      <View style={styles.articleItemContainer}>
        <ThemedCard
          imageUrl={item.image_url || 'https://picsum.photos/800/400'}
          title={item.title}
          category={item.category?.name ?? 'Uncategorized'}
          author={item.author?.name ?? 'Anonymous'}
          onPress={() => router.push(`/article/${item.id}`)}
          style={styles.articleCard}
        />
      </View>
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

  // Memoize list empty component
  const ListEmptyComponent = useMemo(() => {
    if (error) {
      return <ErrorState message={error} />;
    }

    return selectedCategoryId === null ? (
      <EmptyState />
    ) : (
      <ErrorState message={`No articles found in this category. Try another category.`} />
    );
  }, [error, selectedCategoryId]);

  const ItemSeparatorComponent = useCallback(() => <View style={styles.itemSeparator} />, []);

  // Use focus effect to refresh data when tab becomes active
  useFocusEffect(
    useCallback(() => {
      fetchArticles();
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }, [fetchArticles])
  );

  // Toggle forceUpdate to trigger a re-render if needed (e.g., for theme changes)
  useEffect(() => {
    if (!isInitialMount.current) {
      // Use functional state updates for theme changes
      setArticles(prevArticles => [...prevArticles]);
    } else {
      isInitialMount.current = false;
    }
  }, [isDarkTheme]);

  // Render loading state
  if (isLoading && !isRefreshing) {
    return (
      <ThemedView style={styles.container}>
        <LoadingScreen />
      </ThemedView>
    );
  }

  // Main render
  return (
    <ThemedView style={styles.container}>
      {/* Header with title */}
      <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
        <ThemedText style={styles.headerTitle}>Texts</ThemedText>
      </View>

      {/* Content container with proper padding */}
      <View style={styles.contentContainer}>
        {/* Article list with optimized rendering */}
        <FlatList
          ref={flatListRef}
          data={filteredArticles}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          ListEmptyComponent={ListEmptyComponent}
          ItemSeparatorComponent={ItemSeparatorComponent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.tint]}
              tintColor={colors.tint}
              progressBackgroundColor={colors.cardBackground}
            />
          }
          contentContainerStyle={contentContainerStyle}
          scrollEventThrottle={16}
          removeClippedSubviews={Platform.OS === 'android'}
          maxToRenderPerBatch={5}
          windowSize={10}
          initialNumToRender={4}
        />

        {/* Sticky floating category selector with perfect spacing */}
        {hasCategories && (
          <View style={styles.categorySelectorWrapper}>
            <CategorySelector
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleCategorySelect}
            />
          </View>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 5,
    marginBottom: 0,
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '700',
  },
  categorySelectorWrapper: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  articleItemContainer: {
    width: '100%',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  articleCard: {
    width: '100%',
    marginBottom: 0,
  },
  itemSeparator: {
    height: LAYOUT.SPACING.XLARGE,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.SPACING.XLARGE,
    flex: 1,
    minHeight: 300,
  },
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DIMMED,
    textAlign: 'center',
  },
  flatListContent: {
    flexGrow: 1,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
