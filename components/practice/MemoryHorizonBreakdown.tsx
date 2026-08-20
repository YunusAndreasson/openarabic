import type { JSX } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import { HORIZON_BAND_SCOPES, type DictionaryScope } from '@/hooks/vocabulary/useDictionaryList';
import type { StudyWord } from '@/types/vocabulary.types';
import { getHorizonBand, HORIZON_BAND_HINTS } from '@/utils/memoryHorizon';
import { dismissSheetThenNavigate } from '@/utils/sheetNavigation';

import { BreakdownExplainer, BreakdownRow, breakdownRowLabel } from './BreakdownRow';

/**
 * The memory sheet: the practice hero's own constellation, read out as bands,
 * each one a door into the words it counts.
 *
 * This replaced a retention gauge over a seven-day forecast line. Both were
 * true and neither was a detail view. The gauge was the hero's number divided
 * by its own denominator — `recallableWords` IS `currentRetrievability × N`,
 * deliberately so (see `useMemoryInsights`) — and the line answered a
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
  const distribution = useMemoryHorizonDistribution(studyWords);
  const { bands, notStartedCount, practisedCount, medianDays } = distribution;

  // Which band the median falls in — the card's "typical word holds for 3 weeks"
  // given a place on the list rather than repeated as a sentence.
  const typicalBand = getHorizonBand(medianDays);

  // Scaled against the tallest BAND only. `notStartedCount` is deliberately out
  // of it: those words have no horizon, so drawing them on the same scale would
  // put them on an axis they are not on.
  const maxBandCount = bands.reduce((max, band) => Math.max(max, band.count), 0);

  // Dismiss this sheet, then open the band's words once it has actually gone.
  // The sequencing — and why it cannot be a push, a replace, or a timer — lives
  // in `dismissSheetThenNavigate`.
  const openScope = (scope: DictionaryScope) => {
    dismissSheetThenNavigate({ pathname: ROUTE_PATHS.PRACTICE_DICTIONARY, params: { scope } });
  };

  return (
    <>
      {bands.map(band => {
        const hint = HORIZON_BAND_HINTS[band.key];
        return (
          <BreakdownRow
            key={band.key}
            label={band.label}
            hint={hint}
            count={band.count}
            fraction={maxBandCount > 0 ? band.count / maxBandCount : 0}
            tag={band.key === typicalBand ? STRINGS.MEMORY_HORIZON_TYPICAL_TAG : undefined}
            accessibilityLabel={breakdownRowLabel({
              band: band.label,
              count: band.count,
              // Only a band row can have "holds" put in front of its caption.
              clause: STRINGS.HORIZON_ROW_HOLDS_A11Y.replace('{hint}', hint),
            })}
            onPress={band.count > 0 ? () => openScope(HORIZON_BAND_SCOPES[band.key]) : undefined}
          />
        );
      })}

      {/* Saved but never reviewed. Named in words and kept off the axis, the same
          way the card's constellation leaves them out — "no horizon yet" is a
          different statement from "you would forget them immediately". */}
      {notStartedCount > 0 && (
        <BreakdownRow
          label={STRINGS.MEMORY_HORIZON_NOT_STARTED}
          hint={STRINGS.MEMORY_HORIZON_NOT_STARTED_HINT}
          count={notStartedCount}
          accessibilityLabel={breakdownRowLabel({
            band: STRINGS.MEMORY_HORIZON_NOT_STARTED,
            count: notStartedCount,
            // Supplies its own clause — "holds saved, never reviewed" is not English.
            clause: STRINGS.MEMORY_HORIZON_NOT_STARTED_HINT,
          })}
          onPress={() => openScope('horizon-none')}
        />
      )}

      <BreakdownExplainer
        text={practisedCount > 0 ? STRINGS.MEMORY_HORIZON_EXPLAINER : STRINGS.MEMORY_HORIZON_EMPTY}
      />
    </>
  );
}

MemoryHorizonBreakdown.displayName = 'MemoryHorizonBreakdown';
