import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import BottomControls from '@/components/bookmarks/BottomControls';
import EmptyState from '@/components/common/EmptyState';
import { DueWordsBottomSheet } from '@/components/study/DueWordsBottomSheet';
import ErrorMessage from '@/components/study/ErrorMessage';
import { LearningRateBottomSheet } from '@/components/study/LearningRateBottomSheet';
import { MemoryRetentionBottomSheet } from '@/components/study/MemoryRetentionBottomSheet';
import RecommendationCard from '@/components/study/RecommendationCard';
import { VocabularyStatCards } from '@/components/study/VocabularyStatCards';
import { WordsMasteredBottomSheet } from '@/components/study/WordsMasteredBottomSheet';
import PulsatingLoader from '@/components/ui/PulsatingLoader';
import { TIMING_CONFIG } from '@/constants/animation';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { getStudyReviewRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import { useEfficiencyChart } from '@/hooks/vocabulary/useEfficiencyChart';
import { ReviewAction } from '@/types/enums';
import { mediumFeedback } from '@/utils/haptics';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { prefetchVocabularyData } = useAppPreloader();
  const insets = useSafeAreaInsets();

  // Add state for bottom sheet visibility
  const [isMemoryRetentionVisible, setIsMemoryRetentionVisible] = useState(false);
  const [isDueWordsVisible, setIsDueWordsVisible] = useState(false);
  const [isLearningRateVisible, setIsLearningRateVisible] = useState(false);
  const [isWordsMasteredVisible, setIsWordsMasteredVisible] = useState(false);

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

      const hasStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.allWithCooldown(user.id, 1));
      const hasDueWords = queryClient.getQueryData(FSRS_QUERY_KEYS.due(user.id));

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        hasPrefetchedRef.current = true;
        InteractionManager.runAfterInteractions(() => {
          prefetchVocabularyData();
          // Ensure due words are fresh when screen gains focus
          queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
        });
      } else {
        // Mark as prefetched even if data exists to prevent future calls
        hasPrefetchedRef.current = true;
        // Still force a lightweight refresh of due counts to avoid stale UI after app restarts
        queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
      }
    }, [user?.id, prefetchVocabularyData, queryClient])
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
    return allWords?.filter(word => word != null && word.root_id != null) ?? [];
  }, [allWords]);

  // Get chart data for recommendations
  const { chartData } = useRetrievabilityChart(allWords || []);
  const { chartData: efficiencyChartData } = useEfficiencyChart(filteredStudyWords);

  // Don't show error if user is not authenticated yet - this is expected during auth flow
  const shouldShowError = error && user;

  // Handle starting review - only for due words now
  const handleStartReview = useCallback(() => {
    if (!user) return;
    mediumFeedback();
    router.push(getStudyReviewRoute());
  }, [user, router]);

  // Handle memory strength gauge info press - now opens bottom sheet
  const handleMemoryStrengthInfo = useCallback(() => {
    setIsMemoryRetentionVisible(true);
  }, []);

  // Handle closing the bottom sheets
  const handleCloseMemoryRetention = useCallback(() => {
    setIsMemoryRetentionVisible(false);
  }, []);

  const handleCloseDueWords = useCallback(() => {
    setIsDueWordsVisible(false);
  }, []);

  const handleCloseLearningRate = useCallback(() => {
    setIsLearningRateVisible(false);
  }, []);

  const handleCloseWordsMastered = useCallback(() => {
    setIsWordsMasteredVisible(false);
  }, []);

  // Fix: Use the actual due words data count instead of database view
  // This ensures consistency between display and practice session
  const dueWordsCount = dueWords?.length ?? 0;

  // Show main UI if there are any words available in either query source
  // - allWords may lag if mutations only invalidate 'due' keys
  // - dueWords reflects immediate availability for study
  const hasAnyStudyWords = (allWords?.length ?? 0) > 0 || (dueWords?.length ?? 0) > 0;

  // FIXED: Calculate learning and mastered words from actual data instead of database view
  // This ensures consistency between display and session logic for all word types
  const calculatedStats = useMemo(() => {
    if (!filteredStudyWords.length) {
      return { learningWords: 0, masteredWords: 0 };
    }

    // Use same logic as VocabularyStatCards and server-side filters
    const learningWords = filteredStudyWords.filter(word => {
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      // State 0 (New) words are due for first review, not learning
      // Only states 1, 3, or state 2 with low stability are learning
      return state === 1 || state === 3 || (state === 2 && stability < 5);
    }).length;

    const masteredWords = filteredStudyWords.filter(word => {
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      return state === 2 && stability >= 5;
    }).length;

    return { learningWords, masteredWords };
  }, [filteredStudyWords]);

  // Memoize bottom padding calculation with minimal dependencies
  const contentPaddingBottom = useMemo(
    () => insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.SMALL,
    [insets.bottom]
  );

  // Calculate loading and content states (needed for animations before any early returns)
  const isLoadingState = isDataLoading || isFetching;
  const isDataCached = !!(user?.id && queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id)));
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
    return (
      <ThemedView style={styles.container}>
        <ErrorMessage
          customMessage={
            error instanceof Error
              ? error.message
              : 'Failed to load practice data. Please try again.'
          }
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
          <Animated.View style={[styles.vocabularySection, contentAnimatedStyle]}>
            {hasAnyStudyWords ? (
              <>
                <VocabularyStatCards
                  dueWords={dueWordsCount}
                  learningWords={calculatedStats.learningWords}
                  masteredWords={calculatedStats.masteredWords}
                  studyWords={filteredStudyWords}
                  onInfoPress={handleMemoryStrengthInfo}
                  onDuePress={() => setIsDueWordsVisible(true)}
                  onLearningPress={() => setIsLearningRateVisible(true)}
                  onMasteredPress={() => setIsWordsMasteredVisible(true)}
                />

                {/* Recommendation Card - placed below stat cards */}
                <RecommendationCard
                  studyWords={filteredStudyWords}
                  dueWordsCount={dueWordsCount}
                  currentRetention={chartData.insights.currentRetrievability}
                  learningWords={calculatedStats.learningWords}
                  masteredWords={calculatedStats.masteredWords}
                  trend={chartData.insights.trend}
                />
              </>
            ) : (
              <EmptyState
                title={STRINGS.STUDY_LIST_EMPTY_TITLE}
                description={STRINGS.STUDY_LIST_EMPTY_DESCRIPTION}
                icon="school"
                iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
                hideArticlesButton={true}
                containerStyle={{
                  paddingTop: LAYOUT.SPACING.XLARGE,
                  paddingBottom: LAYOUT.SPACING.LARGE,
                }}
              />
            )}
          </Animated.View>
        )}
      </ThemedView>

      {/* Bottom fixed action button, hidden when there are no study words */}
      {hasAnyStudyWords && (
        <View
          style={{
            position: 'absolute',
            bottom:
              LAYOUT.BOTTOM_BAR.HEIGHT +
              LAYOUT.SPACING.TINY -
              LAYOUT.SPACING.MEDIUM -
              LAYOUT.SPACING.SMALL,
            left: 0,
            right: 0,
          }}
        >
          <BottomControls
            primaryLabel={ReviewAction.STUDY_DUE_WORDS}
            onPrimaryPress={handleStartReview}
            primaryDisabled={dueWordsCount === 0}
          />
        </View>
      )}

      {/* Memory Retention Bottom Sheet */}
      <MemoryRetentionBottomSheet
        isVisible={isMemoryRetentionVisible}
        onClose={handleCloseMemoryRetention}
      />

      {/* Due Words Bottom Sheet */}
      <DueWordsBottomSheet isVisible={isDueWordsVisible} onClose={handleCloseDueWords} />

      {/* Learning Rate Bottom Sheet */}
      <LearningRateBottomSheet
        isVisible={isLearningRateVisible}
        onClose={handleCloseLearningRate}
      />

      {/* Words Mastered Bottom Sheet */}
      <WordsMasteredBottomSheet
        isVisible={isWordsMasteredVisible}
        onClose={handleCloseWordsMastered}
      />
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
    // No margin needed - spacing handled by contentContainer
  },
});
