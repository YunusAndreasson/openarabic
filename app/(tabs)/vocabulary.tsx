import React, { useState } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/vocabulary/VocabularyGraph';
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard';
import { VocabularyEmptyState } from '@/components/vocabulary/VocabularyEmptyState';
import { SignInRequired } from '@/components/SignInRequired';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
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
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { useVocabularyStats } from '@/hooks/useVocabularyStats';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';

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
        const hasStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id));
        if (!hasStudyWords) {
          prefetchVocabularyData();
        }
      }
    }, [user?.id, prefetchVocabularyData, queryClient])
  );

  // Also try to load data on first mount, not just on focus
  React.useEffect(() => {
    if (user?.id) {
      const hasStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id));
      if (!hasStudyWords) {
        prefetchVocabularyData();
      }
    }
  }, [user?.id, prefetchVocabularyData, queryClient]);

  // Use the FSRS queries hook for data fetching
  const {
    allWords: studyWords,
    dueWords: dueWordsData,
    isLoading: isDataLoading,
    isFetching,
    error,
    invalidateAllQueries,
  } = useFSRSQueries({
    userId: user?.id,
  });

  // Use the vocabulary stats hook for stats calculations
  const { stats, weeklyProgressData, validStudyWords } = useVocabularyStats(
    studyWords ?? [],
    dueWordsData ?? []
  );

  // Handler for pull-to-refresh
  const handleRefresh = async () => {
    if (!user || isFetching) return; // Prevent multiple refreshes

    // Provide haptic feedback when refreshing
    mediumFeedback();

    setIsRefreshing(true);
    try {
      await invalidateAllQueries();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Use the screen focus refresh hook with debounce - with proper caching
  useScreenFocusRefresh(
    queryClient,
    FSRS_QUERY_KEYS.due(user?.id ?? '')[0],
    user?.id,
    120000, // Cache for 2 minutes (same as query)
    true, // Skip initial focus
    false // Only refresh if stale
  );

  useScreenFocusRefresh(
    queryClient,
    FSRS_QUERY_KEYS.all(user?.id ?? '')[0],
    user?.id,
    180000, // Cache for 3 minutes (same as query)
    true, // Skip initial focus
    false // Only refresh if stale
  );

  // Check if data is ready to display with loading protection
  const isDataReady = React.useMemo(() => {
    // If we have cached data, consider it ready immediately
    const hasCachedData =
      user?.id && queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id)) !== undefined;
    if (hasCachedData) return true;

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
  React.useEffect(() => {
    // Always stop loading immediately - never show the loading screen
    stopLoading();
  }, [stopLoading]);

  // Handle starting a review
  const handleStartReview = () => {
    if (!user) return;

    // Always refresh data when navigating to review screen
    invalidateAllQueries();

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
  const isDataCached =
    user?.id && queryClient.getQueryState(FSRS_QUERY_KEYS.all(user.id))?.data !== undefined;

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
  if (!isFetching && !isDataLoading && validStudyWords.length === 0 && studyWords?.length === 0) {
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
