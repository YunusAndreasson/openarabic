/**
 * PracticeStatCards Component
 *
 * The practice home's surface, deliberately shallow: **one story, then the
 * action**.
 *
 *   1. what you can recall right now, and how deeply it sits — the hero, which
 *      owns the screen;
 *   2. today's workload, as a slim row with the week's shape beside it;
 *   3. three habit numbers, as tiles;
 *   4. the single pinned CTA, owned by the screen rather than by this file.
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
import { MetricCard } from '@/components/common';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { MemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import type { DueWordsForecast } from '@/utils/fsrsUtils';

import { MemoryHorizonCard } from './MemoryHorizonCard';
import { WeekAheadCard } from './WeekAheadCard';

interface PracticeStatCardsProps {
  dueWords?: number;
  dueCountCapped?: boolean;
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
  leechCount?: number;
  onDuePress?: () => void;
  onStreakPress?: () => void;
  onMemoryPress?: () => void;
  onRevisitPress?: () => void;
}

export function PracticeStatCards({
  dueWords = 0,
  dueCountCapped = false,
  reviewedToday = 0,
  recallableWords = 0,
  hasMeasuredMemory = true,
  distribution,
  forecast = [],
  currentStreak = 0,
  hasStreak = true,
  totalReviews = 0,
  leechCount = 0,
  onDuePress,
  onStreakPress,
  onMemoryPress,
  onRevisitPress,
}: PracticeStatCardsProps) {
  const colors = useColors();

  // Colour is spent only where it carries information. A leech count only ever
  // appears because something needs attention; a streak and a review total are
  // just numbers, and painting those too turned the row into three unrelated
  // accent colours.
  //
  // The old "Memory" tile is gone: the hero now says the same thing in a better
  // unit — a count of words rather than an abstract percentage — and it was also
  // the most punishing pixel on the screen, painting `colors.error` below 40% so
  // that anyone returning from a break was met with red.
  const stats = [
    {
      label: STRINGS.STREAK_LABEL,
      // An unread streak is not a streak of zero. Rendering the pending (or
      // failed) state as "0" tells someone on a 43-day run that they have lost
      // it — measured on device: every cold start flashed "0" before the query
      // landed, and a failed fetch left it there.
      value: hasStreak ? currentStreak : STRINGS.EMPTY_METRIC,
      onPress: onStreakPress,
    },
    {
      label: STRINGS.REVIEWS_LABEL,
      // `0` here, not "—", and the difference matters: zero reviews is a
      // MEASURED fact for a new learner, sitting directly above a "Review N
      // words" button, so it reads as an invitation rather than a gap. It is
      // also the one effort number that cannot be taken away — unlike the
      // streak, `fsrs_reps` only falls through an explicit, confirmed reset.
      value: totalReviews,
    },
    // Only surfaced when the learner actually has leeches, so it never nags.
    ...(leechCount > 0
      ? [
          {
            label: STRINGS.REVISIT_LABEL,
            value: leechCount,
            valueColor: colors.error,
            onPress: onRevisitPress,
          },
        ]
      : []),
  ];

  return (
    <View style={styles.container}>
      {/* Capability: what you know right now, and how far it reaches */}
      <MemoryHorizonCard
        recallableWords={recallableWords}
        hasMeasuredMemory={hasMeasuredMemory}
        distribution={distribution}
        onPress={onMemoryPress}
      />

      {/* Cost: what the week ahead asks of you */}
      <WeekAheadCard
        forecast={forecast}
        dueCount={dueWords}
        dueCountCapped={dueCountCapped}
        reviewedToday={reviewedToday}
        onPress={onDuePress}
      />

      {/* Habit */}
      <View style={styles.statsRow}>
        {stats.map(stat => (
          <MetricCard
            key={stat.label}
            value={stat.value}
            label={stat.label}
            valueColor={stat.valueColor}
            onPress={stat.onPress}
          />
        ))}
      </View>
    </View>
  );
}

PracticeStatCards.displayName = 'PracticeStatCards';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.SMALL,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
  },
});
