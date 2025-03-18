import React, { useMemo, useState, useEffect, useRef } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/VocabularyGraph';
import { VocabularyDashboard } from '@/components/VocabularyDashboard';
import { VocabularyEmptyState } from '@/components/VocabularyEmptyState';
import { SignInRequired } from '@/components/SignInRequired';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsService } from '@/services/studyWords';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen, LoadingContainer } from '@/components/Loader';
import { VocabularyStats, WeeklyProgressData } from '@/types/vocabulary.types';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { calculateVocabularyStats, calculateWeeklyProgressData } from '@/utils/vocabularyStats';
import {
  useLoadingState,
  useScreenFocusRefresh,
  useScreenAnimation,
  useNavigationWithDebounce,
} from '@/hooks';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
import PageHeader from '@/components/PageHeader';
import { ReviewButton, DisabledReviewButton } from '@/components/vocabulary/ReviewButton';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { mediumFeedback } from '@/utils/haptics';

export default function VocabularyScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();

  // Add state for refresh control
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Use the loading state hook with default parameters
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();

  // Query for study words
  const {
    data: studyWords = [],
    isLoading: isDataLoading,
    isFetching,
    status,
    error,
    refetch: refetchStudyWords,
  } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id, { forStats: false }),
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Query for due words
  const { data: dueWordsData = [], refetch: refetchDueWords } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: () => studyWordsService.getStudyWords(user!.id, { onlyDue: true }),
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data for due words
    gcTime: 60000, // 1 minute
  });

  // Handler for pull-to-refresh
  const handleRefresh = async () => {
    if (!user) return;

    // Provide haptic feedback when refreshing
    mediumFeedback();

    setIsRefreshing(true);

    // Refetch both study words and due words
    await Promise.all([refetchStudyWords(), refetchDueWords()]);

    setIsRefreshing(false);
  };

  // Use the screen focus refresh hook
  useScreenFocusRefresh(
    queryClient,
    'dueWords',
    user?.id,
    0, // Always refresh due words
    true, // Skip initial focus
    true // Force refresh on focus
  );

  useScreenFocusRefresh(
    queryClient,
    'studyWords',
    user?.id,
    60000, // 1 minute stale time
    true, // Skip initial focus
    true // Force refresh on focus
  );

  // Filter valid study words
  const validStudyWords = useMemo(() => {
    return studyWords.filter(word => word.sentence_word != null);
  }, [studyWords]);

  // Check if study words data is already in cache to optimize loading behavior
  const studyWordsQuery = queryClient.getQueryState(['studyWords', user?.id]);
  const isDataCached = studyWordsQuery?.data !== undefined;

  // Check if data is ready to display - include cached data in the check
  const isDataReady = useMemo(() => {
    // Consider data ready if we have valid words OR we have cached data
    return (!!user && !isDataLoading && validStudyWords.length > 0) || (!!user && isDataCached);
  }, [user, isDataLoading, validStudyWords.length, isDataCached]);

  // Calculate stats with safe defaults when data is loading but we're showing UI
  const stats = useMemo<VocabularyStats>(() => {
    if (isDataCached && validStudyWords.length === 0) {
      // Return safe defaults when using cached data but actual data isn't loaded yet
      return {
        totalWords: 0,
        masteredWords: 0,
        learningWords: 0,
        dueWords: 0,
        streak: 0,
        successRate: 0,
        averageInterval: 0,
        averageEaseFactor: 0,
        averageLapses: 0,
        newWordsCount: 0,
        failedInSessionCount: 0,
        longestSuccessStreak: 0,
        wordsWithStreaks: 0,
        averageDifficulty: 0.3, // Default initial difficulty
      };
    }
    return calculateVocabularyStats(validStudyWords, dueWordsData);
  }, [validStudyWords, dueWordsData, isDataCached]);

  // Calculate weekly progress data with safe defaults
  const weeklyProgressData = useMemo<WeeklyProgressData[]>(() => {
    if (isDataCached && validStudyWords.length === 0) {
      // Return empty array when using cached data but actual data isn't loaded yet
      return [];
    }
    return calculateWeeklyProgressData(validStudyWords);
  }, [validStudyWords, isDataCached]);

  // Handle starting a review
  const handleStartReview = () => {
    if (!user) return;

    // Invalidate due words query to refresh after review
    queryClient.invalidateQueries({ queryKey: ['dueWords', user.id] });

    // Mark study words as stale to ensure refresh when returning
    queryClient.invalidateQueries({
      queryKey: ['studyWords', user.id],
      refetchType: 'none', // Don't refetch now, but mark as stale for when we return
    });

    // Prefetch the review data to avoid the "no words" flash
    queryClient.prefetchQuery({
      queryKey: ['dueWords', user.id, 'review'],
      queryFn: () => studyWordsService.getStudyWords(user.id, { onlyDue: true }),
    });

    // Navigate to review screen
    navigateTo({
      pathname: '/review',
      params: { fromVocabulary: 'true' },
    });
  };

  // Handle stat press events
  const handleStatPress = (category: 'total' | 'mastered' | 'learning' | 'due') => {
    // Navigate to the word list with the selected category
    navigateTo({
      pathname: '/wordList',
      params: { category },
    });
  };

  // Content loading state - take cached data into account to avoid flicker
  const isContentLoading = !!user && (isFetching || isDataLoading) && !isDataCached;

  // Use opacity animation for the loader - start with opacity 0 if data is cached
  const { animatedStyle: loaderAnimatedStyle, setOpacity: setLoaderOpacity } = useOpacityAnimation({
    initialOpacity: isDataCached ? 0 : 1,
    duration: 300,
  });

  // Use the screen animation hook for content - reduce animation delay if data is cached
  const { fadeInStyle } = useScreenAnimation(
    isDataReady || isDataCached,
    (isLoadingState || isDataLoading) && !isDataCached
    // Using default parameters (80ms)
  );

  // Update loading state and loader opacity based on data loading
  useEffect(() => {
    if (isAuthLoading || (!!user && status === 'pending' && isFetching && !isDataCached)) {
      startLoading();
      setLoaderOpacity(1);
    } else {
      stopLoading();

      // Fade out the loader when data is ready
      if (isDataReady || isDataCached) {
        setLoaderOpacity(0);
      }
    }
  }, [
    isAuthLoading,
    user,
    status,
    isFetching,
    isDataReady,
    isDataCached,
    startLoading,
    stopLoading,
    setLoaderOpacity,
  ]);

  // Show loading screen for initial load only if data is not cached
  if (isLoadingState && !isDataCached) {
    return <LoadingScreen color={colors.tint} />;
  }

  // Show sign-in message if not authenticated
  if (!user) {
    return (
      <SignInRequired
        headerTitle=""
        colors={colors}
        message="Sign in to track"
        benefitTitle="Build Words"
        benefitDescription="Learn through spaced repetition."
      />
    );
  }

  // Show error message if there was an error loading data
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorMessage />
      </ThemedView>
    );
  }

  // Show empty state only if we have no words AND we're done loading AND there's no cached data
  // This prevents the empty state from flashing while data is still being processed
  if (!isContentLoading && !isFetching && validStudyWords.length === 0 && !isDataCached) {
    return (
      <ThemedView style={styles.container}>
        <VocabularyEmptyState colors={colors} />
      </ThemedView>
    );
  }

  // Main content
  return (
    <Animated.View style={[styles.flexContainer, fadeInStyle]}>
      <ThemedView style={styles.container} useSafeArea={true} includeBottomInset={false}>
        {/* Fixed header */}
        <PageHeader title="Words" />

        {/* Content */}
        <ThemedView
          scrollable={true}
          useSafeArea={false}
          includeBottomInset={false}
          contentContainerStyle={styles.contentContainer}
          scrollViewProps={{
            refreshControl: (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.tint]}
                tintColor={colors.tint}
              />
            ),
          }}
        >
          {/* Always render loader but control visibility with opacity */}
          <Animated.View
            style={[
              styles.fullscreenLoader,
              { backgroundColor: colors.background },
              // @ts-ignore - Animated style from useOpacityAnimation
              loaderAnimatedStyle,
            ]}
            pointerEvents={isContentLoading ? 'auto' : 'none'}
          >
            <LoadingContainer size="large" color={colors.tint} />
          </Animated.View>

          {/* Stats Dashboard */}
          <View style={styles.dashboardWrapper}>
            <VocabularyDashboard
              totalWords={stats.totalWords}
              masteredWords={stats.masteredWords}
              learningWords={stats.learningWords}
              dueWords={stats.dueWords}
              colors={colors}
              animationTriggered={true}
              onStatPress={handleStatPress}
              streakStats={{
                longestSuccessStreak: stats.longestSuccessStreak || 0,
                wordsWithStreaks: stats.wordsWithStreaks || 0,
                averageDifficulty: stats.averageDifficulty || 0,
              }}
            />
          </View>

          {/* Weekly Progress Graph */}
          <View
            style={[
              styles.graphWrapper,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.cardBorder,
              },
              LAYOUT.SHADOW.MEDIUM,
            ]}
          >
            <VocabularyGraph
              data={weeklyProgressData}
              animationTriggered={true}
              title="Weekly Progress"
            />
          </View>

          {/* Review Button Section */}
          {isDataReady && (
            <View style={styles.reviewButtonWrapper}>
              {stats.dueWords > 0 ? (
                <ReviewButton dueWords={stats.dueWords} onPress={handleStartReview} />
              ) : (
                <DisabledReviewButton />
              )}
            </View>
          )}
        </ThemedView>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flexContainer: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE, // Increased from MEDIUM to LARGE for better spacing from header
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM, // Added extra padding at bottom for better scroll experience
  },
  fullscreenLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.OVERLAY, // Use Z_INDEX constant instead of hardcoded value
  },
  graphWrapper: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
    marginBottom: LAYOUT.SPACING.LARGE, // Increased from MEDIUM to LARGE for better visual separation
    height: 250,
  },
  reviewButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE, // Increased from MEDIUM to LARGE for better bottom spacing
  },
  dashboardWrapper: {
    marginBottom: LAYOUT.SPACING.LARGE, // Increased from MEDIUM to LARGE for better visual separation
  },
});
