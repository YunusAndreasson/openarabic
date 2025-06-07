// Move content from the existing index.tsx file here

import { useHeaderHeight } from '@react-navigation/elements';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import ArticleList from '@/components/home/ArticleList';
import FeaturedSection from '@/components/home/FeaturedSection';
import FilterSection from '@/components/home/FilterSection';
import SectionDivider from '@/components/home/SectionDivider';
import { WelcomeMessage } from '@/components/home/WelcomeMessage';
import { LAYOUT } from '@/constants/layout';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useArticlesByDifficultWords } from '@/hooks/articles/useArticlesByDifficultWords';
import { useArticlesByDueWords } from '@/hooks/articles/useArticlesByDueWords';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { articlesService } from '@/services/articles';
import { authorsService } from '@/services/authors';
import { categoriesService } from '@/services/categories';
import { studyWordsFSRSService, FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { useAppDispatch } from '@/store/hooks';
import { updateLastOpenedArticle } from '@/store/readingListSlice';
import type { Article } from '@/types/articles.types';
import { filterArticles, getBeginnerArticles } from '@/utils/articleUtils';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback } from '@/utils/haptics';

import ErrorState from '../../../components/ErrorState';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});

interface IntelligentArticleResult {
  article: Article | null;
  reason: string;
  type: 'due-words' | 'difficult-words' | 'beginner' | 'random';
}

function useIntelligentArticleSelection(
  user: any,
  articlesData: Article[]
): IntelligentArticleResult & { dueWordRootIds: Set<number> } {
  const { hasEnoughArticles: hasDueWordArticles, dueWordRootIds } = useArticlesByDueWords(
    user?.id,
    10
  );

  const { hasEnoughArticles: hasDifficultWordArticles, difficultWordRootIds } =
    useArticlesByDifficultWords(user?.id, 10);

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

  return useMemo(() => {
    if (!articlesData.length) {
      return {
        article: null,
        reason: 'Loading articles...',
        type: 'random',
        dueWordRootIds: new Set<number>(),
      };
    }

    // Strategy 1: If user has due words and enough articles with those words
    if (user?.id && hasDueWordArticles && dueWordRootIds.size > 0) {
      const dueWordArticles = articlesData.filter(article =>
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: any) => dueWordRootIds.has(word.root_id))
        )
      );

      if (dueWordArticles.length > 0) {
        const randomArticle =
          dueWordArticles[Math.floor(Math.random() * dueWordArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: 'Selected to help you practice words that are due for review',
          type: 'due-words',
          dueWordRootIds,
        };
      }
    }

    // Strategy 2: If user has difficult words and study progress
    if (user?.id && hasDifficultWordArticles && difficultWordRootIds.size > 0 && hasAnyStudyWords) {
      const difficultWordArticles = articlesData.filter(article =>
        article.article_sentences?.some(sentence =>
          sentence.sentence_words?.some((word: any) => difficultWordRootIds.has(word.root_id))
        )
      );

      if (difficultWordArticles.length > 0) {
        const randomArticle =
          difficultWordArticles[Math.floor(Math.random() * difficultWordArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: "Chosen to reinforce words you're finding challenging",
          type: 'difficult-words',
          dueWordRootIds,
        };
      }
    }

    // Strategy 3: If user has no study progress, show beginner content
    if (!user?.id || !hasAnyStudyWords) {
      const beginnerArticles = getBeginnerArticles(filterArticles(articlesData, null, null));

      if (beginnerArticles.length > 0) {
        const randomArticle =
          beginnerArticles[Math.floor(Math.random() * beginnerArticles.length)] ?? null;
        return {
          article: randomArticle,
          reason: 'Perfect for getting started with your reading journey',
          type: 'beginner',
          dueWordRootIds,
        };
      }
    }

    // Fallback: Random article
    const randomArticle = articlesData[Math.floor(Math.random() * articlesData.length)] ?? null;
    return {
      article: randomArticle,
      reason: 'Randomly selected for you to discover new content',
      type: 'random',
      dueWordRootIds,
    };
  }, [
    articlesData,
    user?.id,
    hasDueWordArticles,
    dueWordRootIds,
    hasDifficultWordArticles,
    difficultWordRootIds,
    hasAnyStudyWords,
  ]);
}

