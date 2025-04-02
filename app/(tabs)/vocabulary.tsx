import React, { useState } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { VocabularyGraph } from '@/components/vocabulary/VocabularyGraph';
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard';
import { VocabularyEmptyState } from '@/components/vocabulary/VocabularyEmptyState';
import { UnifiedSignInScreen } from '@/components/UnifiedSignInScreen';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useQueryClient } from '@tanstack/react-query';
import Animated from 'react-native-reanimated';
import { useScreenFocusRefresh, useNavigationWithDebounce } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import PageHeader from '@/components/PageHeader';
import { ThemedButton } from '@/components/ThemedButton';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { mediumFeedback } from '@/utils/haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useFocusEffect } from '@react-navigation/native';
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

  // Add state for refresh control
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Combine focus effects for better performance
  useFocusEffect(
    React.useCallback(() => {
      if (!user?.id) return;

      const hasStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id));
      const hasDueWords = queryClient.getQueryData(FSRS_QUERY_KEYS.due(user.id));

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        prefetchVocabularyData();
      }
    }, [user?.id, prefetchVocabularyData, queryClient])
  );

  // Use the FSRS queries hook for data fetching
  const {
    allWords: studyWords,
    dueWords: dueWordsData,
    isLoading: isDataLoading,
    isFetching,
    error,
  } = useFSRSQueries({
    userId: user?.id,
  });

  // Use the vocabulary stats hook for stats calculations
  const { stats, weeklyProgressData, validStudyWords } = useVocabularyStats(
    studyWords ?? [],
    dueWordsData ?? []
  );

  // Combine query invalidation into a single function
  const invalidateVocabularyQueries = React.useCallback(async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({
      predicate: query => {
        const key = query.queryKey[0];
        return key === FSRS_QUERY_KEYS.due(user.id)[0] || key === FSRS_QUERY_KEYS.all(user.id)[0];
      },
    });
  }, [user?.id, queryClient]);

  // Use single screen focus refresh with optimized invalidation
  useScreenFocusRefresh(
    queryClient,
    'vocabulary',
    user?.id,
    300000, // Cache for 5 minutes
    true // Skip initial focus
  );

  // Invalidate queries on focus with optimized function
  useFocusEffect(
    React.useCallback(() => {
      invalidateVocabularyQueries();
    }, [invalidateVocabularyQueries])
  );

  // Handler for pull-to-refresh with optimized invalidation
  const handleRefresh = async () => {
    if (!user || isFetching) return;

    mediumFeedback();
    setIsRefreshing(true);
    try {
      await invalidateVocabularyQueries();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if data is ready to display with loading protection
  const isDataReady = React.useMemo(() => {
    if (!user?.id) return false;
    // Check cache first for instant feedback
    const hasCachedData = queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id));
    if (hasCachedData) return true;
    // Only check loading states if no cached data
    return !isAuthLoading && !isDataLoading && validStudyWords.length > 0;
  }, [user?.id, validStudyWords.length, isAuthLoading, isDataLoading, queryClient]);

  // Add screen animation hook to match other tab screens
  const { fadeInStyle } = useScreenAnimation(isDataReady, isRefreshing);

  // Handle starting a review with optimized invalidation
  const handleStartReview = () => {
    if (!user) return;
    invalidateVocabularyQueries();
    navigateTo({
      pathname: '/review',
      params: { fromVocabulary: 'true' },
    });
  };

  // Handle stat press events
  const handleStatPress = (category: 'total' | 'mastered' | 'learning' | 'due') => {
    navigateTo({
      pathname: '/wordList',
      params: { category },
    });
  };

  // Check if data is already in cache to optimize loading behavior
  const isDataCached = user?.id && queryClient.getQueryState(FSRS_QUERY_KEYS.all(user.id))?.data;

  // Show loading screen only during initial uncached load
  if (!isDataCached && isDataLoading && !isRefreshing) {
    return <LoadingScreen />;
  }

  // Show sign-in message if not authenticated
  if (!user) {
    return <UnifiedSignInScreen headerTitle="Words" colors={colors} />;
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
