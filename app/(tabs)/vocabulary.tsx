import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import React, { useState, useCallback, JSX } from 'react';
import { StyleSheet, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomControls from '@/components/BottomControls';
import { ThemedView } from '@/components/ThemedView';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { VocabularyStatCards } from '@/components/vocabulary/VocabularyStatCards';
import { LAYOUT } from '@/constants/layout';
import { useScreenFocusRefresh, useNavigationWithDebounce } from '@/hooks';
import { useAppPreloader } from '@/hooks/useAppPreloader';
import { useAuth } from '@/hooks/useAuth';
import { useColors } from '@/hooks/useColors';
import { useFSRSQueries } from '@/hooks/useFSRSQueries';
import { useVocabularyChartData } from '@/hooks/useVocabularyChartData';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import type { StatCategory } from '@/types/vocabulary.types';
import { mediumFeedback } from '@/utils/haptics';
import { isStrugglingWord } from '@/utils/wordClassification';

import SessionOptionsModal from '../../components/vocabulary/SessionOptionsModal';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // Add state for refresh control and session options modal
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSessionOptions, setShowSessionOptions] = useState(false);

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

  // Use the optimized vocabulary chart data hook that uses database views
  const { userStats, isLoadingUserStats } = useVocabularyChartData(user?.id);

  // Use single screen focus refresh with optimized invalidation
  useScreenFocusRefresh(
    queryClient,
    'fsrs-words',
    user?.id,
    300000, // Cache for 5 minutes
    true // Skip initial focus
  );

  // Handler for pull-to-refresh
  const handleRefresh = async () => {
    if (!user || isFetching) return;

    mediumFeedback();
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({
        predicate: query => {
          const key = query.queryKey[0];
          return (
            key === FSRS_QUERY_KEYS.due(user.id)[0] ||
            key === FSRS_QUERY_KEYS.all(user.id)[0] ||
            (typeof key === 'string' && key.includes('vocabulary-stats'))
          );
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle starting a review
  const handleStartReview = () => {
    if (!user) return;
    navigateTo({
      pathname: '/review',
      params: { fromRemember: 'true' },
    });
  };

  // Handle starting a listen session
  const handleStartListen = () => {
    if (!user) return;
    navigateTo({
      pathname: '/listen',
      params: { fromRemember: 'true' },
    });
  };

  // Handle stat press events
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

  // Check if data is cached and show loading indicator
  const isDataCached = !!(user?.id && queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id)));
  const showLoadingIndicator = (isDataLoading || isFetching || isLoadingUserStats) && !isDataCached;

  // Get stats from database views or fallback to FSRS data
  const stats = {
    masteredWords: userStats?.masteredWords ?? 0,
    learningWords: userStats?.learningWords ?? 0,
    dueWords: userStats?.dueWords ?? dueWordsData?.length ?? 0,
  };

  // Filter valid study words for components that still need them
  const validStudyWords = studyWords?.filter(word => word != null && word.root_id != null) ?? [];

  // Main content
  return (
    <ThemedView
      style={styles.container}
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      accessibilityLabel="Remember screen"
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
            paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.XXLARGE * 2,
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
        primaryLabel="Start Session"
        onPrimaryPress={() => setShowSessionOptions(true)}
        primaryVariant="filled"
        primaryDisabled={false}
        primaryAccessibilityLabel="Start learning session - choose practice or listen mode"
      />

      {/* Session Options Modal */}
      <SessionOptionsModal
        visible={showSessionOptions}
        onClose={() => setShowSessionOptions(false)}
        dueWordsCount={stats.dueWords}
        strugglingWordsCount={validStudyWords.filter(word => isStrugglingWord(word)).length}
        onStartPractice={(wordType: 'due' | 'struggling') => {
          if (wordType === 'due') {
            handleStartReview();
          } else {
            // Navigate to review with struggling words filter
            navigateTo({
              pathname: '/review',
              params: { fromRemember: 'true' },
            });
          }
        }}
        onStartListen={(wordType: 'due' | 'struggling') => {
          if (wordType === 'due') {
            handleStartListen();
          } else {
            // Navigate to listen with struggling words filter
            navigateTo({
              pathname: '/listen',
              params: { fromRemember: 'true' },
            });
          }
        }}
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
    marginBottom: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH,
    paddingVertical: LAYOUT.SPACING.TINY, // Subtle loading indicator
  },
});
