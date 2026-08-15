import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow, ProgressBar } from '@/components/common';
import { ThemedText } from '@/components/ThemedText';
import { Ionicons } from '@/components/ui';
import { TIMING_CONSTANTS } from '@/constants/animation';
import { CHART_OPACITY, useChartColors } from '@/constants/chartColors';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useMemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import { HORIZON_BAND_SCOPES, type DictionaryScope } from '@/hooks/vocabulary/useDictionaryList';
import type { StudyWord } from '@/types/vocabulary.types';
import { mixColors } from '@/utils/colorUtils';
import { getHorizonBand, HORIZON_BAND_HINTS } from '@/utils/memoryHorizon';

const CHEVRON_SIZE = 14;

/**
 * Wide enough to compare four bars at a glance, fixed so they share one left and
 * one right edge — a bar chart laid on its side, not four unrelated meters.
 */
const METER_WIDTH = 84;

/** Keeps three-digit counts from shunting the meters around as the row changes. */
const COUNT_WIDTH = 40;

interface HorizonRowProps {
  label: string;
  /** The band's span in plain words — there is no drawn axis here to read it off. */
  hint: string;
  /**
   * The same span as a spoken clause. Separate because the caption is a fragment
   * that only reads correctly under its label, and because "Not started" is not
   * a duration at all.
   */
  spokenHint: string;
  count: number;
  /** 0–1 against the tallest band. Omitted for rows that are not on the axis. */
  fraction?: number;
  /** Marks the band the median word falls in. */
  isTypical?: boolean;
  /** Absent for an empty band: there is nothing on the other side of the tap. */
  onPress?: () => void;
}

function HorizonRow({
  label,
  hint,
  spokenHint,
  count,
  fraction,
  isTypical = false,
  onPress,
}: HorizonRowProps): JSX.Element {
  const colors = useColors();
  const chartColors = useChartColors();

  // The same ink the constellation stamps its dots in, so a row and the column
  // it came from are visibly the same data. Words with no horizon are not on
  // that axis, so they are not painted as if they were.
  const fillColor = fraction == null ? colors.textTertiary : chartColors.ui.dataLine;
  // Track is a lighter step of the fill's own hue, mixed rather than alpha-washed
  // — an alpha wash composites toward the sheet's near-black on the dark theme
  // and collapses into it. Same rule as SortMeter and the constellation rail.
  const trackColor = mixColors(colors.elevation1, fillColor, CHART_OPACITY.TRACK);

  const caption = isTypical ? `${hint} · ${STRINGS.MEMORY_HORIZON_TYPICAL_TAG}` : hint;
  const accessibilityLabel = (count > 0 ? STRINGS.HORIZON_ROW_A11Y : STRINGS.HORIZON_ROW_A11Y_EMPTY)
    .replace('{band}', label)
    .replace('{count}', String(count))
    .replace('{spoken}', spokenHint);

  return (
    <ListRow divider density="compact" onPress={onPress} accessibilityLabel={accessibilityLabel}>
      <View style={styles.labelColumn}>
        <ThemedText type="body" colorName={count > 0 ? 'text' : 'textTertiary'}>
          {label}
        </ThemedText>
        <ThemedText type="caption" colorName="textTertiary" numberOfLines={1}>
          {caption}
        </ThemedText>
      </View>

      {/* A length, and only a length — the row says the count out loud beside it
          and again in its spoken label, so nothing here is carried by pixels
          alone. */}
      <View style={styles.meter}>
        {fraction != null && (
          <ProgressBar
            backgroundColor={trackColor}
            fillColor={fillColor}
            height={LAYOUT.PROGRESS_BAR.HEIGHT}
            progress={fraction * 100}
          />
        )}
      </View>

      <ThemedText
        type="bodyBold"
        colorName={count > 0 ? 'text' : 'textTertiary'}
        style={styles.count}
      >
        {count}
      </ThemedText>

      {/* Only rows that lead somewhere claim to. */}
      <View style={styles.chevron}>
        {onPress && (
          <Ionicons color={colors.textTertiary} name="chevron-forward" size={CHEVRON_SIZE} />
        )}
      </View>
    </ListRow>
  );
}

