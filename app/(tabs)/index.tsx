import { createClient } from '@supabase/supabase-js';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BaseCard from '@/components/BaseCard';
import { LoadingScreen } from '@/components/Loader';
import PageHeader from '@/components/PageHeader';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArticleSection } from '@/components/article';
import ArticleList from '@/components/index/ArticleList';
import DailyPickSection from '@/components/index/DailyPickSection';
import FilterSection from '@/components/index/FilterSection';
import LatestTextsSection from '@/components/index/LatestTextsSection';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useLoadingState, useScreenFocusRefresh } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { setDailyPick } from '@/store/featuredContentSlice';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { fetchInProgressArticles } from '@/store/readingListSlice';
import type { Article } from '@/types/articles.types';
import {
  filterArticles,
  getLatestArticles,
  getBeginnerArticles,
  getDailyPickArticle,
} from '@/utils/articleUtils';
import { getDayOfYear, formatTimeAgo } from '@/utils/dateUtils';
import { mediumFeedback } from '@/utils/haptics';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

import ErrorState from '../../components/ErrorState';
import { useAppLoading } from '../_layout';

// Cache duration constants

// Create a supabase client for fetching authors directly
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Define styles before components that use them
const styles = StyleSheet.create({
  arrowText: {
    opacity: LAYOUT.OPACITY.DISABLED,
  },
  articleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  articleItemPadding: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  card: {
    overflow: 'hidden',
  },
  cardContent: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.MEDIUM,
  },
  container: {
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.SPACING.TINY,
  },
  listContentContainer: {
    flexGrow: 1,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.SPACING.MEDIUM,
  },
  metadataText: {
    marginTop: LAYOUT.SPACING.TINY / 2,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
  },
  textContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  titleText: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});

// Simple ArticleItem component for text-only cards
const ArticleItem = memo(
  ({ article, onPress }: { article: Article; onPress: (article: Article) => void }) => {
    const categoryName = article.category?.name
      ? capitalizeFirstLetter(article.category.name)
      : 'Uncategorized';

    const isDarkMode = useIsDarkMode();
    const timeAgoText = formatTimeAgo(article.created_at);

    return (
      <View style={[styles.articleContainer, styles.articleItemPadding]}>
        <BaseCard onPress={() => onPress(article)} style={styles.card}>
          <View style={styles.cardContent}>
            <View style={styles.textContent}>
              <ThemedText
                type="bodyBold"
                numberOfLines={2}
                colorName="text"
                weight="semibold"
                style={styles.titleText}
              >
                {article.title}
              </ThemedText>
              <ThemedText
                type="caption"
                colorName="textTertiary"
                numberOfLines={1}
                style={styles.metadataText}
              >
                {timeAgoText} · {categoryName} · by {article.author?.name || 'Anonymous'}
              </ThemedText>
            </View>
            <View style={styles.iconContainer}>
              <ThemedText
                type="label"
                colorName="textTertiary"
                variant={isDarkMode ? 'primary' : 'secondary'}
                style={styles.arrowText}
              >
                →
              </ThemedText>
            </View>
          </View>
        </BaseCard>
      </View>
    );
  }
);

ArticleItem.displayName = 'ArticleItem';

