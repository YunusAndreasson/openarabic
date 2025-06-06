import { useHeaderHeight } from '@react-navigation/elements';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import { ArticleSection } from '@/components/article';
import ArticleList from '@/components/index/ArticleList';
import { DifficultWordsArticleSection } from '@/components/index/DifficultWordsArticleSection';
import { DueWordsArticleSection } from '@/components/index/DueWordsArticleSection';
import FeaturedSection from '@/components/index/FeaturedSection';
import FilterSection from '@/components/index/FilterSection';
import LatestTextsSection from '@/components/index/LatestTextsSection';
import { LongReadsSection } from '@/components/index/LongReadsSection';
import StrugglingWordsSection from '@/components/index/StrugglingWordsSection';
import { WelcomeMessage } from '@/components/index/WelcomeMessage';
import { LAYOUT } from '@/constants/layout';
import { useScreenFocusRefresh } from '@/hooks';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useArticlesByDifficultWords } from '@/hooks/useArticlesByDifficultWords';
import { useArticlesByDueWords } from '@/hooks/useArticlesByDueWords';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useStrugglingWords } from '@/hooks/useStrugglingWords';
import { articlesService } from '@/services/articles';
import { authorsService } from '@/services/authors';
import { categoriesService } from '@/services/categories';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { setDailyPick, clearDailyPick } from '@/store/featuredContentSlice';
import { useAppSelectorMemo, useAppDispatch } from '@/store/hooks';
import { updateLastOpenedArticle } from '@/store/readingListSlice';
import type { Article } from '@/types/articles.types';
import {
  filterArticles,
  getLatestArticles,
  getBeginnerArticles,
  getDailyPickArticle,
  getFreshDailyPickArticle,
} from '@/utils/articleUtils';
import { getDayOfYear } from '@/utils/dateUtils';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

import ErrorState from '../../components/ErrorState';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

function useContentSections(articlesData: Article[], user: any) {
  const { hasEnoughArticles = false, dueWordRootIds = new Set() } = useArticlesByDueWords(
    user?.id,
    10
  );

  const {
    hasEnoughArticles: hasEnoughDifficultArticles = false,
    difficultWordRootIds = new Set(),
  } = useArticlesByDifficultWords(user?.id, 10);

  const { words: strugglingWords, isLoading: isStrugglingWordsLoading } = useStrugglingWords({
    userId: user?.id,
    limit: 10,
    enabled: !!user?.id,
  });

  const { data: allStudyWords = [] } = useQuery({
    queryKey: FSRS_QUERY_KEYS.all(user?.id || ''),
    queryFn: () => {
      if (!user?.id) return Promise.resolve([]);
      return studyWordsFSRSService.getFSRSWords(user.id, {
        forStats: true,
        limit: 1,
      });
    },
    enabled: !!user?.id,
    staleTime: 180000,
    gcTime: 600000,
  });

  const hasAnyStudyWords = allStudyWords.length > 0;

  const primarySections = useMemo(() => {
    const sections = [];

    sections.push({ type: 'featured', priority: 1 });

    if (hasEnoughArticles) {
      sections.push({ type: 'due-words', priority: 2 });
    } else if (hasEnoughDifficultArticles && hasAnyStudyWords) {
      sections.push({ type: 'difficult-words', priority: 2 });
    } else if (!hasAnyStudyWords) {
      sections.push({ type: 'beginner', priority: 2 });
    }

    if (user?.id && strugglingWords.length > 0) {
      sections.push({ type: 'struggling-words', priority: 3 });
    }

    return sections;
  }, [hasEnoughArticles, hasEnoughDifficultArticles, hasAnyStudyWords, user?.id, strugglingWords]);

  const secondarySections = useMemo(() => {
    return [
      { type: 'continue-reading', priority: 4 },
      { type: 'latest-texts', priority: 5 },
      { type: 'long-reads', priority: 6 },
    ];
  }, []);

  const discoverySections = useMemo(() => {
    return [
      { type: 'authors', priority: 7 },
      { type: 'categories', priority: 8 },
    ];
  }, []);

  return {
    primarySections,
    secondarySections,
    discoverySections,
    dueWordRootIds,
    difficultWordRootIds,
    strugglingWords,
    isStrugglingWordsLoading,
  };
}

