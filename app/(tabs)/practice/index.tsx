import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { ActivityIndicator, InteractionManager, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import EmptyState from '@/components/common/EmptyState';
import ErrorMessage from '@/components/practice/ErrorMessage';
import { VocabularyStatCards } from '@/components/practice/VocabularyStatCards';
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

  // Add ref to prevent infinite re-renders
  const hasPrefetchedRef = useRef(false);

  // Combine focus effects for better performance
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      // Prevent multiple prefetch calls
      if (hasPrefetchedRef.current) return;

      const hasStudyWords = queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id));
      const hasDueWords = queryClient.getQueryData(FSRS_QUERY_KEYS.due(user.id));

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        hasPrefetchedRef.current = true;
        InteractionManager.runAfterInteractions(() => {
          prefetchVocabularyData();
          // Ensure due words are fresh when screen gains focus
          queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
        });
      } else {
        // Mark as prefetched even if data exists to prevent future calls
        hasPrefetchedRef.current = true;
        // Still force a lightweight refresh of due counts to avoid stale UI after app restarts
        queryClient.refetchQueries({ queryKey: FSRS_QUERY_KEYS.due(user.id) });
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
        case 'struggling': {
          // Practice challenging/struggling words
          const route = getPracticeReviewRoute({ mode: 'spaced' });
          router.push(route);
          break;
        }
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
  const filteredStudyWords = useMemo(() => {
    return studyWords?.filter(word => word != null && word.root_id != null) ?? [];
  }, [studyWords]);

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

  //

  // Show error message if there was an error loading data
  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ErrorMessage />
      </ThemedView>
    );
  }

  // Check if data is cached and derive simple UI state flags
  const isDataCached = !!(user?.id && queryClient.getQueryData(FSRS_QUERY_KEYS.all(user.id)));
  const isLoadingState = isDataLoading || isFetching;
  const hasWords = filteredStudyWords.length > 0;
  const showLoadingIndicator = isLoadingState && !isDataCached;

  // Show an empty state when there are no study words

  // Determine when to show the main content (vocabulary stat cards)
  const shouldShowMainContent = hasWords && (!isLoadingState || (isLoadingState && isDataCached));

  // Main content
  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        scrollable={true}
        useSafeArea={false}
        includeBottomInset={false}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.TINY,
          },
        ]}
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
          contentInsetAdjustmentBehavior: 'never' as const,
        }}
      >
        {/* Subtle loading indicator */}
        {showLoadingIndicator && (
          <ThemedView style={styles.loadingContainer}>
            <ActivityIndicator color={colors.tint} size="small" />
          </ThemedView>
        )}

        {/* Empty state when no study words */}
        {!showLoadingIndicator && filteredStudyWords.length === 0 && (
          <EmptyState
            colors={{ tint: colors.tint }}
            title={STRINGS.STUDY_LIST_EMPTY_TITLE}
            description={STRINGS.STUDY_LIST_EMPTY_DESCRIPTION}
            icon="school"
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
      </ThemedView>
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
