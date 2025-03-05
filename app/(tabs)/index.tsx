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
import { LoadingScreen } from '@/components/Loader';
import { useAppSelectorMemo } from '@/store/hooks';
import { Theme } from '@/constants/Colors';
import React from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { CategorySelector } from '../../components/CategorySelector';
import type { Tables } from '@/types/database.types';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

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
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Refs
  const flatListRef = useRef<FlatList>(null);
  const isInitialMount = useRef(true);
  const loadingStartTime = useRef<number | null>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedRef = useRef(false);

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
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingTop: hasCategories
        ? CATEGORY_SELECTOR_HEIGHT + LAYOUT.SPACING.LARGE
        : LAYOUT.SPACING.LARGE,
      paddingBottom:
        Platform.OS === 'ios'
          ? LAYOUT.CONTENT_SPACING.BOTTOM +
            LAYOUT.BOTTOM_BAR.HEIGHT -
            20 +
            (insets.bottom > 0 ? 0 : 10)
          : LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT,
    }),
    [hasCategories, colors.background, insets.bottom]
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
        dataLoadedRef.current = true;

        // Also fetch categories if they haven't been fetched yet
        if (categories.length === 0) {
          fetchCategories();
        }
      } catch (err) {
        setError('Failed to fetch articles. Pull down to try again.');
        // Make sure to set loading states to false on error
        setIsLoading(false);
        setIsRefreshing(false);
      } finally {
        // Ensure loader shows for at least 500ms for a more consistent experience
        const timeElapsed = loadingStartTime.current ? Date.now() - loadingStartTime.current : 0;
        const remainingTime = Math.max(0, 500 - timeElapsed);

        if (remainingTime > 0 && !showRefreshing) {
          loadingTimeoutRef.current = setTimeout(() => {
            setIsLoading(false);
            setIsRefreshing(false);
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
    setForceUpdate(true);
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

  // Use focus effect to refresh data when tab becomes active, but only when necessary
  useFocusEffect(
    useCallback(() => {
      // Always fetch on first mount, then only when force update is requested
      if (isInitialMount.current || forceUpdate) {
        fetchArticles();
        if (forceUpdate) {
          setForceUpdate(false);
        }
        if (isInitialMount.current) {
          isInitialMount.current = false;
        }
      } else {
        // If we already have data but are still showing loading, make sure to hide it
        if (dataLoadedRef.current && isLoading) {
          setIsLoading(false);
        }
      }

      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }, [fetchArticles, forceUpdate, isLoading])
  );

  // Force loading to false if we have data, regardless of other conditions
  useEffect(() => {
    if (articles.length > 0) {
      // Use a small timeout to ensure state updates properly
      setTimeout(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      }, 100);
    }
  }, [articles]);

  // Add a safety timeout to ensure loading state doesn't get stuck
  useEffect(() => {
    if (isLoading) {
      // If loading takes more than 5 seconds, force it to complete
      const safetyTimeout = setTimeout(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      }, 5000);

      return () => clearTimeout(safetyTimeout);
    }
  }, [isLoading]);

  // Render loading state
  if (isLoading && !isRefreshing && (!dataLoadedRef.current || articles.length === 0)) {
    return (
      <ThemedView style={styles.container}>
        <LoadingScreen />
      </ThemedView>
    );
  }

  // Main render
  return (
    <Animated.View style={{ flex: 1 }} entering={FadeIn.duration(300)}>
      <ThemedView
        style={styles.container}
        useSafeArea={true}
        includeBottomInset={false} // Don't include bottom inset to avoid double padding with tab bar
      >
        {/* Header with title */}
        <View style={[styles.headerContainer, { borderBottomColor: colors.cardBorder }]}>
          <ThemedText style={styles.headerTitle}>Texts</ThemedText>
        </View>

        {/* Content container with proper padding */}
        <View style={[styles.contentContainer, { backgroundColor: colors.background }]}>
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
            style={{ zIndex: 1, backgroundColor: colors.background }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.tint]}
                tintColor={colors.tint}
                progressBackgroundColor={colors.cardBackground}
                style={{ zIndex: 1 }}
              />
            }
            contentContainerStyle={contentContainerStyle}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={10}
            initialNumToRender={4}
          />

          {/* Sticky floating category selector with perfect spacing */}
          {hasCategories && (
            <View style={styles.categorySelectorWrapper} pointerEvents="box-none">
              <CategorySelector
                categories={categories}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleCategorySelect}
              />
            </View>
          )}
        </View>
      </ThemedView>
    </Animated.View>
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
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: Platform.select({
      ios: LAYOUT.CONTENT_SPACING.TOP,
      android: LAYOUT.CONTENT_SPACING.TOP + LAYOUT.SPACING.XLARGE,
    }),
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: LAYOUT.BORDER.WIDTH.THIN,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 5,
  },
  headerTitle: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
  },
  categorySelectorWrapper: {
    position: 'absolute',
    top: LAYOUT.SPACING.TINY,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 2,
    paddingBottom: 4,
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
});