export default function ArticlesScreen(): JSX.Element {
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prefetchArticle } = useAppPreloader();

  const {
    data: articlesData = [],
    isLoading: isArticlesLoading,
    error: articlesError,
  } = useQuery({
    queryKey: ['articles'],
    queryFn: () => articlesService.getArticles(),
    staleTime: 3600000,
    gcTime: 7200000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  const {
    primarySections,
    secondarySections,
    discoverySections,
    dueWordRootIds,
    difficultWordRootIds,
    strugglingWords,
    isStrugglingWordsLoading,
  } = useContentSections(articlesData, user);

  useEffect(() => {
    router.setParams({
      animation: 'none',
    });
  }, []);

  const { data: categoriesData = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesService.getCategories(),
    staleTime: 86400000,
    gcTime: 172800000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: authors = [] } = useQuery({
    queryKey: ['authors'],
    queryFn: () => authorsService.getAuthors(),
    staleTime: 86400000,
    gcTime: 172800000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);

  const { lastOpenedArticles = {} } = useAppSelectorMemo(state => state.readingList);
  const { dailyPick: featured } = useAppSelectorMemo(state => state.featuredContent);

  const derivedData = useMemo(() => {
    const filteredArticles = filterArticles(articlesData, null, null);
    const beginnerArticles = getBeginnerArticles(filteredArticles);

    const articleMap = new Map<number, Article>();
    articlesData.forEach(article => {
      articleMap.set(article.id, article);
    });

    const continueReadingArticles = Object.entries(lastOpenedArticles)
      .sort((a, b) => new Date(b[1]).getTime() - new Date(a[1]).getTime())
      .map(([id]) => Number(id))
      .map(id => articleMap.get(id))
      .filter(Boolean)
      .slice(0, 5) as Article[];

    const latestArticlesForSection = getLatestArticles(articlesData, 5, true);

    const authorIdsWithArticles = new Map<number, number>();
    const categoryIdsWithArticles = new Map<number, number>();

    articlesData.forEach(article => {
      if (article.author?.id) {
        authorIdsWithArticles.set(
          article.author.id,
          (authorIdsWithArticles.get(article.author.id) || 0) + 1
        );
      }
      if (article.category?.id) {
        categoryIdsWithArticles.set(
          article.category.id,
          (categoryIdsWithArticles.get(article.category.id) || 0) + 1
        );
      }
    });

    const authorsWithArticles = authors
      .filter(author => authorIdsWithArticles.has(author.id))
      .map(author => ({
        ...author,
        count: authorIdsWithArticles.get(author.id) || 0,
      }));

    const categoriesWithArticles = categoriesData
      .filter(category => categoryIdsWithArticles.has(category.id))
      .map(category => ({
        ...category,
        count: categoryIdsWithArticles.get(category.id) || 0,
      }));

    return {
      beginnerArticles,
      continueReadingArticles,
      latestArticlesForSection,
      authorsWithArticles,
      categoriesWithArticles,
    };
  }, [articlesData, lastOpenedArticles, authors, categoriesData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      dispatch(clearDailyPick());

      const queriesToInvalidate: (string | readonly string[])[] = [['articles'], ['categories']];

      if (user?.id) {
        queriesToInvalidate.push(
          ['readingList', user.id],
          FSRS_QUERY_KEYS.due(user.id),
          FSRS_QUERY_KEYS.all(user.id),
          ['struggling-words', user.id]
        );
      }

      await Promise.all(
        queriesToInvalidate.map(queryKey =>
          queryClient.invalidateQueries({
            queryKey: Array.isArray(queryKey) ? [...queryKey] : [queryKey],
          })
        )
      );

      setTimeout(() => {
        if (articlesData.length > 0) {
          const freshFeaturedArticle = getFreshDailyPickArticle(articlesData);
          if (freshFeaturedArticle?.id) {
            const today = new Date().toISOString().split('T')[0] || '';
            dispatch(setDailyPick({ articleId: Number(freshFeaturedArticle.id), date: today }));
          }
        }
      }, 100);
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Refresh failed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id, dispatch, articlesData]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      dispatch(updateLastOpenedArticle(article.id));
      prefetchArticle(article.id);
      router.push(`/article/${article.id}`);
    },
    [dispatch, prefetchArticle]
  );

  const handleSelectAuthor = useCallback((authorId: number) => {
    router.push(`/filter?type=author&id=${authorId}`);
  }, []);

  const handleSelectCategory = useCallback((categoryId: number) => {
    router.push(`/filter?type=category&id=${categoryId}`);
  }, []);

  useEffect(() => {
    if (articlesError || articlesData.length === 0) return;

    const today = new Date().toISOString().split('T')[0] || '';
    if (featured.date !== today) {
      const featuredArticle = getDailyPickArticle(articlesData, getDayOfYear());
      if (featuredArticle?.id) {
        if (today) {
          dispatch(setDailyPick({ articleId: Number(featuredArticle.id), date: today }));
        }
      }
    }
  }, [articlesData, articlesError, featured.date, dispatch]);

  const renderSection = useCallback(
    (sectionType: string) => {
      switch (sectionType) {
        case 'featured': {
          const featuredArticle =
            featured.articleId !== null
              ? articlesData.find(article => article.id === featured.articleId)
              : null;
          return featuredArticle ? (
            <FeaturedSection
              key="featured"
              article={featuredArticle}
              showTitle={true}
              onPress={handleArticlePress}
            />
          ) : null;
        }

        case 'struggling-words':
          return user?.id ? (
            <StrugglingWordsSection
              key="struggling-words"
              isLoading={isStrugglingWordsLoading}
              words={strugglingWords}
            />
          ) : null;

        case 'due-words':
          return user?.id ? (
            <DueWordsArticleSection
              key="due-words"
              dueWordRootIds={dueWordRootIds}
              limit={10}
              userId={user.id}
              onArticlePress={handleArticlePress}
            />
          ) : null;

        case 'difficult-words':
          return user?.id ? (
            <DifficultWordsArticleSection
              key="difficult-words"
              difficultWordRootIds={difficultWordRootIds}
              limit={10}
              userId={user.id}
              onArticlePress={handleArticlePress}
            />
          ) : null;

        case 'beginner':
          return derivedData.beginnerArticles.length > 0 ? (
            <ArticleSection
              key="beginner"
              articles={derivedData.beginnerArticles.slice(0, 10)}
              hideDifficulty={true}
              title="Get Started"
              onArticlePress={handleArticlePress}
            />
          ) : null;

        case 'continue-reading':
          return derivedData.continueReadingArticles.length > 0 ? (
            <ArticleSection
              key="continue-reading"
              articles={derivedData.continueReadingArticles}
              getLastOpenedAt={articleId => lastOpenedArticles?.[articleId]}
              hideDifficulty={true}
              title="Continue Reading"
              onArticlePress={handleArticlePress}
            />
          ) : null;

        case 'latest-texts':
          return derivedData.latestArticlesForSection.length > 0 ? (
            <LatestTextsSection
              key="latest-texts"
              articles={derivedData.latestArticlesForSection}
              onArticlePress={handleArticlePress}
            />
          ) : null;

        case 'long-reads':
          return (
            <LongReadsSection
              key="long-reads"
              articles={articlesData}
              limit={10}
              minReadingTime={1}
              onArticlePress={handleArticlePress}
            />
          );

        case 'authors':
          return derivedData.authorsWithArticles.length > 0 ? (
            <FilterSection
              key="authors"
              items={derivedData.authorsWithArticles}
              title="Authors"
              onSelect={handleSelectAuthor}
            />
          ) : null;

        case 'categories':
          return derivedData.categoriesWithArticles.length > 0 ? (
            <FilterSection
              key="categories"
              items={derivedData.categoriesWithArticles}
              title="Categories"
              onSelect={handleSelectCategory}
            />
          ) : null;

        default:
          return null;
      }
    },
    [
      articlesData,
      featured,
      handleArticlePress,
      user?.id,
      strugglingWords,
      isStrugglingWordsLoading,
      dueWordRootIds,
      difficultWordRootIds,
      derivedData,
      lastOpenedArticles,
      handleSelectAuthor,
      handleSelectCategory,
    ]
  );

  const ListHeaderComponent = useMemo(() => {
    const allSections = [...primarySections, ...secondarySections, ...discoverySections];

    return (
      <>
        {allSections
          .sort((a, b) => a.priority - b.priority)
          .map(section => renderSection(section.type))
          .filter(Boolean)}
      </>
    );
  }, [primarySections, secondarySections, discoverySections, renderSection]);

  const ListFooterComponent = useMemo(() => {
    return <WelcomeMessage />;
  }, []);

  const articlesQuery = queryClient.getQueryState(['articles']);
  const isDataCached = articlesQuery?.data !== undefined;

  useScreenFocusRefresh(queryClient, 'articles', undefined, 300000, true, false);
  useScreenFocusRefresh(queryClient, 'categories', undefined, 600000, true, false);

  const contentContainerStyle = useMemo(
    () => ({
      ...styles.listContentContainer,
      backgroundColor: colors.background,
      paddingTop: headerHeight,
      paddingBottom:
        insets.bottom +
        LAYOUT.CONTENT_SPACING.BOTTOM +
        LAYOUT.BOTTOM_BAR.HEIGHT +
        LAYOUT.SPACING.MEDIUM,
    }),
    [colors.background, headerHeight, insets.bottom]
  );

  if (articlesError && !isRefreshing && !isDataCached) {
    return (
      <ErrorState
        message={
          articlesError instanceof Error ? articlesError.message : 'An unexpected error occurred'
        }
        onRetry={() => {
          handleRefresh();
        }}
      />
    );
  }

  return (
    <ThemedView
      accessibilityLabel="Articles screen"
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ArticleList
        articles={[]}
        contentContainerStyle={contentContainerStyle}
        hideMainList={isArticlesLoading && !isDataCached}
        hideWhileRefreshing={false}
        isLoading={isArticlesLoading}
        isRefreshing={isRefreshing}
        ListEmptyComponent={null}
        ListFooterComponent={isArticlesLoading && !isDataCached ? null : ListFooterComponent}
        ListHeaderComponent={isArticlesLoading && !isDataCached ? null : ListHeaderComponent}
        progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
        onArticlePress={handleArticlePress}
        onRefresh={handleRefresh}
      />
    </ThemedView>
  );
}

export function useArticlesAndDueWordsLoaded() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const articlesQueryState = queryClient.getQueryState(['articles']);
  const articlesLoaded =
    articlesQueryState?.status === 'success' || articlesQueryState?.status === 'error';

  const { isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 10);

  return useMemo(() => {
    if (!user?.id) return articlesLoaded;
    return articlesLoaded && !isDueWordsLoading;
  }, [articlesLoaded, isDueWordsLoading, user?.id]);
}
