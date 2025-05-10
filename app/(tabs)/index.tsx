import { useHeaderHeight } from '@react-navigation/elements';
import { createClient } from '@supabase/supabase-js';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useEffect, useState, useCallback, useMemo, memo, JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@/components/BaseCard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ArticleSection } from '@/components/article';
import ArticleList from '@/components/index/ArticleList';
import DailyPickSection from '@/components/index/DailyPickSection';
import FilterSection from '@/components/index/FilterSection';
import LatestTextsSection from '@/components/index/LatestTextsSection';
import StrugglingWordsSection from '@/components/index/StrugglingWordsSection';
import { DueWordsArticleSection } from '@/components/home/DueWordsArticleSection';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/Supabase';
import { LAYOUT } from '@/constants/layout';
import { useScreenFocusRefresh } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { useStrugglingWords } from '@/hooks/useStrugglingWords';
import { useArticlesByDueWords } from '@/hooks/useArticlesByDueWords';
import { articlesService } from '@/services/articles';
import { categoriesService } from '@/services/categories';
import { setDailyPick } from '@/store/featuredContentSlice';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { updateLastOpenedArticle } from '@/store/readingListSlice';
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
    );
  }
);

ArticleItem.displayName = 'ArticleItem';

export default function ArticlesScreen(): JSX.Element {
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { initialLoadComplete } = useAppLoading();
  const { user } = useAuth();

  const { hasEnoughArticles = false, dueWordRootIds = new Set() } = useArticlesByDueWords(
    user?.id,
    10
  );

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

  const { words: strugglingWords, isLoading: isStrugglingWordsLoading } = useStrugglingWords({
    userId: user?.id,
    limit: 10,
    enabled: !!user?.id,
  });

  useEffect(() => {
    router.setParams({
      animation: 'none',
    });
  }, []);

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

  const { lastOpenedArticles = {} } = useAppSelectorMemo(state => state.readingList);

  const { dailyPick } = useAppSelectorMemo(state => state.featuredContent);

  const filteredArticles = useMemo(() => {
    return filterArticles(articlesData, null, null);
  }, [articlesData]);

  const beginnerArticles = useMemo(() => getBeginnerArticles(filteredArticles), [filteredArticles]);

  const continueReadingArticles = useMemo(() => {
    const sortedIds = Object.entries(lastOpenedArticles)
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .map(([id]) => Number(id));
    const articles = sortedIds
      .map(id => articlesData.find(a => a.id === id))
      .filter(Boolean) as Article[];
    return articles.slice(0, 5);
  }, [lastOpenedArticles, articlesData]);

  const isFetching = isArticlesFetching;

  const handleRefresh = useCallback(async () => {
    if (isFetching) return;

    mediumFeedback();
    setIsRefreshing(true);

    try {
      await queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return (
            key === 'articles' ||
            key === 'categories' ||
            key === 'authors' ||
            key === 'struggling-words'
          );
        },
      });
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 300);
    }
  }, [queryClient, isFetching]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      dispatch(updateLastOpenedArticle(article.id));
      router.push(`/article/${article.id}`);
    },
    [dispatch]
  );

  const handleSelectAuthor = useCallback((authorId: number) => {
    router.push(`/filter?type=author&id=${authorId}`);
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    router.push(`/filter?type=category&id=${categoryId}`);
  }, []);

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
    if (continueReadingArticles.length === 0) return null;
    return (
      <ArticleSection
        title="Continue Reading"
        articles={continueReadingArticles}
        onArticlePress={handleArticlePress}
        hideDifficulty={true}
        getLastOpenedAt={articleId => lastOpenedArticles?.[articleId]}
      />
    );
  }, [continueReadingArticles, lastOpenedArticles, handleArticlePress]);

  const StrugglingWordsComponent = useMemo(() => {
    if (!user?.id) return null;

    return <StrugglingWordsSection words={strugglingWords} isLoading={isStrugglingWordsLoading} />;
  }, [strugglingWords, isStrugglingWordsLoading, user?.id]);

  const BeginnerFriendlySection = useMemo(() => {
    if (beginnerArticles.length === 0) return null;

    return (
      <ArticleSection
        title="Beginner Friendly"
        articles={beginnerArticles.slice(0, 10)}
        onArticlePress={handleArticlePress}
        hideDifficulty={true}
      />
    );
  }, [beginnerArticles, handleArticlePress]);

  // Add Due Words Section Component
  const DueWordsSection = useMemo(() => {
    // Only show if user is logged in
    if (!user?.id) return null;

    return (
      <DueWordsArticleSection
        userId={user.id}
        onArticlePress={handleArticlePress}
        limit={10}
        dueWordRootIds={dueWordRootIds}
      />
    );
  }, [user?.id, handleArticlePress, dueWordRootIds]);

  const latestArticlesForSection = useMemo(
    () => getLatestArticles(articlesData, 7),
    [articlesData]
  );

  const authorsWithArticles = useMemo(() => {
    return authors.filter(author => articlesData.some(article => article.author?.id === author.id));
  }, [authors, articlesData]);

  const categoriesWithArticles = useMemo(() => {
    return categoriesData.filter(category =>
      articlesData.some(article => article.category?.id === category.id)
    );
  }, [categoriesData, articlesData]);

  const latestTextsSectionComponent = useMemo(
    () =>
      latestArticlesForSection.length > 0 ? (
        <LatestTextsSection
          articles={latestArticlesForSection}
          onArticlePress={handleArticlePress}
        />
      ) : null,
    [latestArticlesForSection, handleArticlePress]
  );

  const authorFilterComponent = useMemo(
    () =>
      authorsWithArticles.length > 0 ? (
        <FilterSection title="Authors" items={authorsWithArticles} onSelect={handleSelectAuthor} />
      ) : null,
    [authorsWithArticles, handleSelectAuthor]
  );

  const categoryFilterComponent = useMemo(
    () =>
      categoriesWithArticles.length > 0 ? (
        <FilterSection
          title="Categories"
          items={categoriesWithArticles}
          onSelect={handleSelectCategory}
        />
      ) : null,
    [categoriesWithArticles, handleSelectCategory]
  );

  const ListHeaderComponent = useMemo(() => {
    const orderedSections = [
      { id: 'daily-pick', component: DailyPick },
      { id: 'struggling-words', component: StrugglingWordsComponent },
      // Conditionally show either DueWordsSection or BeginnerFriendlySection
      {
        id: 'learning-section',
        component: hasEnoughArticles ? DueWordsSection : BeginnerFriendlySection,
      },
      { id: 'latest-texts', component: latestTextsSectionComponent },
      { id: 'continue-reading', component: ContinueReadingSection },
      { id: 'author-filter', component: authorFilterComponent },
      { id: 'category-filter', component: categoryFilterComponent },
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
    hasEnoughArticles,
    DailyPick,
    StrugglingWordsComponent,
    DueWordsSection,
    BeginnerFriendlySection,
    latestTextsSectionComponent,
    ContinueReadingSection,
    authorFilterComponent,
    categoryFilterComponent,
  ]);

  const EmptyStateComponent = useMemo(() => null, []);

  const articlesQuery = queryClient.getQueryState(['articles']);
  const isDataCached = articlesQuery?.data !== undefined;

  useScreenFocusRefresh(queryClient, 'articles', undefined, 300000, true, false);
  useScreenFocusRefresh(queryClient, 'categories', undefined, 600000, true, false);

  const getContentContainerStyle = (colors: { background: string }) => ({
    ...styles.listContentContainer,
    backgroundColor: colors.background,
    paddingTop: headerHeight,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  });

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
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
    >
      <ArticleList
        articles={[]}
        isLoading={isArticlesLoading}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onArticlePress={handleArticlePress}
        ListHeaderComponent={isArticlesLoading && !isDataCached ? null : ListHeaderComponent}
        ListEmptyComponent={EmptyStateComponent}
        contentContainerStyle={getContentContainerStyle(colors)}
        hideMainList={isArticlesLoading && !isDataCached}
        hideWhileRefreshing={false}
      />
    </ThemedView>
  );
}
