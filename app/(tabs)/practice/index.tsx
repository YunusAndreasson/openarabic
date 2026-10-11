import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { ThemedView } from '@/components/primitives/ThemedView';
import { ErrorState, LoadingState } from '@/components/common';
import { PracticeEmptyState, PracticeStatCards } from '@/components/practice';
import { TIMING_CONFIG, fadeInStyle } from '@/constants/animation';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { LAYOUT } from '@/constants/layout';
import { DAYS_7 } from '@/constants/chartConstants';
import { fsrsQueries, PRACTICE_DUE_WORDS_LIMIT } from '@/constants/queries';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useVoiceGrading } from '@/components/providers';
import { useAppPreloader } from '@/hooks/app/useAppPreloader';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import { useMiniPlayerClearance } from '@/hooks/audio/useMiniPlayerClearance';
import { useAuth } from '@/hooks/auth/useAuth';
import { useStudyStreak } from '@/hooks/practice/useStudyStreak';
import { useTabBarAutoHide } from '@/hooks/ui/useTabBarAutoHide';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import { useAppSelectorShallow } from '@/store/hooks';
import { useMemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import { useRecallableMemory } from '@/hooks/vocabulary/useMemoryInsights';
import { calculateDueWordsForecast } from '@/utils/fsrsUtils';
import { isLeechWord } from '@/utils/leechUtils';
import { runWhenIdle } from '@/utils/runWhenIdle';
import { countReviewedToday, isDueWord } from '@/utils/wordClassification';

// Mount fade-in — Reanimated 4 CSS @keyframes, module-level so no per-render alloc.
// Replaces imperative `entering={FadeIn}` which the React Compiler can't track and
// which forces a Reanimated mount-side-effect on every focus.
const MOUNT_FADE_IN_STYLE = fadeInStyle(TIMING_CONFIG.SLOW.duration, 'forwards');

export default function PracticeScreen(): JSX.Element {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { prefetchVocabularyData } = useAppPreloader();
  const miniPlayerClearance = useMiniPlayerClearance();
  const tabBarAutoHide = useTabBarAutoHide();

  // Fetch study streak data. `streak` is null until the query resolves and
  // stays null if it fails, which is NOT the same as a zero streak — the tile
  // shows "—" in that case rather than claiming the run is over.
  const { streak } = useStudyStreak();
  const currentStreak = streak?.currentStreak ?? 0;
  const hasStreak = streak !== null;

  const { acquireEngine, offerHotwordGlosses } = useVoiceGrading();
  const voiceEnabled = useAppSelectorShallow(state => state.settings.voiceEnabled);

  // Add ref to prevent infinite re-renders
  const hasPrefetchedRef = useRef(false);

  // Hold the recognizer in RAM while the learner is on this tab.
  //
  // This is what buys the ~3 s engine build its time: they spend several
  // seconds reading stats before tapping Start, so by the time the first card
  // appears the model is warm. Loading it at review-mount instead would land
  // that build against the first prompt, which is the exact "no mic on card 1"
  // regression this work exists to remove — and loading it app-wide would make
  // every article reader carry a 110M-parameter model they are not using.
  //
  // The release is deferred inside the provider, so Practice → review →
  // Practice never drops the count to zero and rebuilds.
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
        runWhenIdle(() => {
          void prefetchVocabularyData();
        });
      }
    }, [user, prefetchVocabularyData, queryClient]),
  );

  // Use the FSRS queries hook for data fetching
  const { allWords, dueWords, error, isLoading } = useFSRSQueries({
    userId: user?.id,
    limit: PRACTICE_DUE_WORDS_LIMIT,
  });

  // The recogniser is built for a vocabulary and rebuilt for every new one, so
  // it is told the due words' answers here, in the same pass that first retains
  // it — and not before they have loaded. Retained unbiased, it was torn down
  // and rebuilt the moment review mounted and offered the very same words, and
  // the warm engine this tab exists to provide was never the one card 1 used.
  //
  // The due query here is capped, and review offers every word in the session.
  // At the cap the two lists differ, the vocabulary grows when review mounts,
  // and the warm engine is rebuilt during card 1 after all — so past the cap
  // this reads the due words out of the full list instead.
  const dueWordsCapped = (dueWords?.length ?? 0) >= PRACTICE_DUE_WORDS_LIMIT;
  const vocabularyWords = dueWordsCapped ? (allWords ?? []).filter(isDueWord) : (dueWords ?? []);
  const dueGlossKey = vocabularyWords
    .map(word => word.root?.meaning)
    .filter((meaning): meaning is string => Boolean(meaning))
    .sort()
    .join('\n');
  useFocusEffect(
    useCallback(() => {
      if (!voiceEnabled || isLoading) return;
      if (dueGlossKey) offerHotwordGlosses(dueGlossKey.split('\n'));
      return acquireEngine();
    }, [voiceEnabled, isLoading, dueGlossKey, acquireEngine, offerHotwordGlosses]),
  );

  // Memory capacity gauge needs all words, not just due
  const studyWords = useMemo(() => allWords ?? [], [allWords]);

  // The instant the time-dependent figures below are computed for. They used
  // to read the clock inside memos keyed only on the word list — and the list
  // keeps its identity across identical refetches, so a tab left open
  // overnight, or resumed days later, kept showing yesterday's "reviewed
  // today", recall and week-ahead figures. Refreshed whenever the tab is shown
  // or the app comes back.
  const [now, setNow] = useState(() => Date.now());
  const refreshNow = useCallback(() => setNow(Date.now()), []);
  useFocusEffect(refreshNow);
  useResumeFromBackground(refreshNow);

  // Only the current recall snapshot is needed here. The full seven-day
  // forgetting forecast belongs to the due-words sheet and is intentionally
  // not computed on the tab's reveal path.
  const memory = useRecallableMemory(studyWords, now);

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
  const handleReviewsPress = useCallback(
    () => router.push(ROUTE_PATHS.PRACTICE_REVIEW_DEPTH),
    [router],
  );
  const handleRetry = useCallback(() => {
    if (!userId) return;
    // Use helper to invalidate all FSRS queries.
    void fsrsQueries.invalidateAll(queryClient, userId);
  }, [queryClient, userId]);

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
  const reviewedToday = useMemo(
    () => countReviewedToday(studyWords, new Date(now)),
    [studyWords, now],
  );

  // Grades given across the whole collection. Exact, and monotone in a way the
  // streak is not: `fsrs_reps` only ever falls through an explicit, confirmed
  // reset or removal, never on its own.
  const totalReviews = useMemo(
    () => studyWords.reduce((sum, word) => sum + Math.max(0, word.fsrs_reps ?? 0), 0),
    [studyWords],
  );

  // Seven days of due counts for the week-ahead card. The same series the
  // /due-words sheet plots — one fact at two resolutions, never two facts.
  const forecast = useMemo(
    () => calculateDueWordsForecast(studyWords, DAYS_7, new Date(now)),
    [studyWords, now],
  );

  // The distribution behind the memory constellation.
  const distribution = useMemoryHorizonDistribution(studyWords);
  const scrollContentStyle = useMemo(
    () => [styles.contentContainer, { paddingBottom: miniPlayerClearance }],
    [miniPlayerClearance],
  );

  // Show main UI if there are any words available in either query source
  // - allWords may lag if mutations only invalidate 'due' keys
  // - dueWords reflects immediate availability for study
  const hasAnyStudyWords = (allWords?.length ?? 0) > 0 || dueWordsCount > 0;

  // Show error message if there was an error loading data
  if (shouldShowError) {
    return (
      <ThemedView style={styles.container}>
        <ErrorState message={STRINGS.FAILED_TO_LOAD_PRACTICE_DATA} onRetry={handleRetry} />
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

  // The start-review CTA lives in the navigation bar now (`ReviewButton`), not
  // as a pinned pill over the list: it is a once-per-visit action, and a
  // full-width button plus its scrim were spending a thumb's worth of screen
  // and covering the stat cards the learner came to read.

  return (
    <ScrollView
      // Scroll direction drives the tab bar out of the way on Android; on iOS
      // UIKit reads this same scroll view itself. See `useTabBarAutoHide`.
      {...tabBarAutoHide}
      // `flex: 1` makes this ScrollView fill the route's content view so
      // UIKit recognises it as the screen's primary scrollable. Without it
      // the ScrollView only grows to its children's height — the large title
      // never collapses on scroll even though the bar background fade fires.
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={scrollContentStyle}
    >
      <Animated.View style={VOCABULARY_SECTION_STYLE}>
        <PracticeStatCards
          dueWords={dueWordsCount}
          dueCountCapped={dueCountCapped}
          reviewedToday={reviewedToday}
          recallableWords={memory.recallableWords}
          hasMeasuredMemory={memory.measuredWords > 0}
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
          onReviewsPress={handleReviewsPress}
        />
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    // 12px first-content lead-in under the header — same rhythm as Explore/Playlist
    paddingTop: LAYOUT.SPACING.MEDIUM,
    // paddingBottom comes from useMiniPlayerClearance() at the call site — it
    // depends on the safe-area inset and on whether the mini player is up.
  },
  vocabularySection: {
    gap: LAYOUT.SPACING.SMALL, // 8px gap for perfect consistency with stat cards
  },
});

const VOCABULARY_SECTION_STYLE = [styles.vocabularySection, MOUNT_FADE_IN_STYLE];