/**
 * The memory sheet: the practice hero's own constellation, read out as bands,
 * each one a door into the words it counts.
 *
 * This replaced a retention gauge over a seven-day forecast line. Both were
 * true and neither was a detail view. The gauge was the hero's number divided
 * by its own denominator — `recallableWords` IS `currentRetrievability × N`,
 * deliberately so (see `useRetrievabilityChart`) — and the line answered a
 * different question in a different FSRS quantity: retrievability decaying over
 * a week, where the card had just taught stability. Tapping a chart should
 * reveal what is inside it, and what is inside this one is words.
 *
 * A snapshot, on purpose. There is no review log — FSRS state lives only on
 * `study_words` as current values — so a "how my horizons grew" series could
 * only be today's state projected backwards. That is exactly what the deleted
 * mastery curve did.
 */
export function MemoryHorizonBreakdown({ studyWords }: { studyWords: StudyWord[] }): JSX.Element {
  const router = useRouter();
  const distribution = useMemoryHorizonDistribution(studyWords);
  const { bands, notStartedCount, practisedCount, medianDays } = distribution;

  // Which band the median falls in — the card's "typical word holds for 3 weeks"
  // given a place on the list rather than repeated as a sentence.
  const typicalBand = getHorizonBand(medianDays);

  // Scaled against the tallest BAND only. `notStartedCount` is deliberately out
  // of it: those words have no horizon, so drawing them on the same scale would
  // put them on an axis they are not on.
  const maxBandCount = bands.reduce((max, band) => Math.max(max, band.count), 0);

  const openScope = (scope: DictionaryScope) => {
    // Dismiss, wait for the dismissal, THEN push. All three parts are load-bearing.
    //
    // *Dismiss first*: this sheet is a root-level form sheet and the dictionary
    // is a modal inside the practice stack, so pushing while the sheet is still
    // up presents it BEHIND the sheet — the trap the practice layout documents.
    //
    // *`back`, not `replace`*: replacing the sheet with the nested route rebuilt
    // the tab state without the practice screen underneath, so closing the
    // dictionary dropped the learner on Explore (measured on Android). Popping
    // leaves the practice stack intact and the dictionary pushes onto it the
    // same way the header's own dictionary button does.
    //
    // *And the delay*: UIKit will not present a screen from a controller that is
    // still dismissing one, so on iOS the push in the same tick was swallowed —
    // the sheet closed and nothing opened. Android tolerates it, which is why
    // this only showed up on device. The wait is the dismissal itself, not a
    // guess at a race; `SHEET_DISMISS_DELAY` carries the reasoning, and
    // `RelatedArticlesByFilter` sequences its modal→modal navigation the same
    // way with a shorter one.
    router.back();
    setTimeout(() => {
      router.push({ pathname: ROUTE_PATHS.PRACTICE_DICTIONARY, params: { scope } });
    }, TIMING_CONSTANTS.SHEET_DISMISS_DELAY);
  };

  return (
    <>
      {bands.map(band => (
        <HorizonRow
          key={band.key}
          label={band.label}
          hint={HORIZON_BAND_HINTS[band.key]}
          spokenHint={STRINGS.HORIZON_ROW_HOLDS_A11Y.replace(
            '{hint}',
            HORIZON_BAND_HINTS[band.key],
          )}
          count={band.count}
          fraction={maxBandCount > 0 ? band.count / maxBandCount : 0}
          isTypical={band.key === typicalBand}
          onPress={band.count > 0 ? () => openScope(HORIZON_BAND_SCOPES[band.key]) : undefined}
        />
      ))}

      {/* Saved but never reviewed. Named in words and kept off the axis, the same
          way the card's constellation leaves them out — "no horizon yet" is a
          different statement from "you would forget them immediately". */}
      {notStartedCount > 0 && (
        <HorizonRow
          label={STRINGS.MEMORY_HORIZON_NOT_STARTED}
          hint={STRINGS.MEMORY_HORIZON_NOT_STARTED_HINT}
          spokenHint={STRINGS.MEMORY_HORIZON_NOT_STARTED_HINT}
          count={notStartedCount}
          onPress={() => openScope('horizon-none')}
        />
      )}

      <ThemedText type="caption" colorName="captionText" style={styles.explainer}>
        {practisedCount > 0 ? STRINGS.MEMORY_HORIZON_EXPLAINER : STRINGS.MEMORY_HORIZON_EMPTY}
      </ThemedText>
    </>
  );
}

MemoryHorizonBreakdown.displayName = 'MemoryHorizonBreakdown';

const styles = StyleSheet.create({
  labelColumn: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
  },
  meter: {
    width: METER_WIDTH,
    flexShrink: 0,
  },
  count: {
    width: COUNT_WIDTH,
    textAlign: 'right',
  },
  chevron: {
    width: CHEVRON_SIZE,
    alignItems: 'center',
  },
  explainer: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
