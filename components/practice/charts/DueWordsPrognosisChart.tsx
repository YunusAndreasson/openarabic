import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { useMeasuredWidth } from '@/components/common/charts/useMeasuredWidth';
import { ThemedText } from '@/components/primitives/ThemedText';
import { DAYS_7 } from '@/constants/chartConstants';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';
import { formatWeekday } from '@/utils/chartDataUtils';
import { calculateDueWordsForecast } from '@/utils/fsrsUtils';
import { formatCount } from '@/utils/stringUtils';

import { WeekAheadBars } from './WeekAheadBars';

/** Tall enough to compare seven columns by eye; the sheet fits itself to it. */
const BAR_HEIGHT = 96;
/** Shared by the bars and the label rows under them, so each label sits under its column. */
const COLUMN_GAP = LAYOUT.SPACING.SMALL;

interface DueWordsPrognosisChartProps {
  studyWords: StudyWord[];
}

/**
 * The /due-words sheet's chart: the practice card's week-ahead bars at full
 * width, each column labelled with its count and its day.
 *
 * The same drawing as the card's sparkbar, on purpose — one series, one form,
 * at two sizes. This used to be a smoothed spline with an area wash, seven
 * spring-staggered dots and a scrubbing tooltip, inside a card on the sheet: the
 * form the card's own bars were chosen to avoid, because a spline implies
 * values between days that do not exist. With every column carrying its number
 * there is no axis to read, no grid to draw and nothing to scrub.
 *
 * The series is per day (`newlyDue`): the first column is everything due now,
 * every later column only what that day adds. It used to be the running backlog
 * if nothing were ever reviewed, which only rose, so its "busiest day" was
 * always the last one.
 *
 * The bars take the width the sheet actually gives them (`useMeasuredWidth`)
 * rather than the window's less an assumed inset; the label rows stretch to the
 * same width on their own, so a column and its labels share one edge.
 */
export function DueWordsPrognosisChart({ studyWords }: DueWordsPrognosisChartProps): JSX.Element {
  const { ref, onLayout, width } = useMeasuredWidth();

  const days = calculateDueWordsForecast(studyWords, DAYS_7).map((day, index) => ({
    key: day.date.toISOString(),
    label: index === 0 ? STRINGS.DUE_WORDS_NOW_COLUMN : formatWeekday(day.date),
    count: day.newlyDue,
  }));

  const accessibilityLabel = STRINGS.DUE_WORDS_WEEK_A11Y.replace(
    '{days}',
    days
      .map(day =>
        STRINGS.DUE_WORDS_DAY_A11Y.replace('{day}', day.label).replace(
          '{count}',
          formatCount(day.count),
        ),
      )
      .join('; '),
  );

  return (
    // One drawing, read through one sentence — never as fourteen loose numbers
    // and weekday fragments.
    <View
      ref={ref}
      onLayout={onLayout}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {/* Nothing to draw until the width is known — at the height the bars
          will have, so the sheet fitted to this does not change height. */}
      {width === null ? (
        <View style={styles.barsPlaceholder} />
      ) : (
        <WeekAheadBars
          counts={days.map(day => day.count)}
          width={width}
          height={BAR_HEIGHT}
          gap={COLUMN_GAP}
        />
      )}

      <View style={[styles.labelRow, styles.countRow]}>
        {days.map((day, index) => (
          <ThemedText
            key={day.key}
            type="bodyBold"
            // The measured column in full ink, the projection one step down —
            // the same two levels the bars above are painted in.
            colorName={index === 0 ? 'text' : 'secondaryText'}
            align="center"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.cell}
          >
            {formatCount(day.count)}
          </ThemedText>
        ))}
      </View>

      <View style={styles.labelRow}>
        {days.map(day => (
          <ThemedText
            key={day.key}
            type="caption"
            colorName="subtleLabelText"
            align="center"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={styles.cell}
          >
            {day.label}
          </ThemedText>
        ))}
      </View>
    </View>
  );
}

DueWordsPrognosisChart.displayName = 'DueWordsPrognosisChart';

const styles = StyleSheet.create({
  barsPlaceholder: {
    height: BAR_HEIGHT,
  },
  // Seven equal cells with the bars' own gap: (width − 6·gap) / 7 each, which is
  // exactly a bar's width, so every label is centred under its column.
  labelRow: {
    flexDirection: 'row',
    gap: COLUMN_GAP,
  },
  countRow: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  cell: {
    flex: 1,
  },
});
