import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { BottomControls } from '@/components/bookmarks/BottomControls';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { DueWordsBottomSheet } from '@/components/study/DueWordsBottomSheet';
import { LearnedBottomSheet } from '@/components/study/LearnedBottomSheet';
import { MemoryRetentionBottomSheet } from '@/components/study/MemoryRetentionBottomSheet';
import { RecommendationCard } from '@/components/study/RecommendationCard';
import { VocabularyStatCards } from '@/components/study/VocabularyStatCards';
import { WordsMasteredBottomSheet } from '@/components/study/WordsMasteredBottomSheet';
import { PulsatingLoader } from '@/components/ui/PulsatingLoader';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { fsrsQueries } from '@/constants/queries';
import { getStudyReviewRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import { ReviewAction } from '@/types/enums';
import { mediumFeedback } from '@/utils/haptics';
import { calculateWordCategories } from '@/utils/wordClassification';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { prefetchVocabularyData } = useAppPreloader();
  const colors = useColors();

  // Single coordinated state for bottom sheet visibility
  const [activeBottomSheet, setActiveBottomSheet] = useState<
    'memory' | 'due' | 'learned' | 'mastered' | null
  >(null);

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

  // Bottom sheet handler
  const handleBottomSheetChange = useCallback(
    (sheet: 'memory' | 'due' | 'learned' | 'mastered' | null) => {
      setActiveBottomSheet(sheet);
    },
    [],
  );

  // Handle memory strength gauge info press - now opens bottom sheet
  const handleMemoryStrengthInfo = useCallback(() => {
    handleBottomSheetChange('memory');
  }, [handleBottomSheetChange]);

  // Handle closing any bottom sheet
  const handleCloseBottomSheet = useCallback(() => {
    handleBottomSheetChange(null);
  }, [handleBottomSheetChange]);

  // Handle card presses
  const handleDuePress = useCallback(() => {
    handleBottomSheetChange('due');
  }, [handleBottomSheetChange]);

  const handleLearnedPress = useCallback(() => {
    handleBottomSheetChange('learned');
  }, [handleBottomSheetChange]);

  const handleMasteredPress = useCallback(() => {
    handleBottomSheetChange('mastered');
  }, [handleBottomSheetChange]);

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
      return { learnedWords: 0, masteredWords: 0, learningPhaseWords: 0 };
    }

    // Get all stats efficiently with single-pass calculation
    const { learnedWords, masteredWords } = calculateWordCategories(
      filteredStudyWords,
      dueWordsCount,
    );

    // Learning phase words = States 1, 3, or State 2 with low stability - FOR RECOMMENDATION ENGINE
    const learningPhaseWords = filteredStudyWords.filter(word => {
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      return state === 1 || state === 3 || (state === 2 && stability < 5);
    }).length;

    return { learnedWords, masteredWords, learningPhaseWords };
  }, [filteredStudyWords, dueWordsCount]);

  // Bottom padding for content with floating buttons above tab bar
  const contentPaddingBottom = LAYOUT.SCREEN_PADDING.bottomWithControls;

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
                  learnedWords={calculatedStats.learnedWords}
                  masteredWords={calculatedStats.masteredWords}
                  studyWords={filteredStudyWords}
                  onInfoPress={handleMemoryStrengthInfo}
                  onDuePress={handleDuePress}
                  onLearnedPress={handleLearnedPress}
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
                submessage={STRINGS.STUDY_LIST_EMPTY_SUBMESSAGE}
                icon="school"
                iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
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
      <MemoryRetentionBottomSheet
        isVisible={activeBottomSheet === 'memory'}
        onClose={handleCloseBottomSheet}
      />

      <DueWordsBottomSheet
        isVisible={activeBottomSheet === 'due'}
        onClose={handleCloseBottomSheet}
      />

      <LearnedBottomSheet
        isVisible={activeBottomSheet === 'learned'}
        onClose={handleCloseBottomSheet}
      />

      <WordsMasteredBottomSheet
        isVisible={activeBottomSheet === 'mastered'}
        onClose={handleCloseBottomSheet}
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
    gap: LAYOUT.SPACING.MEDIUM, // 12px gap between VocabularyStatCards and RecommendationCard
  },
});
