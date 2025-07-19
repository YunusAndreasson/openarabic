import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo } from 'react';
import { ActivityIndicator, InteractionManager, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import EmptyState from '@/components/EmptyState';
import { ThemedView } from '@/components/ThemedView';
import ErrorMessage from '@/components/vocabulary/ErrorMessage';
import { VocabularyStatCards } from '@/components/vocabulary/VocabularyStatCards';
import { FSRS_QUERY_KEYS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { getPracticeReviewRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StatCategory } from '@/types/vocabulary.types';

export default function VocabularyScreen(): JSX.Element {
  const { user } = useAuth();
  const colors = useColors();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { prefetchVocabularyData } = useAppPreloader();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();

  // Combine focus effects for better performance
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      const hasStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id));
      const hasDueWords = queryClient.getQueryData(FSRS_QUERY_KEYS.due(user.id));

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        InteractionManager.runAfterInteractions(() => {
          prefetchVocabularyData();
        });
      }
    }, [user?.id, prefetchVocabularyData, queryClient])
  );

  // Use the FSRS queries hook for data fetching
  const {
    allWords: studyWords, // We need all words for memory capacity gauge
    dueWords: dueWordsData,
    isLoading: isDataLoading,
    isFetching,
    error,
  } = useFSRSQueries({
    userId: user?.id,
  });

  // Handle starting review based on category type
  const handleStartReview = useCallback(
    (category: StatCategory) => {
      if (!user) return;

      switch (category) {
        case 'due':
          // Practice only due words (no fromRemember parameter)
          router.push(getPracticeReviewRoute());
          break;
        case 'needsAttention':
          // Practice challenging/struggling words
          router.push(getPracticeReviewRoute({ mode: 'spaced' }));
          break;
        case 'total':
          // Practice all words (using fromRemember for all words)
          router.push(getPracticeReviewRoute({ fromRemember: 'true' }));
          break;
        default:
          // Default to due words
          router.push(getPracticeReviewRoute());
          break;
      }
    },
    [user, router]
  );

  // Fix: Use the actual due words data count instead of database view
  // This ensures consistency between display and practice session
  const dueWordsCount = dueWordsData?.length ?? 0;

  // Filter study words for memory capacity gauge (needs all words, not just due)
  const filteredStudyWords = studyWords?.filter(word => word != null && word.root_id != null) ?? [];

  // FIXED: Calculate learning and mastered words from actual data instead of database view
  // This ensures consistency between display and session logic for all word types
  const calculatedStats = useMemo(() => {
    if (!filteredStudyWords.length) {
      return { learningWords: 0, masteredWords: 0 };
    }

    // Use same logic as VocabularyStatCards and server-side filters
    const learningWords = filteredStudyWords.filter(word => {
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      return state === 0 || state === 1 || state === 3 || (state === 2 && stability < 5);
    }).length;

    const masteredWords = filteredStudyWords.filter(word => {
      const state = word.fsrs_state;
      const stability = word.fsrs_stability ?? 0;
      return state === 2 && stability >= 5;
    }).length;

    return { learningWords, masteredWords };
  }, [filteredStudyWords]);

  // Memoize EmptyState container style to prevent object recreation
  const emptyStateContainerStyle = useMemo(
    () => ({
      paddingTop: LAYOUT.SPACING.XLARGE + LAYOUT.SPACING.MEDIUM,
      paddingBottom: LAYOUT.SPACING.LARGE,
    }),
    []
  );

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
  const showLoadingIndicator = (isDataLoading || isFetching) && !isDataCached;

  // Check if we should show empty state (no study words available)
  // Only show empty state when we're not loading AND we have no words
  const shouldShowEmpty = !isDataLoading && !isFetching && filteredStudyWords.length === 0;

  // Check if we should show the main content (vocabulary stat cards)
  // Only show when we're not loading AND we have words OR when we're still loading with cached data
  const shouldShowMainContent =
    (!isDataLoading && !isFetching && filteredStudyWords.length > 0) ||
    ((isDataLoading || isFetching) && isDataCached && filteredStudyWords.length > 0);

  // Main content
  return (
    <ThemedView
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
      >
        {/* Subtle loading indicator */}
        {showLoadingIndicator && (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator color={colors.tint} size="small" />
          </ThemedView>
        )}

        {/* Empty state when no study words */}
        {shouldShowEmpty && (
          <EmptyState
            colors={colors}
            description={STRINGS.STUDY_LIST_EMPTY_DESCRIPTION}
            icon="school-outline"
            iconSize={LAYOUT.REVIEW.COMPLETION.ICON_DEFAULT_SIZE}
            title={STRINGS.STUDY_LIST_EMPTY_TITLE}
            containerStyle={emptyStateContainerStyle}
          />
        )}

        {/* PRIMARY SECTION: Learning Overview */}
        {shouldShowMainContent && (
          <View style={{ marginTop: LAYOUT.SPACING.MEDIUM }}>
            <VocabularyStatCards
              dueWords={dueWordsCount}
              learningWords={calculatedStats.learningWords}
              masteredWords={calculatedStats.masteredWords}
              studyWords={filteredStudyWords} // Use all study words for memory capacity gauge
              onStartReview={handleStartReview}
            />
          </View>
        )}
      </ScrollView>
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
