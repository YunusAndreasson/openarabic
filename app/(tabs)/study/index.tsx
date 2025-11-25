import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { BottomControls } from '@/components/bookmarks';
import { EmptyState, ErrorState } from '@/components/common';
import { DueWordsBottomSheet } from '@/components/study';
import { MemoryRetentionBottomSheet } from '@/components/study';
import { RecommendationCard } from '@/components/study';
import { StudyStreakBottomSheet } from '@/components/study';
import { VocabularyStatCards } from '@/components/study';
import { WordsMasteredBottomSheet } from '@/components/study';
import { PulsatingLoader } from '@/components/ui';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { articleQueries, fsrsQueries } from '@/constants/queries';
import { getArticleRoute, getStudyReviewRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useStudyStreak } from '@/hooks/study/useStudyStreak';
import { useColors } from '@/hooks/theme';
import { useBottomSheetManager } from '@/hooks/ui';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import type { Article } from '@/types/articles.types';
import type { ArticleId } from '@/types/branded.types';
import { ReviewAction } from '@/types/enums';
import { getBeginnerArticles } from '@/utils/articleUtils';
import { mediumFeedback } from '@/utils/haptics';
import { calculateWordCategories } from '@/utils/wordClassification';

type BottomSheetKey = 'memory' | 'due' | 'streak' | 'mastered';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { prefetchVocabularyData, prefetchArticle } = useAppPreloader();
  const colors = useColors();

  // Fetch all articles (same query as library) and extract beginner articles
  const { data: allArticles = [] } = useQuery(articleQueries.all());

  // Get 3 beginner articles for empty state recommendations
  const recommendedArticles = useMemo(() => {
    const beginnerArticles = getBeginnerArticles(allArticles);
    return beginnerArticles.slice(0, 3);
  }, [allArticles]);

  // Bottom sheet visibility management (only one sheet visible at a time)
  const { showSheet, hideSheet, isVisible } = useBottomSheetManager<BottomSheetKey>();

  // Fetch study streak data
  const { streak } = useStudyStreak();
  const currentStreak = streak?.currentStreak ?? 0;

  // Add ref to prevent infinite re-renders
  const hasPrefetchedRef = useRef(false);

  // Smooth spring animations for loading and content transitions
  // Always call hooks unconditionally at the top level
  const { animatedStyle: loadingAnimatedStyle, startAnimation: startLoadingAnimation } =
    useOpacityAnimation({
      initialOpacity: 0,
      duration: TIMING_CONFIG.FAST.duration,
    });

  const { animatedStyle: contentAnimatedStyle, startAnimation: startContentAnimation } =
    useOpacityAnimation({
      initialOpacity: 0,
      duration: TIMING_CONFIG.SLOW.duration,
    });

  // Combine focus effects for better performance
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      // Prevent multiple prefetch calls
      if (hasPrefetchedRef.current) return;

      const hasStudyWords = queryClient.getQueryData(
        fsrsQueries.allWithCooldown(user.id, 1).queryKey,
      );
      const hasDueWords = queryClient.getQueryData(fsrsQueries.due(user.id).queryKey);

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        hasPrefetchedRef.current = true;
        InteractionManager.runAfterInteractions(() => {
          prefetchVocabularyData();
          // Ensure due words are fresh when screen gains focus
          queryClient.refetchQueries({ queryKey: fsrsQueries.due(user.id).queryKey });
        });
      } else {
        // Mark as prefetched even if data exists to prevent future calls
        hasPrefetchedRef.current = true;
        // Still force a lightweight refresh of due counts to avoid stale UI after app restarts
        queryClient.refetchQueries({ queryKey: fsrsQueries.due(user.id).queryKey });
      }
    }, [user?.id, prefetchVocabularyData, queryClient]),
  );

  // Use the FSRS queries hook for data fetching
  const {
    allWords,
    dueWords,
    isLoading: isDataLoading,
    isFetching,
    error,
  } = useFSRSQueries({
    userId: user?.id,
    limit: 100,
  });

  // Filter study words for memory capacity gauge (needs all words, not just due)
  const filteredStudyWords = useMemo(() => {
    return allWords?.filter(word => word?.root_id != null) ?? [];
  }, [allWords]);

  // Get chart data for recommendations
  const { chartData } = useRetrievabilityChart(allWords || []);

  // Don't show error if user is not authenticated yet - this is expected during auth flow
  const shouldShowError = error && user;

  // Handle starting review - only for due words now
  const handleStartReview = useCallback(() => {
    if (!user) return;
    mediumFeedback();
    router.push(getStudyReviewRoute());
  }, [user, router]);

  // Bottom sheet press handlers
  const handleMemoryStrengthInfo = useCallback(() => showSheet('memory'), [showSheet]);
  const handleDuePress = useCallback(() => showSheet('due'), [showSheet]);
  const handleStreakPress = useCallback(() => showSheet('streak'), [showSheet]);
  const handleMasteredPress = useCallback(() => showSheet('mastered'), [showSheet]);

  // Handle article press from recommendations
  const handleRecommendedArticlePress = useCallback(
    (article: Article) => {
      // Prefetch article data after navigation animation completes
      InteractionManager.runAfterInteractions(() => {
        prefetchArticle(article.id);
      });
      router.push(getArticleRoute(article.id as ArticleId, article.title));
    },
    [prefetchArticle, router],
  );

  // Fix: Use the actual due words data count instead of database view
  // This ensures consistency between display and practice session
  const dueWordsCount = dueWords?.length ?? 0;

  // Show main UI if there are any words available in either query source
  // - allWords may lag if mutations only invalidate 'due' keys
  // - dueWords reflects immediate availability for study
  const hasAnyStudyWords = (allWords?.length ?? 0) > 0 || (dueWords?.length ?? 0) > 0;

  // FIXED: Calculate all word stats in single pass using optimized utility
  // Uses calculateWordCategories for efficiency (1 pass vs 3 separate filter passes)
  const calculatedStats = useMemo(() => {
    if (!filteredStudyWords.length) {
      return { masteredWords: 0, learningPhaseWords: 0 };
    }

    // Get mastered words count efficiently
    const { masteredWords } = calculateWordCategories(filteredStudyWords, dueWordsCount);

    // Learning phase words = States 1, 3, or State 2 with low stability - FOR RECOMMENDATION ENGINE
    const learningPhaseWords = filteredStudyWords.filter(word => {
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      return state === 1 || state === 3 || (state === 2 && stability < 5);
    }).length;

    return { masteredWords, learningPhaseWords };
  }, [filteredStudyWords, dueWordsCount]);

  // Bottom padding for content with floating buttons above tab bar
  const contentPaddingBottom = hasAnyStudyWords
    ? LAYOUT.SCREEN_PADDING.bottomWithControls
    : LAYOUT.SPACING.MEDIUM;

  // Solid overlay below button to cover gap to tab bar
  const bottomOverlayStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      left: 0,
      right: 0,
      bottom: 0,
      height: LAYOUT.FLOATING_CONTROLS.BOTTOM_POSITION, // Just cover the gap (4px)
      pointerEvents: 'none' as const,
      zIndex: 1, // Behind the button controls
      backgroundColor: colors.elevation0,
    }),
    [colors.elevation0],
  );

  // Calculate loading and content states (needed for animations before any early returns)
  const isLoadingState = isDataLoading || isFetching;
  const isDataCached = !!(user?.id && queryClient.getQueryData(fsrsQueries.all(user.id).queryKey));
  const shouldShowMainContent = !isLoadingState || (isLoadingState && isDataCached);

  // Track animation states to prevent restarts
  const hasStartedLoadingAnimation = useRef(false);
  const hasStartedContentAnimation = useRef(false);

  // Trigger animations at the right times (with guards to prevent restarts)
  useEffect(() => {
    const shouldShowLoading = isLoadingState && !isDataCached;
    if (shouldShowLoading && !hasStartedLoadingAnimation.current) {
      hasStartedLoadingAnimation.current = true;
      startLoadingAnimation();
    } else if (!shouldShowLoading) {
      hasStartedLoadingAnimation.current = false; // Reset for next loading state
    }
  }, [isLoadingState, isDataCached, startLoadingAnimation]);

  useEffect(() => {
    if (shouldShowMainContent && !hasStartedContentAnimation.current) {
      hasStartedContentAnimation.current = true;
      startContentAnimation();
    }
  }, [shouldShowMainContent, startContentAnimation]);

  // Show error message if there was an error loading data
  if (shouldShowError) {
    const handleRetry = () => {
      if (user?.id) {
        // Use helper to invalidate all FSRS queries
        fsrsQueries.invalidateAll(queryClient, user.id);
      }
    };

    return (
      <ThemedView style={styles.container}>
        <ErrorState
          message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_PRACTICE_DATA}
          onRetry={handleRetry}
        />
      </ThemedView>
    );
  }

  // Main content
  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        scrollable={true}
        useSafeArea={false}
        includeBottomInset={false}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingBottom: contentPaddingBottom,
            // Enable vertical centering when empty
            ...(hasAnyStudyWords ? {} : { flexGrow: 1 }),
          },
        ]}
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
          contentInsetAdjustmentBehavior: 'never' as const,
        }}
      >
        {/* Subtle loading indicator with smooth animation */}
        {isLoadingState && !isDataCached && (
          <Animated.View style={[styles.loadingContainer, loadingAnimatedStyle]}>
            <PulsatingLoader size={32} />
          </Animated.View>
        )}

        {/* PRIMARY SECTION: Learning Overview with smooth animation */}
        {shouldShowMainContent && (
          <Animated.View
            style={[
              styles.vocabularySection,
              contentAnimatedStyle,
              // Required for empty state centering due to wrapper hierarchy
              !hasAnyStudyWords && { flex: 1 },
            ]}
          >
            {hasAnyStudyWords ? (
              <>
                <VocabularyStatCards
                  dueWords={dueWordsCount}
                  currentStreak={currentStreak}
                  masteredWords={calculatedStats.masteredWords}
                  studyWords={filteredStudyWords}
                  onInfoPress={handleMemoryStrengthInfo}
                  onDuePress={handleDuePress}
                  onStreakPress={handleStreakPress}
                  onMasteredPress={handleMasteredPress}
                />

                {/* Recommendation Card - placed below stat cards */}
                <RecommendationCard
                  studyWords={filteredStudyWords}
                  dueWordsCount={dueWordsCount}
                  currentRetention={chartData.insights.currentRetrievability}
                  learningWords={calculatedStats.learningPhaseWords}
                  masteredWords={calculatedStats.masteredWords}
                  trend={chartData.insights.trend}
                />
              </>
            ) : (
              <EmptyState
                title={STRINGS.STUDY_LIST_EMPTY_TITLE}
                description={STRINGS.STUDY_LIST_EMPTY_DESCRIPTION}
                recommendedArticles={recommendedArticles}
                onArticlePress={handleRecommendedArticlePress}
              />
            )}
          </Animated.View>
        )}
      </ThemedView>

      {/* Solid overlay below button */}
      {hasAnyStudyWords && <View style={bottomOverlayStyle} />}

      {/* Bottom fixed action button, hidden when there are no study words */}
      {hasAnyStudyWords && (
        <View
          style={{
            position: 'absolute',
            bottom: LAYOUT.FLOATING_CONTROLS.BOTTOM_POSITION,
            left: 0,
            right: 0,
            zIndex: 2, // Above the gap filler
          }}
        >
          <BottomControls
            primaryLabel={ReviewAction.STUDY_DUE_WORDS}
            onPrimaryPress={handleStartReview}
            primaryDisabled={dueWordsCount === 0}
          />
        </View>
      )}

      {/* Coordinated Bottom Sheets - only one can be visible at a time */}
      <MemoryRetentionBottomSheet isVisible={isVisible('memory')} onClose={hideSheet} />
      <DueWordsBottomSheet isVisible={isVisible('due')} onClose={hideSheet} />
      <StudyStreakBottomSheet isVisible={isVisible('streak')} onClose={hideSheet} />
      <WordsMasteredBottomSheet isVisible={isVisible('mastered')} onClose={hideSheet} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  contentContainer: LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
  loadingContainer: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.HIGH,
    paddingVertical: LAYOUT.SPACING.TINY, // Subtle loading indicator
  },
  vocabularySection: {
    gap: LAYOUT.SPACING.SMALL, // 8px gap for perfect consistency with stat cards
  },
});
