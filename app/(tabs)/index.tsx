import { StyleSheet } from 'react-native';
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// Components
import { ThemedView } from '@/components/ThemedView';
import { LoadingScreen } from '@/components/Loader';
import ArticleList from '@/components/ArticleList';

// Hooks and Services
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/hooks/useAuth';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';

// Store
import { fetchInProgressArticles, addToReadingList } from '@/store/readingListSlice';

// Utils and Constants
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { LAYOUT } from '@/constants/layout';
import {
  filterArticles,
  getRecentArticles,
  getLatestArticles,
  getFeaturedArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '@/utils/articleUtils';
import { getDayOfYear } from '@/utils/dateUtils';

// Types
import { Article } from '@/types/articles.types';
import type { Tables } from '@/types/database.types';

// Import the extracted components
import ArticleSection from '../../components/ArticleSection';
import FeaturedArticleSection from '../../components/FeaturedArticleSection';
import FilterList from '../../components/FilterList';
import DailyPickSection from '../../components/DailyPickSection';
import BackButton from '../../components/BackButton';
import FilterNotice from '../../components/FilterNotice';
import ErrorState from '../../components/ErrorState';

// Import the specialized filtered view component
import FilteredArticleView from '../../components/FilteredArticleView';

// Create a supabase client for fetching authors directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles before components that use them
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

// Properly wrap useAuth to avoid conditional hook calls
const useSafeAuth = () => {
  // Always call the hook regardless of availability
  let authResult: { session: any } = { session: null };

  // Try to get the session but safely handle errors
  try {
    const authData = useAuth();
    if (authData && authData.session) {
      authResult.session = authData.session;
    }
  } catch (e) {
    // If useAuth is not available, just return null session
    console.warn('useAuth not available or threw an error');
  }

  return authResult;
};

// Memoized article item renderer for better performance

export default function ArticlesScreen() {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const { session } = useSafeAuth();

  // Refs
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const isInitialMount = useRef(true);
  const loadingTimeoutRef = useRef<NodeJS.Timeout>();
  const dataLoadedRef = useRef(false);

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Tables<'categories'>[]>([]);
  const [authors, setAuthors] = useState<Tables<'authors'>[]>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forceUpdate, setForceUpdate] = useState(false);

  // Get inProgressArticles from Redux
  const { inProgressArticles } = useAppSelectorMemo(state => state.readingList);

  // Define fetchAuthors and fetchCategories functions
  const fetchAuthors = useCallback(async () => {
    try {
      const { data } = await supabase.from('authors').select('*');
      setAuthors(data || []);
    } catch (_err) {
      // Error handling is silent as it's not critical
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const categoriesData = await categoriesService.getCategories();
      setCategories(categoriesData);
    } catch (_err) {
      // Don't set error state here, as it's not critical
    }
  }, []);

  // Add an effect to fetch in-progress articles when the component mounts
  useEffect(() => {
    dispatch(fetchInProgressArticles());
  }, [dispatch]);

  // Add effects to fetch authors and categories when the component mounts
  useEffect(() => {
    fetchAuthors();
  }, [fetchAuthors]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Is in filtered view (either by author or category)
  const isInFilteredView = useMemo(
    () => selectedAuthorId !== null || selectedCategoryId !== null,
    [selectedAuthorId, selectedCategoryId]
  );

  // Get selected author name
  const selectedAuthor = useMemo(() => {
    if (selectedAuthorId === null) return null;
    return authors.find(author => author.id === selectedAuthorId) || null;
  }, [selectedAuthorId, authors]);

  // Get selected category name
  const selectedCategory = useMemo(() => {
    if (selectedCategoryId === null) return null;
    return categories.find(category => category.id === selectedCategoryId) || null;
  }, [selectedCategoryId, categories]);

  // Filter articles by selected author or category
  const filteredArticles = useMemo(() => {
    return filterArticles(articles, selectedAuthorId, selectedCategoryId);
  }, [articles, selectedAuthorId, selectedCategoryId]);

  // Organized articles by category
  const recentArticles = useMemo(() => getRecentArticles(filteredArticles), [filteredArticles]);
  const latestArticles = useMemo(() => getLatestArticles(filteredArticles), [filteredArticles]);
  const featuredArticles = useMemo(() => getFeaturedArticles(filteredArticles), [filteredArticles]);
  const beginnerArticles = useMemo(() => getBeginnerArticles(filteredArticles), [filteredArticles]);

  // Refined content container style for consistent spacing
  const contentContainerStyle = useMemo(
    () => ({
      flexGrow: 1,
      backgroundColor: colors.background,
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: 0,
    }),
    [colors.background]
  );

  // Fetch data function
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Only pass the ID if it's not null
      const categoryId = selectedCategoryId !== null ? selectedCategoryId : undefined;
      const authorId = selectedAuthorId !== null ? selectedAuthorId : undefined;

      const fetchedArticles = await articlesService.getArticles(categoryId, authorId);
      setArticles(fetchedArticles);

      // Mark data as loaded
      dataLoadedRef.current = true;

      // Fetch authors and categories if they haven't been fetched yet
      if (authors.length === 0) {
        fetchAuthors();
      }

      if (categories.length === 0) {
        fetchCategories();
      }

      // Dispatch fetchInProgressArticles after fetching articles
      dispatch(fetchInProgressArticles());
    } catch (_err) {
      setError('Failed to load articles');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    selectedCategoryId,
    selectedAuthorId,
    dispatch,
    authors.length,
    categories.length,
    fetchAuthors,
    fetchCategories,
  ]);

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setForceUpdate(true);
    fetchArticles();
  }, [fetchArticles]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      // Navigate to article detail
      router.push(`/article/${article.id}`);

      // Add to reading list if authenticated
      if (!session?.user) {
        // Skip adding to reading list if not authenticated
        return;
      }

      // Add to reading list
      dispatch(addToReadingList(article.id));
    },
    [dispatch, session?.user]
  );

  const handleSelectAuthor = useCallback((authorId: number) => {
    Haptics.selectionAsync();
    // Clear any category filter if active
    setSelectedCategoryId(null);
    setSelectedAuthorId(authorId);

    // Scroll to top when changing author
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    Haptics.selectionAsync();
    // Clear any author filter if active
    setSelectedAuthorId(null);
    setSelectedCategoryId(categoryId);

    // Scroll to top when changing category
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

  const handleClearFilters = useCallback(() => {
    Haptics.selectionAsync();
    setSelectedAuthorId(null);
    setSelectedCategoryId(null);

    // Scroll to top when clearing filters
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, []);

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

      // Clean up any pending timeouts
      return () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
        }
      };
    }, [fetchArticles, forceUpdate, isLoading])
  );

  // Create a header component for the FlatList
  const ListHeaderComponent = useCallback(() => {
    if (isInFilteredView) {
      return (
        <>
          <BackButton onPress={handleClearFilters} />
          {selectedAuthor && <FilterNotice type="author" name={selectedAuthor.name} />}
          {selectedCategory && <FilterNotice type="category" name={selectedCategory.name} />}
        </>
      );
    }

    return (
      <>
        <DailyPickSection
          article={getDailyPickArticle(articles, getDayOfYear())}
          onPress={handleArticlePress}
        />

        <ArticleSection
          title="Continue Reading"
          articles={inProgressArticles}
          onArticlePress={article => router.push(`/article/${article.id}`)}
          delay={100}
          showTimeAgo={true}
          emptyStateMessage="No articles in progress. Start reading to see them here!"
        />

        {latestArticles.length > 0 && (
          <ArticleSection
            title="Latest Articles"
            articles={latestArticles}
            onArticlePress={handleArticlePress}
            delay={150}
            showTimeAgo={true}
          />
        )}

        {featuredArticles.length > 0 && (
          <FeaturedArticleSection
            title="Featured Articles"
            articles={featuredArticles}
            onArticlePress={handleArticlePress}
            delay={300}
          />
        )}

        {recentArticles.length > 0 && (
          <ArticleSection
            title="Recently Added"
            articles={recentArticles}
            onArticlePress={handleArticlePress}
            delay={300}
          />
        )}

        {beginnerArticles.length > 0 && (
          <ArticleSection
            title="Beginner Friendly"
            articles={beginnerArticles}
            onArticlePress={handleArticlePress}
            delay={400}
          />
        )}

        {/* Author filter list */}
        <FilterList
          title="Browse by Author"
          items={authors}
          selectedId={selectedAuthorId}
          onSelect={handleSelectAuthor}
          onClearFilter={handleClearFilters}
          animationDelay={600}
          itemAnimationDelay={650}
        />

        {/* Category filter list */}
        <FilterList
          title="Browse by Category"
          items={categories}
          selectedId={selectedCategoryId}
          onSelect={handleSelectCategory}
          animationDelay={700}
          itemAnimationDelay={750}
        />
      </>
    );
  }, [
    isInFilteredView,
    articles,
    handleArticlePress,
    inProgressArticles,
    latestArticles,
    featuredArticles,
    recentArticles,
    beginnerArticles,
    authors,
    selectedAuthorId,
    handleSelectAuthor,
    handleClearFilters,
    categories,
    selectedCategoryId,
    handleSelectCategory,
    selectedAuthor,
    selectedCategory,
  ]);

  // Create an empty state component
  const EmptyStateComponent = useCallback(() => {
    // Return an empty fragment instead of null to satisfy the type requirement
    return <></>;
  }, []);

  // Show loading screen if no data yet
  if (isLoading && !isRefreshing && articles.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['top', 'left', 'right']}
      accessibilityLabel="Articles browse screen"
      accessibilityRole="scrollbar"
    >
      {error ? (
        <ErrorState message={error} />
      ) : isInFilteredView ? (
        // Use our specialized component for filtered views
        <FilteredArticleView
          articles={filteredArticles}
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onArticlePress={handleArticlePress}
          ListHeaderComponent={ListHeaderComponent()}
        />
      ) : (
        // Use the normal ArticleList for non-filtered views
        <ArticleList
          articles={[]} // Empty array since the content is in the header
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onArticlePress={handleArticlePress}
          ListHeaderComponent={ListHeaderComponent()}
          ListEmptyComponent={EmptyStateComponent()}
          contentContainerStyle={contentContainerStyle}
        />
      )}
    </ThemedView>
  );
}
