import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useGlobalSearchParams, router, Stack } from 'expo-router';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import FilteredArticleView from '../components/index/FilteredArticleView';
import { LoadingScreen } from '../components/Loader';
import ErrorState from '../components/ErrorState';
import { articlesService } from '../services/articles';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants/Supabase';
import { useScreenAnimation } from '@/hooks/animations';
import { useNavigationWithDebounce } from '../hooks/useNavigationWithDebounce';
import { Article } from '../types/articles.types';

// Create a supabase client for fetching data directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  visible: {
    opacity: 1,
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
  const numericId = parseInt(id as string, 10);

  // For caching purposes
  const queryClient = useQueryClient();
  const cacheKey = useMemo(() => ['filtered-articles', type, numericId], [type, numericId]);

  // Track whether this is the first mount of the component
  const isInitialMount = useRef(true);

  // Track if we're coming back from another screen
  const isReturningFromArticle = useRef(false);

  // Use this to track when the screen is actively focused vs. in background
  const isFocused = useRef(false);

  // Use focus effect to detect when screen is focused after visiting an article
  useFocusEffect(
    useCallback(() => {
      // This screen is now focused
      isFocused.current = true;

      // If this is not the initial mount and we're returning to this screen,
      // we should disable animations to prevent flickering
      if (!isInitialMount.current) {
        isReturningFromArticle.current = true;
      }

      // Cleanup function when screen loses focus (going to article)
      return () => {
        // Screen lost focus
        isFocused.current = false;

        // Not the initial mount anymore after first navigation
        isInitialMount.current = false;
      };
    }, [])
  );

  // State
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use React Query for author data with caching
  const { data: author, isLoading: isAuthorLoading } = useQuery({
    queryKey: ['author', numericId],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('authors').select('*').eq('id', numericId).single();
        return data;
      } catch (err) {
        return null;
      }
    },
    staleTime: 0, // No caching
    enabled: type === 'author' && !isNaN(numericId), // Only run when type is author
  });

  // Use React Query for category data with caching
  const { data: category, isLoading: isCategoryLoading } = useQuery({
    queryKey: ['category', numericId],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('categories').select('*').eq('id', numericId).single();
        return data ?? null;
      } catch (err) {
        return null;
      }
    },
    enabled: type === 'category' || type !== 'author', // Run for categories or when not specified
  });

  // Use React Query to fetch articles with caching
  const {
    data: articles = [],
    isLoading: isArticlesLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: cacheKey,
    queryFn: async () => {
      if (!numericId || isNaN(numericId)) {
        throw new Error(`Invalid ID provided: ${id}`);
      }

      // Fetch articles based on filter type
      let articlesData: Article[] = [];
      try {
        if (type === 'author') {
          articlesData = (await articlesService.getArticles(undefined, numericId)) ?? [];
        } else if (type === 'category') {
          articlesData = (await articlesService.getArticles(numericId, undefined)) ?? [];
        } else {
          // Fallback
          if (numericId) {
            articlesData = (await articlesService.getArticles(numericId, undefined)) ?? [];
          } else {
            throw new Error(`Invalid filter type: "${type}"`);
          }
        }
        return articlesData;
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to fetch articles');
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true, // Always refetch
  });

  // Overall loading state combines all loading states
  const isLoading =
    isArticlesLoading ||
    (type === 'author' && isAuthorLoading) ||
    (type === 'category' && isCategoryLoading);

  // Determine if data is ready for animations
  const isDataReady = useMemo(() => {
    return articles?.length > 0 || error !== null;
  }, [articles, error]);

  // Use the screen animation hook with a shorter duration for returning from article
  const { fadeInStyle } = useScreenAnimation(
    isDataReady,
    isLoading,
    // Disable animations when returning from an article
    isReturningFromArticle.current ? 0 : 80
  );

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Refresh handler
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetch().finally(() => setIsRefreshing(false));
  }, [refetch]);

  // Article press handler - using the same approach as in index.tsx
  const handleArticlePress = useCallback(
    (article: Article) => {
      // Prefetch article data for smoother transitions
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
      });

      // Use the navigation with debounce for smoother transitions
      navigateTo(`/article/${article.id}`);
    },
    [navigateTo, queryClient]
  );

  // Clear filter handler
  const handleClearFilter = useCallback(() => {
    router.back();
  }, []);

  // Show loading screen only on initial load, not when refreshing
  if (isLoading && !isRefreshing && isInitialMount.current) {
    return <LoadingScreen />;
  }

  // Show error state
  if (error && !isRefreshing) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load articles'}
        onRetry={() => {
          refetch();
        }}
      />
    );
  }

  // Main component with improved animation handling
  return (
    <Animated.View
      style={[
        styles.container,
        // Only animate on initial mount, not when returning from article
        isInitialMount.current && !isReturningFromArticle.current ? fadeInStyle : styles.visible,
      ]}
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
      />
    </Animated.View>
  );
}
