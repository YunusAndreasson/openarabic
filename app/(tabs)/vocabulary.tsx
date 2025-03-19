import React, { useMemo, useState } from 'react';
import { StyleSheet, View, RefreshControl, ViewStyle } from 'react-native';
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
import { LoadingScreen } from '@/components/Loader';
import { VocabularyStats, WeeklyProgressData } from '@/types/vocabulary.types';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { calculateVocabularyStats, calculateWeeklyProgressData } from '@/utils/vocabularyStats';
import { useScreenFocusRefresh, useNavigationWithDebounce } from '@/hooks';
import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';
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

  // Add state for refresh control
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Query for study words
  const {
    data: studyWords = [],
    isLoading: isDataLoading,
    isFetching,
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

  // Single fade-in animation for the entire screen
  const { animatedStyle: fadeInStyle } = useOpacityAnimation({
    initialOpacity: 0,
    duration: 300,
    autoStart: true,
  });

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

  // Show loading screen only for initial auth loading
  if (isAuthLoading) {
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
  if (!isFetching && validStudyWords.length === 0 && !isDataCached) {
    return (
      <ThemedView style={styles.container}>
        <VocabularyEmptyState colors={colors} />
      </ThemedView>
    );
  }

  // Main content
  return (
    <Animated.View style={[styles.flexContainer, fadeInStyle as ViewStyle]} collapsable={false}>
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
          }}
        >
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
  graphWrapper: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    overflow: 'hidden',
    marginBottom: LAYOUT.SPACING.LARGE,
    height: 250,
  },
  reviewButtonWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  dashboardWrapper: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
});
