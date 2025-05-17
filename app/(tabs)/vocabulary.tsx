import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useCallback, useMemo, JSX } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';

import EmptyState from '@/components/EmptyState';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard';
import { VocabularyGraph } from '@/components/vocabulary/VocabularyGraph';
import { LAYOUT } from '@/constants/layout';
import { useScreenFocusRefresh, useNavigationWithDebounce } from '@/hooks';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { useVocabularyStats } from '@/hooks/useVocabularyStats';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { mediumFeedback } from '@/utils/haptics';
import BottomControls from '@/components/BottomControls';
import { StreakCard } from '@/components/vocabulary/StreakCard';
import { useStreakData } from '@/hooks/useStreakData';

type StatCategory = 'total' | 'mastered' | 'learning' | 'due';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();
  const headerHeight = useHeaderHeight();

  // Add state for refresh control
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Use the navigation with debounce hook
  const { navigateTo } = useNavigationWithDebounce();

  // Combine focus effects for better performance
  useFocusEffect(
    useCallback(() => {
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

  // Get streak data using the new hook
  const streakData = useStreakData(user?.id);

  // Combine query invalidation into a single function
  const invalidateVocabularyQueries = useCallback(async () => {
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
    useCallback(() => {
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

  // Check if data is already in cache to optimize loading behavior
  const isDataCached = useMemo(() => {
    return !!(user?.id && queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id)));
  }, [user?.id, queryClient]);

  // Determine if we should show empty state
  const shouldShowEmptyState = useMemo(() => {
    // Only show empty state when we have definitive data
    if (isDataLoading || (isFetching && !isDataCached)) return false;

    // Check both studyWords and validStudyWords to ensure consistency
    return (
      (!studyWords || studyWords.length === 0) && (!validStudyWords || validStudyWords.length === 0)
    );
  }, [isDataLoading, isFetching, isDataCached, studyWords, validStudyWords]);

  // Handle starting a review with optimized invalidation
  const handleStartReview = () => {
    if (!user) return;
    navigateTo({
      pathname: '/review',
      params: { fromVocabulary: 'true' },
    });
  };

  // Handle starting a listen session
  const handleStartListen = () => {
    if (!user) return;
    navigateTo({
      pathname: '/listen',
    });
  };

  // Handle stat press events with proper typing
  const handleStatPress = (category: StatCategory) => {
    navigateTo({
      pathname: '/wordList',
      params: { category },
    });
  };

  // Show error message if there was an error loading data
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorMessage />
      </ThemedView>
    );
  }

  // Show empty state with animation
  if (shouldShowEmptyState) {
    return (
      <ThemedView
        style={styles.container}
        includeBottomInset={false}
        safeAreaEdges={['left', 'right']}
      >
        <ThemedView style={styles.emptyStateContainer}>
          <EmptyState
            title="Start Learning"
            description="Add words while reading to build your vocabulary"
            colors={colors}
            icon="book-outline"
          />
        </ThemedView>
      </ThemedView>
    );
  }

  // Main content with fadeInStyle applied to match other tabs
  return (
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
            progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
          />
        }
        contentContainerStyle={[styles.contentContainer, { paddingTop: headerHeight }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Dashboard */}
        <VocabularyDashboard
          totalWords={stats.totalWords}
          masteredWords={stats.masteredWords}
          learningWords={stats.learningWords}
          dueWords={stats.dueWords}
          onStatPress={handleStatPress}
        />

        {/* Streak Card */}
        <StreakCard
          currentStreak={streakData.currentStreak}
          longestStreak={streakData.longestStreak}
          lastSevenDaysActivity={streakData.lastSevenDaysActivity}
        />

        {/* Vocabulary Growth Graph */}
        <VocabularyGraph
          data={weeklyProgressData}
          animationTriggered={true}
          title="Vocabulary Progress"
        />
      </ScrollView>
      <BottomControls
        primaryLabel="Review"
        onPrimaryPress={stats.dueWords > 0 ? handleStartReview : () => {}}
        primaryVariant={stats.dueWords > 0 ? 'filled' : 'outlined'}
        primaryDisabled={stats.dueWords === 0}
        primaryAccessibilityLabel={
          stats.dueWords > 0 ? `Review ${stats.dueWords} words` : 'No words due'
        }
        secondaryLabel="Listen"
        onSecondaryPress={handleStartListen}
        secondaryVariant="outlined"
        secondaryDisabled={false}
        secondaryAccessibilityLabel="Listen to vocabulary words with audio"
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  emptyStateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
});
