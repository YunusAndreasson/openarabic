/**
 * PracticeStatCards Component
 *
 * The practice home's surface, deliberately shallow, in the order a learner
 * asks about it:
 *
 *   1. what is due today — the number the tab badge shows, directly under the
 *      header's Review action, with the week's shape beside it;
 *   2. what you can recall right now, and how deeply it sits;
 *   3. two habit numbers, as tiles.
 *
 * Due leads because the badge points here. Recall led for a while, and the
 * count the learner had just seen on the tab icon was then the smallest number
 * on the screen it opened.
 *
 * Everything else is one tap away, and that is the point. An earlier version of
 * this screen carried the same four blocks PLUS a per-day forecast with its own
 * axis and warning, a vocabulary-growth chart, and three footnote captions under
 * the hero — every number true, and collectively unreadable. The detail did not
 * get deleted, it got put where it can be read properly: the horizon breakdown
 * — the hero's own constellation as bands, each one a door into those words —
 * in /memory-retention; the labelled per-day forecast and the week's slipping
 * counts in /due-words; the growth series on the dictionary screen it
 * describes.
 */
import { MetricCardGrid } from '@/components/common/MetricCardGrid';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { MemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import type { DueWordsForecast } from '@/utils/fsrsUtils';

import { MemoryHorizonCard } from './MemoryHorizonCard';
import { WeekAheadCard } from './WeekAheadCard';

interface PracticeStatCardsProps {
  dueWords?: number;
  reviewedToday?: number;
  /** Expected words recallable right now. */
  recallableWords?: number;
  /** False when no word has been reviewed yet, so there is no score to show. */
  hasMeasuredMemory?: boolean;
  distribution: MemoryHorizonDistribution;
  forecast?: DueWordsForecast[];
  currentStreak?: number;
  /** False until the streak has actually been read, so a pending or failed
   *  fetch never renders as "0". */
  hasStreak?: boolean;
  /** Σ fsrs_reps — grades given, across the whole collection. */
  totalReviews?: number;
  onDuePress?: () => void;
  onStreakPress?: () => void;
  onMemoryPress?: () => void;
  onReviewsPress?: () => void;
}

export function PracticeStatCards({
  dueWords = 0,
  reviewedToday = 0,
  recallableWords = 0,
  hasMeasuredMemory = true,
  distribution,
  forecast = [],
  currentStreak = 0,
  hasStreak = true,
  totalReviews = 0,
  onDuePress,
  onStreakPress,
  onMemoryPress,
  onReviewsPress,
}: PracticeStatCardsProps) {
  // Two tiles, both plain ink: a streak and a review total are just numbers.
  //
  // There was a third, "Revisit", counting words forgotten twice or more. It is
  // gone because the scheduler already brings a forgotten word back sooner —
  // starting a review IS the revisit — and the tile had no action of its own,
  // only a list. It put a coloured count of "problems" under the due count on a
  // screen whose one instruction is to review what is due. Those words are
  // still browsable through the dictionary's Struggling scope.
  //
  // The old "Memory" tile is gone: the hero now says the same thing in a better
  // unit — a count of words rather than an abstract percentage — and it was also
  // the most punishing pixel on the screen, painting `colors.error` below 40% so
  // that anyone returning from a break was met with red.
  const stats = [
    {
      id: 'streak',
      label: STRINGS.STREAK_LABEL,
      // An unread streak is not a streak of zero. Rendering the pending (or
      // failed) state as "0" tells someone on a 43-day run that they have lost
      // it — measured on device: every cold start flashed "0" before the query
      // landed, and a failed fetch left it there.
      value: hasStreak ? currentStreak : STRINGS.EMPTY_METRIC,
      // Spoken labels end with what the tap opens, the same way the two cards
      // above them do. Without one, a tile announced its two
      // words and hid the door.
      accessibilityLabel: hasStreak
        ? STRINGS.STREAK_TILE_A11Y.replace('{count}', String(currentStreak))
        : STRINGS.STREAK_TILE_A11Y_EMPTY,
      onPress: onStreakPress,
    },
    {
      id: 'reviews',
      label: STRINGS.REVIEWS_LABEL,
      // `0` here, not "—", and the difference matters: zero reviews is a
      // MEASURED fact for a new learner, sitting directly above a "Review N
      // words" button, so it reads as an invitation rather than a gap. It is
      // also the one effort number that cannot be taken away — unlike the
      // streak, `fsrs_reps` only falls through an explicit, confirmed reset.
      value: totalReviews,
      accessibilityLabel: STRINGS.REVIEWS_TILE_A11Y.replace('{count}', String(totalReviews)),
      // This tile used to be the one in the row with nowhere to go. Streak
      // beside it opens a sheet, and both are the same `BaseCard` at the same
      // size — so a tap that produced the press state and then nothing read as
      // a broken control rather than as a static readout.
      // Reported as exactly that. Its sheet is the breakdown of this very
      // number, so the tap now pays for itself twice.
      onPress: onReviewsPress,
    },
  ];

  return (
    <View style={styles.container}>
      {/* Cost: what is due today, and what the week ahead asks of you */}
      <WeekAheadCard
        forecast={forecast}
        dueCount={dueWords}
        reviewedToday={reviewedToday}
        onPress={onDuePress}
      />

      {/* Capability: what you know right now, and how far it reaches */}
      <MemoryHorizonCard
        recallableWords={recallableWords}
        hasMeasuredMemory={hasMeasuredMemory}
        distribution={distribution}
        onPress={onMemoryPress}
      />

      {/* Habit */}
      <MetricCardGrid metrics={stats} density="comfortable" animated />
    </View>
  );
}

PracticeStatCards.displayName = 'PracticeStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.SMALL,
  },
});
