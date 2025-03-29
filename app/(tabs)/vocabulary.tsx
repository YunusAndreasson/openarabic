import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/vocabulary/VocabularyGraph';
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard';
import { VocabularyEmptyState } from '@/components/vocabulary/VocabularyEmptyState';
import { SignInRequired } from '@/components/SignInRequired';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import { useColors } from '@/hooks/useColors';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { VocabularyStats, WeeklyProgressData, StudyWord } from '@/types/vocabulary.types';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { calculateWeeklyProgressData } from '@/utils/vocabularyStats';
import { useScreenFocusRefresh, useNavigationWithDebounce, useLoadingState } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import PageHeader from '@/components/PageHeader';
import { ThemedButton } from '@/components/ThemedButton';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { mediumFeedback } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { LoadingScreen } from '@/components/Loader';

// Split stats calculation into smaller chunks for better memoization
const getBaseStats = (validStudyWords: StudyWord[], dueWordsData: StudyWord[]) => {
  const stats = validStudyWords.reduce(
    (acc, word) => {
      // Count new words
      if (!word.fsrs_last_review) {
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

const getAdvancedStats = (validStudyWords: StudyWord[]) => {
  if (validStudyWords.length === 0) return null;

  // Single pass for all stats
  const stats = validStudyWords.reduce(
    (acc, word) => {
      // Track reviewed words stats
      if (word.fsrs_last_review) {
        acc.reviewedCount++;
        // Calculate success_rate from success_streak if available
        const successRate = word.success_streak ? word.success_streak / (word.fsrs_reps || 1) : 0;
        acc.successRateSum += successRate;
        acc.intervalSum += word.interval_days || 0;
        acc.easeFactorSum += word.ease_factor || 0;
      }

      // Track mastery stats - use fsrs_state instead of 'state'
      if (word.fsrs_state === 3) acc.masteredCount++; // Assuming state 3 is 'mastered'
      if (word.fsrs_state === 1 || word.fsrs_state === 2) acc.learningCount++; // Assuming states 1-2 are 'learning'

      // Track streaks and difficulty
      acc.maxStreak = Math.max(acc.maxStreak, word.success_streak || 0);
      acc.maxLongestStreak = Math.max(acc.maxLongestStreak, word.success_streak || 0);
      if ((word.success_streak || 0) > 0) acc.streakCount++;

      // Track other stats
      acc.lapsesSum += word.fsrs_lapses || 0;
      if (word.sessionData?.failedInSession) acc.failedInSession++;
      acc.difficultySum += word.fsrs_difficulty || 0.3;

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
  const { prefetchVocabularyData } = useAppPreloader();
  const router = useRouter();

  // Add loading state hook to match other tab screens - initialize with NOT loading
  const { isLoading: isLoadingState, stopLoading } = useLoadingState(false);

  // Add state for refresh control
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Use prefetchVocabularyData to load data with better error handling on screen focus
  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        // Only fetch if we don't have data already
        const hasStudyWords = queryClient.getQueryData(['studyWords', user?.id]);
        if (!hasStudyWords) {
          prefetchVocabularyData();
        }
      }
    }, [user?.id, prefetchVocabularyData, queryClient])
  );

  // Query for study words - updated to use FSRS service with longer stale time
  const {
    data: studyWords = [] as StudyWord[],
    isLoading: isStudyWordsLoading,
    isFetching: isStudyWordsFetching,
    error,
    refetch: refetchStudyWords,
  } = useQuery({
    queryKey: ['studyWords', user?.id],
    queryFn: () => studyWordsFSRSService.getFSRSWords(user!.id, { forStats: false }),
    enabled: !!user,
    staleTime: 180000, // Cache for 3 minutes
    gcTime: 600000, // Keep in cache for 10 minutes
    retry: 2, // Add retry capability
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount when we have data
    placeholderData: () =>
      queryClient.getQueryData(['studyWords', user?.id]) || ([] as StudyWord[]),
  });

  // Query for due words with optimized settings
  const {
    data: dueWordsData = [] as StudyWord[],
    isFetching: isDueWordsFetching,
    refetch: refetchDueWords,
  } = useQuery({
    queryKey: ['dueWords', user?.id],
    queryFn: () => studyWordsFSRSService.getFSRSWords(user!.id, { onlyDue: true }),
    enabled: !!user,
    staleTime: 120000, // Cache for 2 minutes (due words change more frequently)
    gcTime: 300000, // Keep in cache for 5 minutes
    retry: 2, // Add retry capability
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount when we have data
    placeholderData: () => queryClient.getQueryData(['dueWords', user?.id]) || ([] as StudyWord[]),
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

  // Use the screen focus refresh hook with debounce - with proper caching
  useScreenFocusRefresh(
    queryClient,
    'dueWords',
    user?.id,
    120000, // Cache for 2 minutes (same as query)
    true, // Skip initial focus
    false // Only refresh if stale
  );

  useScreenFocusRefresh(
    queryClient,
    'studyWords',
    user?.id,
    180000, // Cache for 3 minutes (same as query)
    true, // Skip initial focus
    false // Only refresh if stale
  );

  // Filter valid study words with error protection
  const validStudyWords = useMemo(() => {
    if (!Array.isArray(studyWords)) return [] as StudyWord[];
    return studyWords.filter(word => word?.sentence_word != null) as StudyWord[];
  }, [studyWords]);

  // Check if data is ready to display with loading protection
  const isDataReady = useMemo(() => {
    // If we have cached data, consider it ready immediately
    if (queryClient.getQueryData(['studyWords', user?.id])) return true;

    // Otherwise check loading states
    if (isAuthLoading || isDataLoading) return false;
    return !!user && (validStudyWords.length > 0 || error !== null);
  }, [user, validStudyWords.length, error, isAuthLoading, isDataLoading, queryClient]);

  // Add screen animation hook to match other tab screens
  const { fadeInStyle } = useScreenAnimation(
    isDataReady,
    isLoadingState,
    0, // Set animation duration to 0
    0, // Set layout delay to 0
    0 // Set animation delay to 0
  );

  // Update loading state based on data loading - always bypass loading screen
  useEffect(() => {
    // Always stop loading immediately - never show the loading screen
    stopLoading();
  }, [stopLoading]);

  // Split stats calculation into smaller memoized chunks - optimized with calculation key
  const baseStats = useMemo(() => {
    if (validStudyWords?.length === 0 && studyWords?.length === 0) {
      return {
        totalWords: 0,
        dueWords: dueWordsData?.length ?? 0,
        newWordsCount: 0,
      };
    }
    return getBaseStats(validStudyWords ?? [], dueWordsData ?? []);
  }, [dueWordsData, studyWords?.length, validStudyWords]); // Only recalculate when key changes

  const advancedStats = useMemo(() => {
    if (validStudyWords?.length === 0) return null;
    return getAdvancedStats(validStudyWords);
  }, [validStudyWords]); // Only recalculate when key changes

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

    // Always refresh data when navigating to review screen

    // Always refetch due words immediately
    queryClient.invalidateQueries({
      queryKey: ['dueWords', user.id],
    });

    // Always refetch study words immediately
    queryClient.invalidateQueries({
      queryKey: ['studyWords', user.id],
    });

    // Prefetch review data with longer cache time
    queryClient.prefetchQuery({
      queryKey: ['dueWords', user.id, 'review'],
      queryFn: () => studyWordsFSRSService.getFSRSWords(user.id, { onlyDue: true }),
      staleTime: 0, // No caching
      gcTime: 0, // No cache retention
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

  // Check if data is already in cache to optimize loading behavior
  const studyWordsQuery = queryClient.getQueryState(['studyWords', user?.id]);
  const isDataCached = studyWordsQuery?.data !== undefined;

  // Show loading screen during initial load or refresh
  if ((isDataLoading && !isDataCached) || isRefreshing) {
    return <LoadingScreen />;
  }

  // Show sign-in message if not authenticated
  if (!user) {
    return (
      <SignInRequired
        message="Sign in to track your vocabulary progress and create custom study sets"
        benefitTitle="Vocabulary Benefits"
        benefitDescription="Sign in to save your word progress across devices, create study sets, and track your learning progress"
        colors={colors}
        onSignIn={() => router.navigate('/(tabs)/settings')}
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