export default function ArticlesScreen(): JSX.Element {
  const colors = useColors();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { prefetchArticle } = useAppPreloader();

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

  // Get articles with word stats for filter data
  const { data: articlesData = [] } = useQuery({
    queryKey: ['articles', 'withWordStats'],
    queryFn: () => articlesService.getArticles({ includeWordStats: true }),
    staleTime: 3600000,
    gcTime: 7200000,
    retry: 3,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: old => old,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const intelligentArticle = useIntelligentArticleSelection(user, articlesData);

  // Force re-selection on refresh by adding refreshKey as a dependency
  const currentArticle = useMemo(() => {
    // Include refreshKey in the random selection to ensure new articles on refresh
    if (!articlesData.length) {
      return {
        article: null,
        reason: 'Loading articles...',
        type: 'random' as const,
        dueWordRootIds: new Set<number>(),
      };
    }

    // Use refreshKey to influence random selection for a different article
    const baseResult = intelligentArticle;

    // If it's a random selection or we want to force a new selection,
    // modify the seed to get a different article
    if (baseResult.type === 'random' || refreshKey > 0) {
      const availableArticles = articlesData.filter(
        article =>
          // Exclude the current article if refreshKey > 0 to ensure we get a different one
          refreshKey === 0 || article.id !== baseResult.article?.id
      );

      if (availableArticles.length > 0) {
        // Use refreshKey as part of the random seed to get different articles
        const randomIndex =
          (Math.floor(Math.random() * availableArticles.length) + refreshKey) %
          availableArticles.length;
        const newArticle = availableArticles[randomIndex] ?? null;

        return {
          ...baseResult,
          article: newArticle,
          reason: refreshKey > 0 ? 'New recommendation selected for you' : baseResult.reason,
        };
      }
    }

    return baseResult;
  }, [intelligentArticle, refreshKey, articlesData]);

  const derivedData = useMemo(() => {
    // Safety check - don't process if data isn't ready
    if (!articlesData?.length || !authors?.length || !categoriesData?.length) {
      return {
        authorsWithArticles: [],
        categoriesWithArticles: [],
      };
    }

    const authorIdsWithArticles = new Map<number, number>();
    const categoryIdsWithArticles = new Map<number, number>();

    articlesData.forEach(article => {
      if (article?.author?.id) {
        authorIdsWithArticles.set(
          article.author.id,
          (authorIdsWithArticles.get(article.author.id) || 0) + 1
        );
      }
      if (article?.category?.id) {
        categoryIdsWithArticles.set(
          article.category.id,
          (categoryIdsWithArticles.get(article.category.id) || 0) + 1
        );
      }
    });

    const authorsWithArticles = authors
      .filter(author => author?.id && authorIdsWithArticles.has(author.id))
      .map(author => ({
        ...author,
        count: authorIdsWithArticles.get(author.id) || 0,
      }));

    const categoriesWithArticles = categoriesData
      .filter(category => category?.id && categoryIdsWithArticles.has(category.id))
      .map(category => ({
        ...category,
        count: categoryIdsWithArticles.get(category.id) || 0,
      }));

    return {
      authorsWithArticles,
      categoriesWithArticles,
    };
  }, [articlesData, authors, categoriesData]);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    mediumFeedback();

    try {
      const queriesToInvalidate: (string | readonly string[])[] = [
        ['articles', 'withWordStats'],
        ['categories'],
      ];

      if (user?.id) {
        queriesToInvalidate.push(FSRS_QUERY_KEYS.due(user.id), FSRS_QUERY_KEYS.all(user.id));
      }

      await Promise.all(
        queriesToInvalidate.map(queryKey =>
          queryClient.invalidateQueries({
            queryKey: Array.isArray(queryKey) ? [...queryKey] : [queryKey],
          })
        )
      );

      // Force new article selection
      setRefreshKey(prev => prev + 1);

      // Optional: Add a small delay to ensure data is fresh before new selection
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Refresh failed'));
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, queryClient, user?.id]);

  const handleArticlePress = useCallback(
    (article: Article) => {
      dispatch(updateLastOpenedArticle(article.id));
      prefetchArticle(article.id);
      router.push(`/(tabs)/read/article/${article.id}`);
    },
    [dispatch, prefetchArticle]
  );

  const handleSelectAuthor = useCallback(
    (authorId: number) => {
      // Safety check - ensure we have a valid author ID
      if (!authorId || isNaN(authorId) || authorId <= 0) {
        console.warn('Invalid author ID:', authorId);
        return;
      }

      // Additional safety - ensure data is fully loaded
      if (!articlesData?.length || !authors?.length) {
        console.warn('Cannot navigate while data is loading');
        return;
      }

      // Verify the author actually exists in our data
      const authorExists = authors.some(author => author.id === authorId);
      if (!authorExists) {
        console.warn('Author does not exist in current data:', authorId);
        return;
      }

      router.push(`/(tabs)/read/filter?type=author&id=${authorId}`);
    },
    [articlesData, authors]
  );

  const handleSelectCategory = useCallback(
    (categoryId: number) => {
      // Safety check - ensure we have a valid category ID
      if (!categoryId || isNaN(categoryId) || categoryId <= 0) {
        console.warn('Invalid category ID:', categoryId);
        return;
      }

      // Additional safety - ensure data is fully loaded
      if (!articlesData?.length || !categoriesData?.length) {
        console.warn('Cannot navigate while data is loading');
        return;
      }

      // Verify the category actually exists in our data
      const categoryExists = categoriesData.some(cat => cat.id === categoryId);
      if (!categoryExists) {
        console.warn('Category does not exist in current data:', categoryId);
        return;
      }

      router.push(`/(tabs)/read/filter?type=category&id=${categoryId}`);
    },
    [articlesData, categoriesData]
  );

  const calculateDueWordsForArticle = useCallback(
    (article: Article, dueWordRootIds: Set<number>): number => {
      if (!user?.id || !dueWordRootIds || dueWordRootIds.size === 0) return 0;

      const uniqueDueRootIds = new Set<number>();

      article.article_sentences?.forEach(sentence => {
        sentence.sentence_words?.forEach((word: any) => {
          if (word.root_id && dueWordRootIds.has(word.root_id)) {
            uniqueDueRootIds.add(word.root_id);
          }
        });
      });

      return uniqueDueRootIds.size;
    },
    [user?.id]
  );

  const ListHeaderComponent = useMemo(() => {
    const dueWordsCount = currentArticle.article
      ? calculateDueWordsForArticle(currentArticle.article, currentArticle.dueWordRootIds)
      : 0;

    return (
      <>
        {currentArticle.article && (
          <FeaturedSection
            article={currentArticle.article}
            dueWordCount={dueWordsCount > 0 ? dueWordsCount : undefined}
            showTitle={false}
            onPress={handleArticlePress}
          />
        )}

        {/* Only render FilterSections when data is stable and valid - with extra safety */}
        {(() => {
          try {
            const validCategories = derivedData.categoriesWithArticles.filter(
              cat => cat?.id && cat.id > 0 && cat?.name
            );
            const validAuthors = derivedData.authorsWithArticles.filter(
              author => author?.id && author.id > 0 && author?.name
            );

            return (
              <>
                {/* Divider between recommended article and categories */}
                {currentArticle.article &&
                  articlesData?.length > 0 &&
                  categoriesData?.length > 0 &&
                  validCategories.length > 0 && <SectionDivider />}

                {articlesData?.length > 0 &&
                  categoriesData?.length > 0 &&
                  validCategories.length > 0 && (
                    <FilterSection items={validCategories} onSelect={handleSelectCategory} />
                  )}

                {articlesData?.length > 0 &&
                  categoriesData?.length > 0 &&
                  authors?.length > 0 &&
                  validCategories.length > 0 &&
                  validAuthors.length > 0 && <SectionDivider />}

                {articlesData?.length > 0 && authors?.length > 0 && validAuthors.length > 0 && (
                  <FilterSection items={validAuthors} onSelect={handleSelectAuthor} />
                )}
              </>
            );
          } catch (error) {
            console.warn('Error rendering filter sections:', error);
            return null;
          }
        })()}
      </>
    );
  }, [
    currentArticle.article,
    currentArticle.dueWordRootIds,
    calculateDueWordsForArticle,
    handleArticlePress,
    derivedData.authorsWithArticles,
    derivedData.categoriesWithArticles,
    handleSelectAuthor,
    handleSelectCategory,
  ]);

  const ListFooterComponent = useMemo(() => {
    return <WelcomeMessage />;
  }, []);

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

  // Get loading state from queries
  const articlesQueryState = queryClient.getQueryState(['articles', 'withWordStats']);
  const isLoadingArticles = articlesQueryState?.status === 'pending';
  const hasArticlesError = articlesQueryState?.status === 'error';

  // Show error state only if there's a query error and we're not refreshing
  if (hasArticlesError && !isRefreshing && !isLoadingArticles) {
    return <ErrorState message="Unable to load articles" onRetry={handleRefresh} />;
  }

  return (
    <ThemedView
      accessibilityLabel="Articles screen"
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ArticleList
        articles={articlesData}
        contentContainerStyle={contentContainerStyle}
        hideMainList={true}
        hideWhileRefreshing={false}
        isLoading={isLoadingArticles}
        isRefreshing={isRefreshing}
        ListEmptyComponent={null}
        ListFooterComponent={ListFooterComponent}
        ListHeaderComponent={ListHeaderComponent}
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

  const articlesQueryState = queryClient.getQueryState(['articles', 'withWordStats']);
  const articlesLoaded =
    articlesQueryState?.status === 'success' || articlesQueryState?.status === 'error';

  const { isLoading: isDueWordsLoading } = useArticlesByDueWords(user?.id, 10);

  return useMemo(() => {
    if (!user?.id) return articlesLoaded;
    return articlesLoaded && !isDueWordsLoading;
  }, [articlesLoaded, isDueWordsLoading, user?.id]);
}
