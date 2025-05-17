import { useQueryClient, useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { useGlobalSearchParams, router, Stack } from 'expo-router';
import React, { useState, useCallback, useMemo, useEffect, JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import ErrorState from '../components/ErrorState';
import FilteredArticleView from '../components/index/FilteredArticleView';
import { supabase } from '../services/supabase';
import { useNavigationWithDebounce } from '../hooks/useNavigationWithDebounce';
import { articlesService } from '../services/articles';
import type { Article } from '../types/articles.types';

// Define styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  visible: {
    opacity: 1,
  },
});

// Custom Header Background component with blur effect (copied from tab layout)
const BLUR_INTENSITY = 55;
const CustomHeaderBackground = () => {
  const isDarkMode = useIsDarkMode();
  return (
    <BlurView
      tint={isDarkMode ? 'dark' : 'light'}
      intensity={BLUR_INTENSITY}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    />
  );
};

const HEADER_TITLE_STYLE = {
  fontSize: 22,
  fontWeight: '600' as const,
  paddingLeft: 8,
};

const getHeaderStyle = (backgroundColor: string) => ({
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 0,
  backgroundColor,
});

export default function FilterScreen(): JSX.Element {
  const params = useGlobalSearchParams();
  const colors = useColors();
  const headerTitle = (params.headerTitle as string | undefined) || '';
  const headerBackground = useCallback(() => <CustomHeaderBackground />, []);
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle,
          headerTitleStyle: HEADER_TITLE_STYLE,
          headerStyle: getHeaderStyle(colors.background),
          headerBackground: headerBackground,
          headerTransparent: true,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Texts',
        }}
      />
      <FilterScreenContent />
    </>
  );
}

function FilterScreenContent() {
  const params = useGlobalSearchParams();
  const type = params.type as string;
  const id = params.id as string;
  const numericId = parseInt(id, 10);
  const queryClient = useQueryClient();
  const cacheKey = useMemo(() => ['filtered-articles', type, numericId], [type, numericId]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: author, isLoading: isAuthorLoading } = useQuery({
    queryKey: ['author', numericId],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('authors').select('*').eq('id', numericId).single();
        return data;
      } catch (err) {
        handleError(err instanceof Error ? err : String(err));
        return null;
      }
    },
    staleTime: 0,
    enabled: type === 'author' && !isNaN(numericId),
  });
  const { data: category } = useQuery({
    queryKey: ['category', numericId],
    queryFn: async () => {
      try {
        const { data } = await supabase.from('categories').select('*').eq('id', numericId).single();
        return data ?? null;
      } catch (err) {
        handleError(err instanceof Error ? err : String(err));
        return null;
      }
    },
    enabled: type === 'category' || type !== 'author',
  });
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
      let articlesData: Article[] = [];
      try {
        if (type === 'author') {
          articlesData = (await articlesService.getArticles(undefined, numericId)) ?? [];
        } else if (type === 'category') {
          articlesData = (await articlesService.getArticles(numericId, undefined)) ?? [];
        } else {
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
    refetchOnMount: true,
  });
  const isLoading = type === 'author' && (isArticlesLoading || isAuthorLoading);
  const { navigateTo } = useNavigationWithDebounce();
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetch().finally(() => setIsRefreshing(false));
  }, [refetch]);
  const handleArticlePress = useCallback(
    (article: Article) => {
      queryClient.prefetchQuery({
        queryKey: ['article', article.id],
        queryFn: () => articlesService.getArticleById(article.id),
        retry: 3,
      });
      navigateTo({ pathname: '/article/[id]', params: { id: article.id } });
    },
    [navigateTo, queryClient]
  );
  useEffect(() => {
    let title = 'Filtered';
    if (type === 'author' && author?.name) {
      title = author.name;
    } else if (type === 'category' && category?.name) {
      title = capitalizeFirstLetter(category.name);
    } else if (type === 'author') {
      title = 'Author';
    } else if (type === 'category') {
      title = 'Category';
    }
    router.setParams({ headerTitle: title });
  }, [type, author?.name, category?.name]);
  if (error && !isRefreshing && type !== 'category') {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load articles'}
        onRetry={refetch}
      />
    );
  }
  return (
    <View style={[styles.container, styles.visible]}>
      <FilteredArticleView
        articles={articles}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onArticlePress={handleArticlePress}
        selectedAuthor={type === 'author' ? author : null}
        selectedCategory={type === 'category' ? category : null}
      />
    </View>
  );
}
