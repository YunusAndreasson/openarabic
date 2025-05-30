import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useCallback, useMemo, JSX } from 'react';
import { StyleSheet, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { VocabularyStatCards } from '@/components/vocabulary/VocabularyStatCards';
import { LAYOUT } from '@/constants/layout';
import { useScreenFocusRefresh, useNavigationWithDebounce } from '@/hooks';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { useVocabularyStats } from '@/hooks/useVocabularyStats';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import type { StatCategory } from '@/types/vocabulary.types';
import { mediumFeedback } from '@/utils/haptics';
import BottomControls from '@/components/BottomControls';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

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
  const { stats, validStudyWords } = useVocabularyStats(studyWords ?? [], dueWordsData ?? []);

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

  // Handler for pull-to-refresh with optimized invalidation
  const handleRefresh = useCallback(async () => {
    if (!user || isFetching) return;

    mediumFeedback();
    setIsRefreshing(true);
    try {
      await invalidateVocabularyQueries();
    } finally {
      setIsRefreshing(false);
    }
  }, [user, isFetching, invalidateVocabularyQueries]);

  // Check if data is already in cache to optimize loading behavior
  const isDataCached = useMemo(() => {
    return !!(user?.id && queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id)));
  }, [user?.id, queryClient]);

  // Handle starting a review with optimized invalidation
  const handleStartReview = useCallback(() => {
    if (!user) return;
    navigateTo({
      pathname: '/review',
      params: { fromVocabulary: 'true' },
    });
  }, [user, navigateTo]);

  // Handle starting a listen session
  const handleStartListen = useCallback(() => {
    if (!user) return;
    navigateTo({
      pathname: '/listen',
      params: { fromVocabulary: 'true' },
    });
  }, [user, navigateTo]);

  // Handle stat press events with proper typing
  const handleStatPress = useCallback(
    (category: StatCategory) => {
      navigateTo({
        pathname: '/wordList',
        params: { category },
      });
    },
    [navigateTo]
  );

  // Show error message if there was an error loading data
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorMessage />
      </ThemedView>
    );
  }

  // Show subtle loading indicator when fetching data
  const showLoadingIndicator = (isDataLoading || isFetching) && !isDataCached;

  // Main content with fadeInStyle applied to match other tabs
  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="Vocabulary screen"
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
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtle loading indicator */}
        {showLoadingIndicator && (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.tint} />
          </ThemedView>
        )}

        {/* PRIMARY SECTION: Learning Overview */}
        <VocabularyStatCards
          masteredWords={stats.masteredWords}
          learningWords={stats.learningWords}
          dueWords={stats.dueWords}
          studyWords={validStudyWords}
          onStatPress={handleStatPress}
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
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.TINY,
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH, // Subtle loading indicator
  },
});
