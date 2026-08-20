import type { JSX } from 'react';

import { SheetExplainer } from '@/components/common';
import { ChartSheetScreen } from '@/components/practice/ChartSheetContent';
import { DueWordsPrognosisChart } from '@/components/practice/charts/DueWordsPrognosisChart';
import { STRINGS } from '@/constants/strings';
import { useMemoryInsights, type MemoryInsights } from '@/hooks/vocabulary/useMemoryInsights';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * The "N slipping now · M this week" line, or `null` when there is nothing to
 * say about slipping.
 *
 * `null` for an UNMEASURED account is the point. `calculateRetrievabilityForecast`
 * filters to practised words but still returns one entry per forecast day, so a
 * learner who has saved forty words and reviewed none gets a full forecast whose
 * `wordCount` is 0 — and both critical counts come back 0, which read as "Nothing
 * slipping · Nothing slipping this week". That is an all-clear computed over an
 * empty set, presented as a measurement of the learner's memory.
 *
 * Exported so the rule is testable on its own; the screen only renders it.
 */
export function buildSlippingSummary(insights: MemoryInsights): string | null {
  if (insights.measuredWords === 0) return null;

  return [
    insights.criticalWords > 0
      ? STRINGS.PRACTICE_SLIPPING_NOW.replace('{count}', String(insights.criticalWords))
      : STRINGS.PRACTICE_NOTHING_SLIPPING,
    insights.criticalWordsInWeek > 0
      ? STRINGS.PRACTICE_SLIPPING_WEEK.replace('{count}', String(insights.criticalWordsInWeek))
      : STRINGS.PRACTICE_NOTHING_SLIPPING_WEEK,
  ].join(' · ');
}

/**
 * The week's workload, and how much of it is already slipping.
 *
 * The two slipping counts moved here from the memory sheet. They are urgency —
 * words whose recall has fallen past the critical line, and how many more follow
 * within the window if nothing is reviewed — and urgency is what this screen is
 * for. Beside a forecast of what comes due they read as the same sentence; over
 * a memory breakdown they were a second alarm competing with it.
 *
 * Module-level so `ChartSheetContent` gets a stable component reference.
 */
function DueWordsContent({ studyWords }: { studyWords: StudyWord[] }): JSX.Element {
  const insights = useMemoryInsights(studyWords);
  const slipping = buildSlippingSummary(insights);

  return (
    <>
      <DueWordsPrognosisChart studyWords={studyWords} />
      {/* The same closing caption the breakdown sheets use. It used to be
          centred — the only centred body text in the tab — so the one sheet
          whose closing line carries urgency was also the one that did not look
          like the others. */}
      {slipping ? <SheetExplainer text={slipping} /> : null}
    </>
  );
}

export default function DueWordsScreen(): JSX.Element {
  return (
    <ChartSheetScreen
      title={STRINGS.DUE_WORDS_FORECAST}
      subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
      ChartComponent={DueWordsContent}
    />
  );
}
