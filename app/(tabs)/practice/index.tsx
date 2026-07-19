import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { InteractionManager, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import { ThemedView } from '@/components/ThemedView';
import { ErrorState } from '@/components/common';
import { PracticeEmptyState, RecommendationCard, PracticeStatCards } from '@/components/practice';
import { TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { fsrsQueries } from '@/constants/queries';
import { ROUTE_PATHS, getPracticeReviewRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useStudyStreak } from '@/hooks/practice/useStudyStreak';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { FloatingActionButton } from '@/components/ui';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import { calculateNextDueDate } from '@/utils/fsrsUtils';
import { rankStrugglingWords } from '@/utils/leechUtils';
import { calculateWordCategories, countReviewedToday } from '@/utils/wordClassification';

// Mount fade-in — Reanimated 4 CSS @keyframes, module-level so no per-render alloc.
// Replaces imperative `entering={FadeIn}` which the React Compiler can't track and
// which forces a Reanimated mount-side-effect on every focus.
const MOUNT_FADE_IN_STYLE = {
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${TIMING_CONFIG.SLOW.duration}ms`,
  animationFillMode: 'forwards' as const,
} as ReanimatedCSSAnimationStyle;

export default function PracticeScreen(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();

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
    }, [user, prefetchVocabularyData, queryClient]),
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

  const handleMemoryStrengthInfo = useCallback(
    () => router.push(ROUTE_PATHS.PRACTICE_MEMORY_RETENTION),
    [router],
  );
  const handleDuePress = useCallback(() => router.push(ROUTE_PATHS.PRACTICE_DUE_WORDS), [router]);
  const handleStreakPress = useCallback(
    () => router.push(ROUTE_PATHS.PRACTICE_STUDY_STREAK),
    [router],
  );
  const handleMasteredPress = useCallback(
    () => router.push(ROUTE_PATHS.PRACTICE_WORDS_MASTERED),
    [router],
  );
  const handleRevisitPress = useCallback(
    () => router.push(ROUTE_PATHS.PRACTICE_WORDS_TO_REVISIT),
    [router],
  );

  // Leech count for the (conditional) "Revisit" stat card — reuses the words
  // already fetched, so no extra query. Ranking is the same pure util the
  // dedicated screen uses.
  const leechCount = useMemo(
    () => rankStrugglingWords(filteredStudyWords).length,
    [filteredStudyWords],
  );

  // Fix: Use the actual due words data count instead of database view
  // This ensures consistency between display and practice session
  const dueWordsCount = dueWords?.length ?? 0;
  // The due query clips at the fetch limit — never imply exactness past it
  const dueCountCapped = dueWordsCount >= 100;

  // Today-card data: words reviewed since local midnight + when the next
  // review lands (both from the already-fetched full word set — no new query)
  const reviewedToday = useMemo(
    () => countReviewedToday(filteredStudyWords),
    [filteredStudyWords],
  );
  const nextDueDate = useMemo(() => calculateNextDueDate(filteredStudyWords), [filteredStudyWords]);

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
  const showFab = dueWordsCount > 0 && hasAnyStudyWords;

  return (
    <>
      <ScrollView
        // `flex: 1` makes this ScrollView fill the route's content view so
        // UIKit recognises it as the screen's primary scrollable. Without it
        // the ScrollView only grows to its children's height — the large title
        // never collapses on scroll even though the bar background fade fires.
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <Animated.View style={[styles.vocabularySection, MOUNT_FADE_IN_STYLE]}>
          <PracticeStatCards
            dueWords={dueWordsCount}
            dueCountCapped={dueCountCapped}
            memoryRetention={chartData.insights.currentRetrievability}
            reviewedToday={reviewedToday}
            nextDueDate={nextDueDate}
            currentStreak={currentStreak}
            masteredWords={calculatedStats.masteredWords}
            leechCount={leechCount}
            onStartReview={handleStartReview}
            onDuePress={handleDuePress}
            onStreakPress={handleStreakPress}
            onMasteredPress={handleMasteredPress}
            onMemoryPress={handleMemoryStrengthInfo}
            onRevisitPress={handleRevisitPress}
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
      </ScrollView>
      {showFab && <FloatingActionButton icon="flash" onPress={handleStartReview} />}
    </>
  );
}

export const options = {
  headerShown: false,
} as const;

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    // 12px first-content lead-in under the header — same rhythm as Explore/Playlist
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  vocabularySection: {
    gap: LAYOUT.SPACING.SMALL, // 8px gap for perfect consistency with stat cards
  },
});
