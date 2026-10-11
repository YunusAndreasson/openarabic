import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { MetricCard } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyStreak } from '@/hooks/practice/useStudyStreak';
import { DEPTH_BAND_SCOPES } from '@/hooks/vocabulary/useDictionaryList';
import { useReviewDepthDistribution } from '@/hooks/vocabulary/useReviewDepthDistribution';
import type { StudyWord } from '@/types/vocabulary.types';
import { DEPTH_BAND_HINTS } from '@/utils/practiceDepth';
import { formatCount } from '@/utils/stringUtils';

import { BandBreakdown, type BreakdownBand } from './BandBreakdown';

/**
 * An average worth printing, or the empty metric.
 *
 * Rounded and prefixed with `≈`, because that is what it is: a mean, not a
 * count. The exact number beside it is printed bare, so the symbol is the only
 * thing distinguishing them — which makes it load-bearing rather than
 * decorative.
 *
 * A real mean below a half gets `<1` rather than `≈0`. Rounding it would put a
 * zero next to a non-zero total on the same row, which reads as a contradiction
 * rather than as an average — and that is precisely the first-week case (one
 * review across three study days) this sheet should not open with.
 *
 * A mean of exactly zero is not an approximation of anything, so it drops the
 * marker and prints bare, matching the exact `0` the Total tile shows beside it
 * on the same account.
 */
function formatAverage(total: number, divisor: number): string {
  if (divisor <= 0) return STRINGS.EMPTY_METRIC;

  const mean = total / divisor;
  if (mean === 0) return '0';
  if (Math.round(mean) === 0) return STRINGS.DEPTH_AVERAGE_UNDER_ONE;

  return STRINGS.DEPTH_AVERAGE.replace('{count}', formatCount(mean));
}

/**
 * The sheet under the practice screen's "Reviews done" tile: the total, its two
 * useful normalisations, and the distribution the second of those averages
 * summarises.
 *
 * **Why there is no per-day chart here.** The obvious detail view for a review
 * count is a bar per day, and the data to draw one honestly does not exist:
 * `study_words` carries only current FSRS state, and `fsrs_last_review` is a
 * single column that every review overwrites, so a word only ever contributes
 * to the day it was LAST touched. The `daily_efficiency_stats` /
 * `daily_mastery_stats` views are reconstructed from that same column and
 * inherit the same structural under-count. `utils/studyDayLedger` says it
 * outright: reviews-per-day needs a `review_logs` table. Drawing the chart
 * anyway would mean inventing the shape of somebody's practice history.
 *
 * What IS exact is how deep the practice on each word currently runs, and the
 * rows below are that — partitioned by `fsrs_reps`, the same column the tile
 * sums, so the parts and the whole cannot disagree.
 */
export function PracticeDepthBreakdown({ studyWords }: { studyWords: StudyWord[] }): JSX.Element {
  const { bands, maxBandCount, totalReviews, totalWords } = useReviewDepthDistribution(studyWords);

  // Already warm: the practice screen mounts this same query for its streak
  // tile, so opening the sheet reads the cache rather than the network.
  //
  // `totalReadingDays` is the app's own definition of a study day — the number
  // the streak sheet prints as "Total" one tap away — so this average and that
  // count are the same fact, and a second denominator invented here would only
  // make the two surfaces disagree.
  //
  // Be clear about what it costs. That ledger structurally under-counts history:
  // the server-derived half holds at most one day-key per reviewed word, and the
  // local half is lost on reinstall (see `utils/studyDayLedger`). So the error
  // here is a MULTIPLE, not a rounding — a learner with fifteen words, thousands
  // of grades and a fresh install can be told "≈200 per study day". The `≈` is
  // what keeps it from being read as a measurement; the honest fix is a
  // `review_logs` table, which is a backend change.
  const { streak } = useStudyStreak();

  const metrics = [
    {
      id: 'total',
      label: STRINGS.DEPTH_METRIC_TOTAL,
      // `0` rather than "—": no reviews is a MEASURED fact for a new learner,
      // and the same reasoning the tile itself uses.
      value: totalReviews,
    },
    {
      id: 'per-day',
      label: STRINGS.DEPTH_METRIC_PER_DAY,
      // A pending or failed streak fetch is not a study history of zero days.
      value: streak ? formatAverage(totalReviews, streak.totalReadingDays) : STRINGS.EMPTY_METRIC,
    },
    {
      id: 'per-word',
      label: STRINGS.DEPTH_METRIC_PER_WORD,
      // Over EVERY saved word, not only the reviewed ones. Dividing by
      // `reviewedWords` gave a tile labelled "Per word" that meant "per word you
      // have actually practised" — so a learner with twenty words, two of them
      // drilled twelve times each, read "≈12 per word" directly above a row
      // saying eighteen words had never been reviewed. The rows below partition
      // all words, and now so does this.
      value: formatAverage(totalReviews, totalWords),
    },
  ];

  const rows: BreakdownBand[] = bands.map(band => ({
    key: band.key,
    label: band.label,
    hint: DEPTH_BAND_HINTS[band.key],
    count: band.count,
    // "Not yet" is kept off the axis for the same reason the memory sheet keeps
    // "Not started" off its own: those words have no practice behind them, so a
    // bar drawn on the practice scale would put them on an axis they are not on.
    fraction: band.key === 'none' ? undefined : maxBandCount > 0 ? band.count / maxBandCount : 0,
    scope: DEPTH_BAND_SCOPES[band.key],
    // The depth caption is already a full phrase, so it needs no verb in front
    // of it the way a horizon band's "under a week" does.
    clause: DEPTH_BAND_HINTS[band.key],
  }));

  return (
    <>
      {/* Static readouts, so they carry no chevron — `MetricCard` draws one only
          for a tile that leads somewhere. These are the same card at the same
          size as the pressable ones on the practice screen, which is exactly why
          the signifier has to distinguish them. */}
      <View style={styles.metricsRow}>
        {metrics.map(metric => (
          <MetricCard key={metric.id} value={metric.value} label={metric.label} />
        ))}
      </View>

      <BandBreakdown
        bands={rows}
        explainer={totalReviews > 0 ? STRINGS.DEPTH_EXPLAINER : STRINGS.DEPTH_EMPTY}
      />
    </>
  );
}

PracticeDepthBreakdown.displayName = 'PracticeDepthBreakdown';

const styles = StyleSheet.create({
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});
