import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, RefreshControl, ScrollView } from 'react-native';
import type { ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import type { AnimatedStyleProp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LoadingScreen } from '@/components/Loader';
import PageHeader from '@/components/PageHeader';
import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { VocabularyDashboard } from '@/components/vocabulary/VocabularyDashboard';
import { VocabularyEmptyState } from '@/components/vocabulary/VocabularyEmptyState';
import { VocabularyGraph } from '@/components/vocabulary/VocabularyGraph';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { useScreenFocusRefresh, useNavigationWithDebounce } from '@/hooks';
import { useScreenAnimation } from '@/hooks/animations';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { useVocabularyStats } from '@/hooks/useVocabularyStats';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import { mediumFeedback } from '@/utils/haptics';

type StatCategory = 'total' | 'mastered' | 'learning' | 'due';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
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

  // Check if data is ready to display with loading protection
  const isDataReady = useMemo(() => {
    if (!user?.id) return false;

    // Consider data ready only when we have a definitive state
    if (isDataLoading) return false;
    if (isFetching && !isDataCached) return false;

    return true;
  }, [user?.id, isDataLoading, isFetching, isDataCached]);

  // Determine if we should show empty state
  const shouldShowEmptyState = useMemo(() => {
    // Only show empty state when we have definitive data
    if (isDataLoading || (isFetching && !isDataCached)) return false;

    // Check both studyWords and validStudyWords to ensure consistency
    return (
      (!studyWords || studyWords.length === 0) && (!validStudyWords || validStudyWords.length === 0)
    );
  }, [isDataLoading, isFetching, isDataCached, studyWords, validStudyWords]);

  // Add screen animation hook to match other tab screens
  const { fadeInStyle } = useScreenAnimation(isDataReady, isRefreshing) as {
    fadeInStyle: AnimatedStyleProp<ViewStyle>;
  };

  // Handle starting a review with optimized invalidation
  const handleStartReview = () => {
    if (!user) return;
    invalidateVocabularyQueries();
    navigateTo({
      pathname: '/review',
      params: { fromVocabulary: 'true' },
    });
  };

  // Handle stat press events with proper typing
  const handleStatPress = (category: StatCategory) => {
    navigateTo({
      pathname: '/wordList',
      params: { category },
    });
  };

  // Show loading screen only during initial uncached load
  if (!isDataCached && isDataLoading && !isRefreshing) {
    return <LoadingScreen />;
  }

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
      <Animated.View style={[styles.flexContainer, fadeInStyle]} collapsable={false}>
        <ThemedView style={styles.container}>
          <PageHeader title="Words" />
          <ThemedView style={styles.emptyStateContainer}>
            <VocabularyEmptyState colors={colors} />
          </ThemedView>
        </ThemedView>
      </Animated.View>
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
            onStatPress={handleStatPress}
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
              {stats.dueWords > 150 ? (
                <ThemedText type="label" variant="warning" style={styles.warningText}>
                  You are reviewing many words. Please catch up before adding more.
                </ThemedText>
              ) : null}
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
  contentContainer: {
    paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  emptyStateContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  flexContainer: {
    flex: 1,
  },
  reviewButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    width: '100%',
    ...LAYOUT.SHADOW.SMALL,
  },
  reviewButtonWrapper: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  warningText: {
    marginTop: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
});
