import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, RefreshControl } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/VocabularyGraph';
import { VocabularyDashboard } from '@/components/VocabularyDashboard';
import { VocabularyEmptyState } from '@/components/VocabularyEmptyState';
import { SignInRequired } from '@/components/SignInRequired';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { LoadingScreen } from '@/components/Loader';
import { VocabularyStats, WeeklyProgressData } from '@/types/vocabulary.types';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { calculateVocabularyStats, calculateWeeklyProgressData } from '@/utils/vocabularyStats';
import { useScreenFocusRefresh, useNavigationWithDebounce, useLoadingState } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import PageHeader from '@/components/PageHeader';
import { ReviewButton, DisabledReviewButton } from '@/components/vocabulary/ReviewButton';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { mediumFeedback } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper function to calculate header height
const getHeaderHeight = (insets: { top: number }) => {
  return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.LARGE;
};

export default function VocabularyScreen() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  // Add loading state hook to match other tab screens
  const { isLoading: isLoadingState, startLoading, stopLoading } = useLoadingState();

  // Add state for refresh control
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Query for study words - updated to use FSRS service
  const {
    data: studyWords = [],
    isLoading: isStudyWordsLoading,
    isFetching: isStudyWordsFetching,
    error,
    refetch: refetchStudyWords,
  } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsFSRSService.getFSRSWords(user!.id, { forStats: false }),
    enabled: !!user,
    staleTime: 60000, // 1 minute
    refetchOnWindowFocus: false,
    // Get previous data from cache to prevent UI flicker
    placeholderData: () => queryClient.getQueryData(['studyWords', user?.id]) || [],
  });

  // Query for due words - updated to use FSRS service
  const {
    data: dueWordsData = [],
    isFetching: isDueWordsFetching,
    refetch: refetchDueWords,
  } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: () => studyWordsFSRSService.getFSRSWords(user!.id, { onlyDue: true }),
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data for due words
    gcTime: 60000, // 1 minute
    // Get previous data from cache to prevent UI flicker
    placeholderData: () => queryClient.getQueryData(['dueWords', user?.id]) || [],
  });

  // Combined loading and fetching states for better UX
  const isDataLoading = isStudyWordsLoading;
  const isFetching = isStudyWordsFetching || isDueWordsFetching;

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
    return studyWords?.filter(word => word?.sentence_word != null) ?? [];
  }, [studyWords]);

  // Check if data is ready to display (similar to other tab screens)
  const isDataReady = useMemo(() => {
    return !!user && (validStudyWords.length > 0 || error !== null);
  }, [user, validStudyWords.length, error]);

  // Add screen animation hook to match other tab screens
  const { fadeInStyle } = useScreenAnimation(
    isDataReady,
    isLoadingState
    // Using default values for remaining parameters
  );

  // Update loading state based on data loading (similar to bookmarks.tsx)
  useEffect(() => {
    if (isAuthLoading || (!!user && isDataLoading)) {
      startLoading();
    } else {
      stopLoading();
    }
  }, [isAuthLoading, user, isDataLoading, startLoading, stopLoading]);

  // Calculate stats with memoization - updated to use FSRS stats calculation
  const stats = useMemo<VocabularyStats>(() => {
    if (validStudyWords?.length === 0 && studyWords?.length === 0) {
      // Return safe defaults for empty data
      return {
        totalWords: 0,
        masteredWords: 0,
        learningWords: 0,
        dueWords: dueWordsData?.length ?? 0,
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
    return calculateVocabularyStats(validStudyWords ?? [], dueWordsData ?? []);
  }, [validStudyWords, dueWordsData, studyWords?.length]);

  // Calculate weekly progress data with memoization
  const weeklyProgressData = useMemo<WeeklyProgressData[]>(() => {
    // Always get data regardless of empty study words
    return calculateWeeklyProgressData(validStudyWords ?? []);
  }, [validStudyWords]);

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

    // Prefetch the review data to avoid the "no words" flash - updated to use FSRS service
    queryClient.prefetchQuery({
      queryKey: ['dueWords', user.id, 'review'],
      queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
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

  // Use the consistent loading pattern with other tabs
  if (isLoadingState && !isDataReady) {
    return <LoadingScreen color={colors.tint} />;
  }

  // Show sign-in message if not authenticated
  if (!user) {
    return (
      <SignInRequired
        headerTitle=""
        colors={colors}
        message="Sign in to continue"
        benefitTitle="Vocabulary"
        benefitDescription="Master new words through spaced repetition."
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

  // Show empty state only if we have no words AND we're done loading
  if (!isFetching && !isDataLoading && validStudyWords.length === 0 && studyWords.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <PageHeader title="Words" />
        <ThemedView style={styles.emptyStateContainer}>
          <VocabularyEmptyState colors={colors} />
        </ThemedView>
      </ThemedView>
    );
  }

  // Main content with fadeInStyle applied to match other tabs
  return (
    <Animated.View style={[styles.flexContainer, fadeInStyle]} collapsable={false}>
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <ThemedView
          scrollable={true}
          useSafeArea={false}
          includeBottomInset={false}
          contentContainerStyle={[styles.contentContainer, { paddingTop: getHeaderHeight(insets) }]}
          scrollViewProps={{
            refreshControl: (
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={[colors.tint]}
                tintColor={colors.tint}
              />
            ),
            showsVerticalScrollIndicator: false,
          }}
        >
          {/* Stats Dashboard */}
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

          {/* Weekly Progress Graph */}
          <VocabularyGraph
            data={weeklyProgressData}
            animationTriggered={true}
            title="Weekly Progress"
          />

          {/* Review Button Section */}
          {stats.dueWords > 0 ? (
            <View style={styles.reviewButtonWrapper}>
              <ReviewButton dueWords={stats.dueWords} onPress={handleStartReview} />
            </View>
          ) : (
            <View style={styles.reviewButtonWrapper}>
              <DisabledReviewButton />
            </View>
          )}
        </ThemedView>
        <PageHeader title="Words" />
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
    paddingTop: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
  },
  reviewButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});
