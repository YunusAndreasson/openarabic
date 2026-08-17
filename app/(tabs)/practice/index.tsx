import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { InteractionManager, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedView } from '@/components/ThemedView';
import { ErrorState, LoadingState } from '@/components/common';
import { PracticeEmptyState, PracticeStatCards } from '@/components/practice';
import { TIMING_CONFIG, fadeInStyle } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { DAYS_7 } from '@/constants/chartConstants';
import { fsrsQueries, PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { ROUTE_PATHS, getPracticeReviewRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useAuth } from '@/hooks/auth/useAuth';
import { useStudyStreak } from '@/hooks/practice/useStudyStreak';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { PinnedActionButton, usePinnedActionClearance } from '@/components/ui';
import { useMemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import { useRetrievabilityChart } from '@/hooks/vocabulary/useRetrievabilityChart';
import { calculateDueWordsForecast } from '@/utils/fsrsUtils';
import { isLeechWord } from '@/utils/leechUtils';
import { countReviewedToday } from '@/utils/wordClassification';

// Mount fade-in — Reanimated 4 CSS @keyframes, module-level so no per-render alloc.
// Replaces imperative `entering={FadeIn}` which the React Compiler can't track and
// which forces a Reanimated mount-side-effect on every focus.
const MOUNT_FADE_IN_STYLE = fadeInStyle(TIMING_CONFIG.SLOW.duration, 'forwards');

export default function PracticeScreen(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();
  const pinnedClearance = usePinnedActionClearance();

  // Fetch study streak data. `streak` is null until the query resolves and
  // stays null if it fails, which is NOT the same as a zero streak — the tile
  // shows "—" in that case rather than claiming the run is over.
  const { streak } = useStudyStreak();
  const currentStreak = streak?.currentStreak ?? 0;
  const hasStreak = streak !== null;

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

      // Probe EXACTLY the cache entries this screen reads via useFSRSQueries
      // below — the same shapes prefetchVocabularyData warms.
      const hasStudyWords = queryClient.getQueryData(fsrsQueries.all(user.id).queryKey);
      const hasDueWords = queryClient.getQueryData(
        fsrsQueries.due(user.id, DEFAULT_SESSION_COOLDOWN_HOURS, PRACTICE_DUE_WORDS_LIMIT).queryKey,
      );

      hasPrefetchedRef.current = true;

      // Only fetch if we're missing either data set
      if (!hasStudyWords || !hasDueWords) {
        // (split work + requestIdleCallback) changes *when* this runs, not just its name.
        // These sit in preload/review hot paths; migrating needs per-site profiling.
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- see note above
        InteractionManager.runAfterInteractions(() => {
          prefetchVocabularyData();
        });
      }
    }, [user, prefetchVocabularyData, queryClient]),
  );

  // Use the FSRS queries hook for data fetching
  const { allWords, dueWords, error, isLoading } = useFSRSQueries({
    userId: user?.id,
    limit: PRACTICE_DUE_WORDS_LIMIT,
  });

  // Memory capacity gauge needs all words, not just due
  const studyWords = useMemo(() => allWords ?? [], [allWords]);

  // Get chart data for recommendations
  const { chartData } = useRetrievabilityChart(studyWords);

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
  const handleRevisitPress = useCallback(
    () => router.push(ROUTE_PATHS.PRACTICE_WORDS_TO_REVISIT),
    [router],
  );

  // Leech count for the (conditional) "Revisit" stat card — reuses the words
  // already fetched, so no extra query.
  //
  // Counted with the predicate, NOT with `rankStrugglingWords`: that function
  // slices to LEECH_LIST_LIMIT (20), which is the right cap for the *list*
  // screen and a lie on a tile — a learner with 47 leeches was told 20.
  // The arrow wrapper is load-bearing: `Array.filter` passes the index as its
  // second argument, which lands on `isLeechWord`'s `minLapses` parameter and
  // makes every word at index 0/1 a leech (same trap as useDictionaryList).
  const leechCount = useMemo(
    () => studyWords.filter(word => isLeechWord(word)).length,
    [studyWords],
  );

  // Fix: Use the actual due words data count instead of database view
  // This ensures consistency between display and practice session
  const dueWordsCount = dueWords?.length ?? 0;
  // The due query clips at the fetch limit — never imply exactness past it
  const dueCountCapped = dueWordsCount >= PRACTICE_DUE_WORDS_LIMIT;

  // Unique words whose last review was today. One `fsrs_last_review` per word is
  // the only per-day granularity the schema allows, so re-asking the same word
  // inside a session does not add to this — which is why the label says "words
  // reviewed today" rather than "reviews".
  const reviewedToday = useMemo(() => countReviewedToday(studyWords), [studyWords]);

  // Grades given across the whole collection. Exact, and monotone in a way the
  // streak is not: `fsrs_reps` only ever falls through an explicit, confirmed
  // reset or removal, never on its own.
  const totalReviews = useMemo(
    () => studyWords.reduce((sum, word) => sum + Math.max(0, word.fsrs_reps ?? 0), 0),
    [studyWords],
  );

  // Seven days of due counts for the week-ahead card. The same series the
  // /due-words sheet plots — one fact at two resolutions, never two facts.
  const forecast = useMemo(() => calculateDueWordsForecast(studyWords, DAYS_7), [studyWords]);

  // The distribution behind the memory constellation.
  const distribution = useMemoryHorizonDistribution(studyWords);

  // No double-tap guard here any more: every ThemedButton is behind the shared
  // press lock in useButtonPress, so a second tap inside 300ms never reaches
  // this handler.
  const handleStartReview = useCallback(() => {
    if (!user) return;
    router.push(getPracticeReviewRoute());
  }, [user, router]);

  // Shown when nothing is due: more words come from reading, so send them there
  // rather than leaving the screen without an action. Matches the empty state's
  // secondary CTA, including the `from` param Explore uses for its hint toast.
  const handleBrowseArticles = useCallback(
    () => router.push({ pathname: ROUTE_PATHS.EXPLORE_TAB, params: { from: 'practice' } }),
    [router],
  );

  // Show main UI if there are any words available in either query source
  // - allWords may lag if mutations only invalidate 'due' keys
  // - dueWords reflects immediate availability for study
  const hasAnyStudyWords = (allWords?.length ?? 0) > 0 || dueWordsCount > 0;

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

  // Initial-load gate: while the words queries are first loading, don't flash
  // the empty state (with its live "Add common words" CTA). Gate on v5
  // isLoading (= isPending && isFetching) — NOT bare isPending, which stays
  // true forever for restore-gated/enabled-gated queries that never fetch.
  if (isLoading && !hasAnyStudyWords) {
    return (
      <ThemedView style={styles.container}>
        <LoadingState />
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

  // Single start-review CTA, pinned within thumb reach above the tab bar.
  // The title carries the workload so no separate status text is needed.
  const showReviewCta = dueWordsCount > 0 && hasAnyStudyWords;
  const reviewCtaTitle = `${STRINGS.REVIEW_CTA_PREFIX} ${
    dueCountCapped ? `${dueWordsCount}+` : dueWordsCount
  } ${dueWordsCount === 1 && !dueCountCapped ? STRINGS.WORD_SINGULAR : STRINGS.SUMMARY_WORDS_SUFFIX}`;

  // Caught up is not the same as nothing to do: when there is nothing due, the
  // one CTA below becomes "Browse articles" rather than disappearing. Without
  // that the screen renders stat cards and no action at all, plus 72px of
  // padding reserved for a button that never arrives — so the tab reads as a
  // dead end at exactly the moment the user came looking for something to
  // practise.

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
        contentContainerStyle={[styles.contentContainer, { paddingBottom: pinnedClearance }]}
      >
        <Animated.View style={[styles.vocabularySection, MOUNT_FADE_IN_STYLE]}>
          <PracticeStatCards
            dueWords={dueWordsCount}
            dueCountCapped={dueCountCapped}
            reviewedToday={reviewedToday}
            recallableWords={chartData.insights.recallableWords}
            hasMeasuredMemory={chartData.insights.measuredWords > 0}
            distribution={distribution}
            forecast={forecast}
            currentStreak={currentStreak}
            hasStreak={hasStreak}
            totalReviews={totalReviews}
            leechCount={leechCount}
            onDuePress={handleDuePress}
            onStreakPress={handleStreakPress}
            onMemoryPress={handleMemoryStrengthInfo}
            onRevisitPress={handleRevisitPress}
          />
        </Animated.View>
      </ScrollView>
      {/* ONE button whose label and action change, not two that swap places.
          `allWords` and `dueWords` are separate queries: the loading gate above
          opens as soon as `allWords` lands, and until `dueWords` follows,
          `dueWordsCount` is still 0 — so on a cold start this rendered "Browse
          articles" first, then unmounted it and mounted the review button in
          its place. Two different components meant the CTA visibly vanished and
          came back (replaying its mount animation) on every first open. As one
          instance the worst case is a label settling, which is a far quieter
          correction than a button disappearing. */}
      <PinnedActionButton
        title={showReviewCta ? reviewCtaTitle : STRINGS.BROWSE_ARTICLES}
        onPress={showReviewCta ? handleStartReview : handleBrowseArticles}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    // 12px first-content lead-in under the header — same rhythm as Explore/Playlist
    paddingTop: LAYOUT.SPACING.MEDIUM,
    // paddingBottom comes from usePinnedActionClearance() at the call site — it
    // depends on the safe-area inset and on whether the mini player is up.
  },
  vocabularySection: {
    gap: LAYOUT.SPACING.SMALL, // 8px gap for perfect consistency with stat cards
  },
});
