import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useGlobalSearchParams, router, Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

// Components
import FilteredArticleView from '../components/FilteredArticleView';
import { LoadingScreen } from '../components/Loader';
import ErrorState from '../components/ErrorState';

// Services
import { articlesService } from '../services/articles';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';
import { LAYOUT } from '../constants/layout';

// Animation hooks
import { useScreenAnimation } from '../hooks/animations';
import { useNavigationWithDebounce } from '../hooks/useNavigationWithDebounce';

// Types
import { Article } from '../types/articles.types';
import type { Tables } from '../types/database.types';

// Create a supabase client for fetching data directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default function FilterScreen() {
  // Hide the native header
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FilterScreenContent />
    </>
  );
}

function FilterScreenContent() {
  // Get route params with fallback handling
  const params = useGlobalSearchParams();
  const type = params.type as string;
  const id = params.id as string;

  // Track initial render to prevent re-animation on returns
  const isInitialMount = useRef(true);

  // Debug params
  useEffect(() => {
    console.log('Filter params:', {
      type,
      id,
      rawParams: JSON.stringify(params),
    });
  }, [type, id, params]);

  // State
  const [articles, setArticles] = useState<Article[]>([]);
  const [author, setAuthor] = useState<Tables<'authors'> | null>(null);
  const [category, setCategory] = useState<Tables<'categories'> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if data is ready for animations
  const isDataReady = useMemo(() => {
    return articles.length > 0 || error !== null;
  }, [articles.length, error]);

  // Use the screen animation hook
  const { fadeInStyle } = useScreenAnimation(
    isDataReady,
    isLoading
    // Using default values for remaining parameters
  );

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Memoize content container style
  const contentContainerStyle = useMemo(() => {
    return {
      flexGrow: 1,
      paddingTop: LAYOUT.SPACING.MEDIUM,
      paddingBottom: LAYOUT.SPACING.XLARGE + LAYOUT.BOTTOM_BAR.HEIGHT,
    };
  }, []);

  // Fetch author details
  const fetchAuthor = useCallback(async (authorId: number) => {
    try {
      const { data } = await supabase.from('authors').select('*').eq('id', authorId).single();
      setAuthor(data);
    } catch (err) {
      console.error('Error fetching author:', err);
    }
  }, []);

  // Fetch category details
  const fetchCategory = useCallback(async (categoryId: number) => {
    try {
      const { data } = await supabase.from('categories').select('*').eq('id', categoryId).single();
      setCategory(data);
    } catch (err) {
      console.error('Error fetching category:', err);
    }
  }, []);

  // Fetch articles based on filter type and ID
  const fetchArticles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Bail early if we don't have enough information
      if (!id) {
        throw new Error('Missing ID parameter');
      }

      // Defensive type checking with simpler approach
      const filterType = type ? String(type).toLowerCase().trim() : 'unknown';
      console.log('Processing filter type:', filterType);

      // Parse ID to number with validation
      const numericId = parseInt(id as string, 10);

      if (isNaN(numericId)) {
        throw new Error(`Invalid ID provided: ${id}`);
      }

      // Fetch articles based on filter type
      if (filterType === 'author') {
        console.log('Fetching articles for author:', numericId);
        const articlesData = await articlesService.getArticles(undefined, numericId);
        setArticles(articlesData);
        await fetchAuthor(numericId);
      } else if (filterType === 'category') {
        console.log('Fetching articles for category:', numericId);
        const articlesData = await articlesService.getArticles(numericId, undefined);
        setArticles(articlesData);
        await fetchCategory(numericId);
      } else {
        // Add a hardcoded fallback to help troubleshoot
        if (numericId) {
          console.log('Attempting to fetch as category due to missing type parameter');
          const articlesData = await articlesService.getArticles(numericId, undefined);
          setArticles(articlesData);
          await fetchCategory(numericId);
        } else {
          throw new Error(`Invalid filter type: "${filterType}"`);
        }
      }
    } catch (err) {
      console.error('Error fetching filtered articles:', err);
      setError(`Failed to load articles: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [type, id, fetchAuthor, fetchCategory]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    fetchArticles();
  }, [fetchArticles]);

  // Article press handler - using the same approach as in index.tsx
  const handleArticlePress = useCallback(
    (article: Article) => {
      // Use the navigation with debounce for smoother transitions
      navigateTo(`/article/${article.id}`);
    },
    [navigateTo]
  );

  // Clear filter handler
  const handleClearFilter = useCallback(() => {
    router.back();
  }, []);

  // Load data on mount and when params change
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles, type, id]);

  // Show loading screen
  if (isLoading && !isRefreshing) {
    return <LoadingScreen />;
  }

  // Show error state
  if (error && !isRefreshing) {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          fetchArticles();
        }}
      />
    );
  }

  // Main component with simplified animation approach
  return (
    <Animated.View
      style={[styles.container, isInitialMount.current ? fadeInStyle : { opacity: 1 }]}
    >
      <FilteredArticleView
        articles={articles}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onArticlePress={handleArticlePress}
        selectedAuthor={type === 'author' ? author : null}
        selectedCategory={type === 'category' ? category : null}
        onClearFilter={handleClearFilter}
        isFirstRender={isInitialMount.current}
      />
    </Animated.View>
  );
}
