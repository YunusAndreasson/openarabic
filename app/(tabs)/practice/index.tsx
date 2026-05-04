import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { InteractionManager, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { ErrorState, type GenericBottomSheetHandle } from '@/components/common';
import {
  DueWordsBottomSheet,
  MemoryRetentionBottomSheet,
  PracticeEmptyState,
  RecommendationCard,
  StudyStreakBottomSheet,
  PracticeStatCards,
  WordsMasteredBottomSheet,
} from '@/components/practice';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { fsrsQueries } from '@/constants/queries';
import { getPracticeReviewRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useStudyStreak } from '@/hooks/practice/useStudyStreak';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { FloatingActionButton } from '@/components/ui';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import { calculateWordCategories } from '@/utils/wordClassification';

export default function PracticeScreen(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();

  // Bottom sheet refs — imperative present()/dismiss() per @gorhom/bottom-sheet docs.
  // The previous state-based useEffect approach was unreliable: setActiveSheet(sameValue)
  // is a no-op so the effect didn't re-fire on repeat taps, and the modal could be
  // unmounted at the moment present() ran. Refs sidestep both issues entirely; the
  // library's `stackBehavior: 'replace'` already enforces the "only one open" rule.
  const memorySheetRef = useRef<GenericBottomSheetHandle>(null);
  const dueSheetRef = useRef<GenericBottomSheetHandle>(null);
  const streakSheetRef = useRef<GenericBottomSheetHandle>(null);
  const masteredSheetRef = useRef<GenericBottomSheetHandle>(null);

  // Fetch study streak data
  const { streak } = useStudyStreak();
  const currentStreak = streak?.currentStreak ?? 0;

  // Add ref to prevent infinite re-renders
  const hasPrefetchedRef = useRef(false);

  // Prefetch vocabulary data on first focus (deduped via ref)
  // Note: useReview.handleClose already invalidates queries when returning from review,
  // so we don't need to refetch here - React Query's staleTime handles freshness
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;

      // Prevent multiple prefetch calls
      if (hasPrefetchedRef.current) return;

      const hasStudyWords = queryClient.getQueryData(
        fsrsQueries.allWithCooldown(user.id, 1).queryKey,
      );
      const hasDueWords = queryClient.getQueryData(fsrsQueries.due(user.id).queryKey);

      hasPrefetchedRef.current = true;

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        InteractionManager.runAfterInteractions(() => {
          prefetchVocabularyData();
        });
      }
    }, [user?.id, prefetchVocabularyData, queryClient]),
  );

  // Use the FSRS queries hook for data fetching
  const { allWords, dueWords, error } = useFSRSQueries({
    userId: user?.id,
    limit: 100,
  });

  // Filter study words for memory capacity gauge (needs all words, not just due)
  const filteredStudyWords = useMemo(() => {
    return allWords?.filter(word => word?.root_id != null) ?? [];
  }, [allWords]);

  // Get chart data for recommendations
  const { chartData } = useRetrievabilityChart(allWords || []);

  // Don't show error if user is not authenticated yet - this is expected during auth flow
  const shouldShowError = error && user;

  // Bottom sheet press handlers — imperatively present via ref
  const handleMemoryStrengthInfo = useCallback(() => memorySheetRef.current?.present(), []);
  const handleDuePress = useCallback(() => dueSheetRef.current?.present(), []);
  const handleStreakPress = useCallback(() => streakSheetRef.current?.present(), []);
  const handleMasteredPress = useCallback(() => masteredSheetRef.current?.present(), []);

  // Fix: Use the actual due words data count instead of database view
  // This ensures consistency between display and practice session
  const dueWordsCount = dueWords?.length ?? 0;

  const handleStartReview = useCallback(() => {
    if (!user) return;
    router.push(getPracticeReviewRoute());
  }, [user, router]);

  // Show main UI if there are any words available in either query source
  // - allWords may lag if mutations only invalidate 'due' keys
  // - dueWords reflects immediate availability for study
  const hasAnyStudyWords = (allWords?.length ?? 0) > 0 || dueWordsCount > 0;

  // Calculate all word stats in single pass using optimized utility
  const calculatedStats = useMemo(() => {
    if (!filteredStudyWords.length) {
      return { masteredWords: 0, learningPhaseWords: 0 };
    }

    const { masteredWords, learningPhaseWords } = calculateWordCategories(
      filteredStudyWords,
      dueWordsCount,
    );

    return { masteredWords, learningPhaseWords };
  }, [filteredStudyWords, dueWordsCount]);

  // Bottom padding for content
  const contentPaddingBottom = LAYOUT.SPACING.MEDIUM;

  // Show error message if there was an error loading data
  if (shouldShowError) {
    const handleRetry = () => {
      if (user?.id) {
        // Use helper to invalidate all FSRS queries
        fsrsQueries.invalidateAll(queryClient, user.id);
      }
    };

    return (
      <ThemedView style={styles.container}>
        <ErrorState
          message={error instanceof Error ? error.message : STRINGS.FAILED_TO_LOAD_PRACTICE_DATA}
          onRetry={handleRetry}
        />
      </ThemedView>
    );
  }

  // Empty state — no ScrollView needed, just center in full screen
  if (!hasAnyStudyWords) {
    return (
      <ThemedView useSafeArea={false} style={styles.container}>
        <PracticeEmptyState />
      </ThemedView>
    );
  }

  // Main content
  return (
    <ThemedView useSafeArea={false} style={styles.container}>
      <ThemedView
        scrollable={true}
        useSafeArea={false}
        includeBottomInset={false}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: contentPaddingBottom }]}
        scrollViewProps={{
          showsVerticalScrollIndicator: false,
        }}
      >
        <Animated.View
          entering={FadeIn.duration(TIMING_CONFIG.SLOW.duration)}
          style={styles.vocabularySection}
        >
          <PracticeStatCards
            dueWords={dueWordsCount}
            currentStreak={currentStreak}
            masteredWords={calculatedStats.masteredWords}
            studyWords={filteredStudyWords}
            onInfoPress={handleMemoryStrengthInfo}
            onDuePress={handleDuePress}
            onStreakPress={handleStreakPress}
            onMasteredPress={handleMasteredPress}
          />

          {/* Recommendation Card - placed below stat cards */}
          <RecommendationCard
            studyWords={filteredStudyWords}
            dueWordsCount={dueWordsCount}
            currentRetention={chartData.insights.currentRetrievability}
            learningWords={calculatedStats.learningPhaseWords}
            masteredWords={calculatedStats.masteredWords}
            currentStreak={currentStreak}
          />
        </Animated.View>
      </ThemedView>

      {dueWordsCount > 0 && hasAnyStudyWords && (
        <FloatingActionButton icon="flash" onPress={handleStartReview} />
      )}

      {/* Coordinated Bottom Sheets — stackBehavior: 'replace' enforces one-at-a-time */}
      <MemoryRetentionBottomSheet ref={memorySheetRef} />
      <DueWordsBottomSheet ref={dueSheetRef} />
      <StudyStreakBottomSheet ref={streakSheetRef} />
      <WordsMasteredBottomSheet ref={masteredSheetRef} />
    </ThemedView>
  );
}

export const options: NativeStackNavigationOptions = {
  headerShown: false,
};

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  contentContainer: LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
  vocabularySection: {
    gap: LAYOUT.SPACING.SMALL, // 8px gap for perfect consistency with stat cards
  },
});
