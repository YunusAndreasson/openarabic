import { useQuery } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { useGlobalSearchParams, router, Stack } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useCallback, useMemo, useEffect } from 'react';

import ErrorState from '@/components/ErrorState';
import FilteredArticleView from '@/components/home/FilteredArticleView';
import { LAYOUT } from '@/constants/layout';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useNavigationWithDebounce } from '@/hooks/navigation/useNavigationWithDebounce';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';
import { articlesService } from '@/services/articles';
import { authorsService } from '@/services/authors';
import { categoriesService } from '@/services/categories';
import type { Article } from '@/types/articles.types';
import { handleError } from '@/utils/errorHandling';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

// Custom Header Background component with blur effect (copied from tab layout)
const BLUR_INTENSITY = 55;
const CustomHeaderBackground = () => {
  const isDarkMode = useIsDarkMode();
  return (
    <BlurView
      intensity={BLUR_INTENSITY}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      tint={isDarkMode ? 'dark' : 'light'}
    />
  );
};

const HEADER_TITLE_STYLE = LAYOUT.HEADER.TITLE.SECONDARY;

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
          headerTitleStyle: { ...HEADER_TITLE_STYLE, color: colors.text },
          headerStyle: getHeaderStyle(colors.background),
          headerBackground: headerBackground,
          headerTransparent: true,
          headerTitleAlign: 'left',
          headerTintColor: colors.tint,
          headerBackTitle: 'Read',
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
  const { prefetchArticle } = useAppPreloader();
  const cacheKey = useMemo(() => ['filtered-articles', type, numericId], [type, numericId]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: author, isLoading: isAuthorLoading } = useQuery({
    queryKey: ['author', numericId],
    queryFn: async () => {
      try {
        const authors = await authorsService.getAuthors();
        return authors.find(a => a.id === numericId) ?? null;
      } catch (err) {
        handleError(err instanceof Error ? err : String(err));
        return null;
      }
    },
    staleTime: 86400000, // 24 hours - authors rarely change
    enabled: type === 'author' && !isNaN(numericId),
  });
  const { data: category } = useQuery({
    queryKey: ['category', numericId],
    queryFn: async () => {
      try {
        return await categoriesService.getCategory(numericId);
      } catch (err) {
        handleError(err instanceof Error ? err : String(err));
        return null;
      }
    },
    enabled: type === 'category' && !isNaN(numericId),
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

      try {
        if (type === 'author') {
          return await articlesService.getArticles({ authorId: numericId });
        } else if (type === 'category') {
          return await articlesService.getArticles({ categoryId: numericId });
        } else {
          throw new Error(`Invalid filter type: "${type}"`);
        }
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
      prefetchArticle(article.id);
      navigateTo({ pathname: '/(tabs)/read/article/[id]', params: { id: article.id } });
    },
    [navigateTo, prefetchArticle]
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
  if (error && !isRefreshing) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : 'Failed to load articles'}
        onRetry={refetch}
      />
    );
  }
  return (
    <FilteredArticleView
      articles={articles}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      selectedAuthor={type === 'author' ? author : null}
      selectedCategory={type === 'category' ? category : null}
      onArticlePress={handleArticlePress}
      onRefresh={handleRefresh}
    />
  );
}