export default function ArticlesScreen(): JSX.Element {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { initialLoadComplete } = useAppLoading();

  useEffect(() => {
    dispatch(fetchInProgressArticles());
  }, [dispatch]);

  const { isLoading: isLoadingState } = useLoadingState();

  const {
    data: articlesData = [],
    isLoading: isArticlesLoading,
    isFetching: isArticlesFetching,
    error: articlesError,
  } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: 300000,
    gcTime: 600000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  useEffect(() => {
    router.setParams({
      animation: 'none',
    });
  }, []);

  const isInitialLoading = isArticlesLoading && articlesData.length === 0;

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: 1800000,
    gcTime: 3600000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: async () => {
      const { data } = await supabase.from('authors').select('*').order('name');
      return data || [];
    },
    staleTime: 1800000,
    gcTime: 3600000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { inProgressArticles = [], lastOpenedArticles = {} } = useAppSelectorMemo(
    state => state.readingList
  );

  const { dailyPick } = useAppSelectorMemo(state => state.featuredContent);

  const filteredArticles = useMemo(() => {
    return filterArticles(articlesData, null, null);
  }, [articlesData]);

  const beginnerArticles = useMemo(() => getBeginnerArticles(filteredArticles), [filteredArticles]);

  const sortedInProgressArticles = useMemo(() => {
    if (!inProgressArticles?.length) return [];

    return [...inProgressArticles]
      .sort((a, b) => {
        const aDate = lastOpenedArticles?.[a.id] || '';
        const bDate = lastOpenedArticles?.[b.id] || '';
        const aTime = aDate ? new Date(aDate).getTime() : 0;
        const bTime = bDate ? new Date(bDate).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 20);
  }, [inProgressArticles, lastOpenedArticles]);

  const isFetching = isArticlesFetching;

  const handleRefresh = useCallback(async () => {
    if (isFetching) return;

    mediumFeedback();
    setIsRefreshing(true);

    try {
      await queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return key === 'articles' || key === 'categories' || key === 'authors';
        },
      });
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  }, [queryClient, isFetching]);

  const handleArticlePress = useCallback((article: Article) => {
    router.push(`/article/${article.id}`);
  }, []);

  const handleSelectAuthor = useCallback((authorId: number) => {
    router.push(`/filter?type=author&id=${authorId}`);
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    router.push(`/filter?type=category&id=${categoryId}`);
  }, []);

  const isDataReady = useMemo(() => {
    return articlesData.length > 0 || (!isArticlesLoading && !!articlesError);
  }, [articlesData.length, isArticlesLoading, articlesError]);

  const { fadeInStyle } = useScreenAnimation(isDataReady, isLoadingState);

  useEffect(() => {
    if (articlesError || articlesData.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    if (dailyPick.date !== today) {
      const dailyPickArticle = getDailyPickArticle(articlesData, getDayOfYear());
      if (dailyPickArticle?.id && today) {
        dispatch(setDailyPick({ articleId: Number(dailyPickArticle.id), date: today }));
      }
    }
  }, [articlesData, articlesError, dailyPick.date, dispatch]);

  const DailyPick = useMemo(() => {
    if (articlesError || articlesData.length === 0) return null;

    let dailyPickArticle: Article | null = null;
    if (dailyPick.articleId !== null) {
      dailyPickArticle = articlesData.find(article => article.id === dailyPick.articleId) || null;
    }

    return dailyPickArticle ? (
      <DailyPickSection article={dailyPickArticle} onPress={handleArticlePress} showTitle={false} />
    ) : null;
  }, [articlesData, articlesError, handleArticlePress, dailyPick.articleId]);

  const ContinueReadingSection = useMemo(() => {
    if (sortedInProgressArticles.length === 0) return null;

    const mappedArticles = sortedInProgressArticles.map(inProgressArticle => {
      const fullArticle = articlesData.find(a => a.id === inProgressArticle.id);

      return {
        ...inProgressArticle,
        author: fullArticle?.author || null,
        content_hash: '',
        difficulty_level: 0,
        source: '',
        summary: '',
        category: fullArticle?.category || { id: 0, name: 'Uncategorized' },
        word_timings: [],
      };
    });

    return (
      <ArticleSection
        title="Continue Reading"
        articles={mappedArticles}
        onArticlePress={handleArticlePress}
        hideDifficulty={true}
        getLastOpenedAt={articleId => lastOpenedArticles?.[articleId]}
      />
    );
  }, [sortedInProgressArticles, lastOpenedArticles, handleArticlePress, articlesData]);

  const BeginnerFriendlySection = useMemo(() => {
    if (beginnerArticles.length === 0) return null;

    return (
      <ArticleSection
        title="Beginner Friendly"
        articles={beginnerArticles.slice(0, 20)}
        onArticlePress={handleArticlePress}
        hideDifficulty={true}
      />
    );
  }, [beginnerArticles, handleArticlePress]);

  const ListHeaderComponent = useMemo(() => {
    const orderedSections = [
      { id: 'daily-pick', component: DailyPick },
      { id: 'continue-reading', component: ContinueReadingSection },
      {
        id: 'latest-texts',
        component: (
          <LatestTextsSection
            articles={getLatestArticles(articlesData, 20)}
            onArticlePress={handleArticlePress}
          />
        ),
      },
      { id: 'beginner-friendly', component: BeginnerFriendlySection },
      {
        id: 'author-filter',
        component: <FilterSection title="Authors" items={authors} onSelect={handleSelectAuthor} />,
      },
      {
        id: 'category-filter',
        component: (
          <FilterSection
            title="Categories"
            items={categoriesData}
            onSelect={handleSelectCategory}
          />
        ),
      },
    ];

    return (
      <>
        {orderedSections
          .filter(section => section.component !== null)
          .map(section => (
            <React.Fragment key={section.id}>{section.component}</React.Fragment>
          ))}
      </>
    );
  }, [
    DailyPick,
    ContinueReadingSection,
    BeginnerFriendlySection,
    articlesData,
    authors,
    categoriesData,
    handleArticlePress,
    handleSelectAuthor,
    handleSelectCategory,
  ]);

  const EmptyStateComponent = useMemo(() => null, []);

  const articlesQuery = queryClient.getQueryState(['articles']);
  const isDataCached = articlesQuery?.data !== undefined;

  useScreenFocusRefresh(queryClient, 'articles', undefined, 300000, true, false);
  useScreenFocusRefresh(queryClient, 'categories', undefined, 600000, true, false);

  const getContentContainerStyle = (colors: { background: string }, insets: { top: number }) => ({
    ...styles.listContentContainer,
    backgroundColor: colors.background,
    paddingTop: getHeaderHeight(insets),
  });

  if (isInitialLoading && initialLoadComplete) {
    return <LoadingScreen />;
  }

  if (articlesError && !isRefreshing && !isDataCached) {
    return (
      <ErrorState
        message={articlesError.message}
        onRetry={() => {
          handleRefresh();
        }}
      />
    );
  }

  return (
    <Animated.View
      style={[styles.container, fadeInStyle]}
      entering={FadeIn.duration(300).springify().damping(14).stiffness(100)}
    >
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
        accessibilityLabel="Articles browse screen"
        accessibilityRole="scrollbar"
      >
        <ArticleList
          articles={[]}
          isLoading={isArticlesLoading}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          onArticlePress={handleArticlePress}
          ListHeaderComponent={isArticlesLoading && !isDataCached ? null : ListHeaderComponent}
          ListEmptyComponent={EmptyStateComponent}
          contentContainerStyle={getContentContainerStyle(colors, insets)}
          hideMainList={isArticlesLoading && !isDataCached}
          hideWhileRefreshing={false}
        />
        <PageHeader title="Texts" />
      </ThemedView>
    </Animated.View>
  );
}
