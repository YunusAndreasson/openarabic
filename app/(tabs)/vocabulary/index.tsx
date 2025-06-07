import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import React, { useState, useCallback } from 'react';
import { StyleSheet, RefreshControl, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import BottomControls from '@/components/BottomControls';
import { ThemedView } from '@/components/ThemedView';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import SessionOptionsModal from '@/components/vocabulary/SessionOptionsModal';
import { VocabularyStatCards } from '@/components/vocabulary/VocabularyStatCards';
import { LAYOUT } from '@/constants/layout';
import { useNavigationWithDebounce } from '@/hooks';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useVocabularyChartData } from '@/hooks/vocabulary/useVocabularyChartData';
import { FSRS_QUERY_KEYS } from '@/services/studyWordsFSRS';
import type { StatCategory } from '@/types/vocabulary.types';
import { mediumFeedback } from '@/utils/haptics';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
      pathname: '/vocabulary/review',
      params: { fromRemember: 'true' },
    });
  };

  // Handle starting a listen session
  const handleStartListen = () => {
    if (!user) return;
    router.push('/vocabulary/practice?fromRemember=true');
  };

  // Handle stat press events
  const handleStatPress = (category: StatCategory) => {
    navigateTo({
      pathname: '/vocabulary/wordList',
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

  // Get stats - simplified for due words focus
  const dueWords = userStats?.dueWords ?? dueWordsData?.length ?? 0;
  const hasWordsToStudy = dueWords > 0;

  // Smart button labeling based on due words only
  const getButtonLabel = () => {
    if (!hasWordsToStudy) return 'All caught up';
    if (dueWords === 1) return 'Practice 1 word';
    if (dueWords <= 20) return `Practice ${dueWords} words`;
    return 'Start practice';
  };

  const getAccessibilityLabel = () => {
    if (!hasWordsToStudy) return 'No words to practice';
    return `Practice ${dueWords} words`;
  };

  // Main content
  return (
    <ThemedView
      accessibilityLabel="Vocabulary screen"
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
          },
        ]}
        refreshControl={
          <RefreshControl
            colors={[colors.tint]}
            progressBackgroundColor={colors.background}
            progressViewOffset={headerHeight + LAYOUT.SPACING.XXLARGE}
            refreshing={isRefreshing}
            tintColor={colors.tint}
            onRefresh={handleRefresh}
          />
        }
      >
        {/* Subtle loading indicator */}
        {showLoadingIndicator && (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator color={colors.tint} size="small" />
          </ThemedView>
        )}

        {/* PRIMARY SECTION: Learning Overview */}
        <VocabularyStatCards
          dueWords={dueWords}
          learningWords={userStats?.learningWords ?? 0}
          masteredWords={userStats?.masteredWords ?? 0}
          studyWords={studyWords?.filter(word => word != null && word.root_id != null) ?? []}
          onStatPress={handleStatPress}
        />
      </ScrollView>
      <BottomControls
        primaryAccessibilityLabel={getAccessibilityLabel()}
        primaryDisabled={!hasWordsToStudy}
        primaryLabel={getButtonLabel()}
        primaryVariant={hasWordsToStudy ? 'filled' : 'outlined'}
        onPrimaryPress={() => setShowSessionOptions(true)}
      />

      {/* Session Options Modal */}
      <SessionOptionsModal
        dueWordsCount={dueWords}
        visible={showSessionOptions}
        onClose={() => setShowSessionOptions(false)}
        onStartListen={handleStartListen}
        onStartReview={handleStartReview}
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
    opacity: LAYOUT.OPACITY.HIGH,
    paddingVertical: LAYOUT.SPACING.TINY, // Subtle loading indicator
  },
});
