import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
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
import { ThemedButton } from '@/components/ThemedButton';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { mediumFeedback } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Pure functions moved outside component
const getHeaderHeight = (insets: { top: number }) => {
  return insets.top + LAYOUT.SPACING.TINY + LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.LARGE;
};

// Split stats calculation into smaller chunks for better memoization
const getBaseStats = (validStudyWords: any[], dueWordsData: any[]) => {
  const stats = validStudyWords.reduce(
    (acc, word) => {
      // Count new words
      if (!word.last_reviewed_at) {
        acc.newWordsCount++;
      }
      return acc;
    },
    {
      totalWords: validStudyWords.length,
      dueWords: dueWordsData?.length ?? 0,
      newWordsCount: 0,
    }
  );
  return stats;
};

const getAdvancedStats = (validStudyWords: any[]) => {
  if (validStudyWords.length === 0) return null;

  // Single pass for all stats
  const stats = validStudyWords.reduce(
    (acc, word) => {
      // Track reviewed words stats
      if (word.last_reviewed_at) {
        acc.reviewedCount++;
        acc.successRateSum += word.success_rate || 0;
        acc.intervalSum += word.interval || 0;
        acc.easeFactorSum += word.ease_factor || 0;
      }

      // Track mastery stats
      if (word.state === 'mastered') acc.masteredCount++;
      if (word.state === 'learning') acc.learningCount++;

      // Track streaks and difficulty
      acc.maxStreak = Math.max(acc.maxStreak, word.streak || 0);
      acc.maxLongestStreak = Math.max(acc.maxLongestStreak, word.longest_streak || 0);
      if (word.streak > 0) acc.streakCount++;

      // Track other stats
      acc.lapsesSum += word.lapses || 0;
      if (word.failed_in_session) acc.failedInSession++;
      acc.difficultySum += word.difficulty || 0.3;

      return acc;
    },
    {
      reviewedCount: 0,
      successRateSum: 0,
      intervalSum: 0,
      easeFactorSum: 0,
      masteredCount: 0,
      learningCount: 0,
      maxStreak: 0,
      maxLongestStreak: 0,
      streakCount: 0,
      lapsesSum: 0,
      failedInSession: 0,
      difficultySum: 0,
    }
  );

  const totalCount = validStudyWords.length || 1;
  const reviewedCount = stats.reviewedCount || 1;

  return {
    successRate: stats.successRateSum / reviewedCount,
    averageInterval: stats.intervalSum / reviewedCount,
    averageEaseFactor: stats.easeFactorSum / reviewedCount,
    masteredWords: stats.masteredCount,
    learningWords: stats.learningCount,
    streak: stats.maxStreak,
    longestSuccessStreak: stats.maxLongestStreak,
    wordsWithStreaks: stats.streakCount,
    averageLapses: stats.lapsesSum / totalCount,
    failedInSessionCount: stats.failedInSession,
    averageDifficulty: stats.difficultySum / totalCount,
  };
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
    if (!user || isFetching) return; // Prevent multiple refreshes

    // Provide haptic feedback when refreshing
    mediumFeedback();

    setIsRefreshing(true);
    try {
      // Refetch both study words and due words
      await Promise.all([refetchStudyWords(), refetchDueWords()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Use the screen focus refresh hook with debounce
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

  // Filter valid study words with error protection
  const validStudyWords = useMemo(() => {
    if (!Array.isArray(studyWords)) return [];
    return studyWords.filter(word => word?.sentence_word != null);
  }, [studyWords]);

  // Check if data is ready to display with loading protection
  const isDataReady = useMemo(() => {
    if (isAuthLoading || isDataLoading) return false;
    return !!user && (validStudyWords.length > 0 || error !== null);
  }, [user, validStudyWords.length, error, isAuthLoading, isDataLoading]);

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

  // Split stats calculation into smaller memoized chunks
  const baseStats = useMemo(() => {
    if (validStudyWords?.length === 0 && studyWords?.length === 0) {
      return {
        totalWords: 0,
        dueWords: dueWordsData?.length ?? 0,
        newWordsCount: 0,
      };
    }
    return getBaseStats(validStudyWords ?? [], dueWordsData ?? []);
  }, [validStudyWords?.length, studyWords?.length, dueWordsData?.length]);

  const advancedStats = useMemo(() => {
    if (validStudyWords?.length === 0) return null;
    return getAdvancedStats(validStudyWords);
  }, [validStudyWords]);

  // Combine stats with safe defaults
  const stats = useMemo<VocabularyStats>(
    () => ({
      ...baseStats,
      ...(advancedStats ?? {
        successRate: 0,
        averageInterval: 0,
        averageEaseFactor: 0,
        masteredWords: 0,
        learningWords: 0,
        streak: 0,
        longestSuccessStreak: 0,
        wordsWithStreaks: 0,
        averageLapses: 0,
        failedInSessionCount: 0,
        averageDifficulty: 0.3,
      }),
    }),
    [baseStats, advancedStats]
  );

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
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.tint]}
              tintColor={colors.tint}
              progressBackgroundColor={colors.background}
            />
          }
          contentContainerStyle={[styles.contentContainer, { paddingTop: getHeaderHeight(insets) }]}
          showsVerticalScrollIndicator={false}
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
              <ThemedButton
                title={`Review ${stats.dueWords} ${stats.dueWords === 1 ? 'Word' : 'Words'}`}
                onPress={handleStartReview}
                variant="filled"
                style={styles.reviewButton}
                accessibilityLabel={`Review ${stats.dueWords} words`}
              />
            </View>
          ) : (
            <View style={styles.reviewButtonWrapper}>
              <ThemedButton
                title="No words due"
                onPress={() => {}}
                variant="outlined"
                style={styles.reviewButton}
                disabled
                accessibilityLabel="No words due"
              />
            </View>
          )}
        </ScrollView>
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
  reviewButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    width: '100%',
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    ...LAYOUT.SHADOW.SMALL,
  },
});
