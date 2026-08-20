import type { JSX } from 'react';

import { STRINGS } from '@/constants/strings';
import { HORIZON_BAND_SCOPES } from '@/hooks/vocabulary/useDictionaryList';
import { useMemoryHorizonDistribution } from '@/hooks/vocabulary/useMemoryHorizonDistribution';
import type { StudyWord } from '@/types/vocabulary.types';
import { getHorizonBand, HORIZON_BAND_HINTS } from '@/utils/memoryHorizon';

import { BandBreakdown, type BreakdownBand } from './BandBreakdown';

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
 *
 * Bands run weakest-first because that is the left-to-right order of the
 * constellation above: `HORIZON_BAND_KEYS` and the log-time x-axis are the same
 * sequence, so a row's meter and its column place the same words at the same
 * point. `/review-depth` follows this order rather than the other way round, for
 * exactly that reason — see `DEPTH_BAND_KEYS`.
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

  const rows: BreakdownBand[] = bands.map(band => ({
    key: band.key,
    label: band.label,
    hint: HORIZON_BAND_HINTS[band.key],
    count: band.count,
    fraction: maxBandCount > 0 ? band.count / maxBandCount : 0,
    tag: band.key === typicalBand ? STRINGS.MEMORY_HORIZON_TYPICAL_TAG : undefined,
    scope: HORIZON_BAND_SCOPES[band.key],
    // Only a band row can have "holds" put in front of its caption.
    clause: STRINGS.HORIZON_ROW_HOLDS_A11Y.replace('{hint}', HORIZON_BAND_HINTS[band.key]),
  }));

  // Saved but never reviewed. Named in words and kept off the axis, the same
  // way the card's constellation leaves them out — "no horizon yet" is a
  // different statement from "you would forget them immediately".
  if (notStartedCount > 0) {
    rows.push({
      key: 'not-started',
      label: STRINGS.MEMORY_HORIZON_NOT_STARTED,
      hint: STRINGS.MEMORY_HORIZON_NOT_STARTED_HINT,
      count: notStartedCount,
      scope: 'horizon-none',
      // Supplies its own clause — "holds no horizon yet" is not English.
      clause: STRINGS.MEMORY_HORIZON_NOT_STARTED_HINT,
    });
  }

  return (
    <BandBreakdown
      bands={rows}
      explainer={
        practisedCount > 0 ? STRINGS.MEMORY_HORIZON_EXPLAINER : STRINGS.MEMORY_HORIZON_EMPTY
      }
    />
  );
}

MemoryHorizonBreakdown.displayName = 'MemoryHorizonBreakdown';
