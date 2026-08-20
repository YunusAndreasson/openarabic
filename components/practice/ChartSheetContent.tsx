import { useQuery } from '@tanstack/react-query';
import { useMemo, type ComponentType } from 'react';

import { BottomSheetHeader, BottomSheetStateHandler, SheetScreen } from '@/components/common';
import { fsrsQueries, gated } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import type { StudyWord } from '@/types/vocabulary.types';

interface ChartSheetContentProps {
  title: string;
  subtitle: string;
  ChartComponent: ComponentType<{ studyWords: StudyWord[] }>;
}

/** Complete route shell for the app's fixed-height vocabulary chart sheets. */
export function ChartSheetScreen(props: ChartSheetContentProps) {
  return (
    <SheetScreen>
      <ChartSheetContent {...props} />
    </SheetScreen>
  );
}

/**
 * Header + chart content for a chart sheet route screen presented via
 * Stack.Screen `presentation: 'formSheet'`.
 *
 * Plain flow, no scroll container: the charts have fixed heights and the sheet
 * fits itself to them. Wrapping this in a `ScrollView` is what blanked these
 * sheets on iOS — see `SheetScreen`.
 */
function ChartSheetContent({ title, subtitle, ChartComponent }: ChartSheetContentProps) {
  const { user } = useAuth();

  // The `all` query on its own, not `useFSRSQueries`. That hook mounts a DUE
  // query unconditionally — with a placeholderData pass that re-filters the
  // whole word list — and these charts read only `allWords`, so every sheet
  // open added an observer and a filter pass for a result nothing here looks at.
  // (Dropping its `limit` earlier removed a needless third cache entry but left
  // the query itself.) No limit here by design: `allWords` pages through the
  // whole table via getFSRSWords, precisely so a heavy account is not silently
  // charted from PostgREST's implicit first 1000 rows.
  const { data: allWords, isLoading, isError } = useQuery(gated(fsrsQueries.all, user?.id));

  const studyWords = useMemo(() => allWords ?? [], [allWords]);

  // These three sheets used to discard `isLoading`/`isError` and render whatever
  // `allWords ?? []` produced, which on a cold cache is a breakdown of zero —
  // every band at 0, the explainer in its "nothing yet" branch — presented as a
  // measurement to a learner who may well have hundreds of words. The two sheets
  // that already used this handler (`study-streak`, `words-to-revisit`) were the
  // only ones telling the truth while they waited.
  //
  // Safe inside `fitToContents`: the handler's container is `minHeight` +
  // `flexGrow`, deliberately never `flex: 1`, precisely so a form sheet trying to
  // derive its own height from this content still has something to measure. The
  // reasoning is at BottomSheetStateHandler's STATE_MIN_HEIGHT.
  //
  // No `isEmpty`: an account with no words has already been sent to the
  // practice empty state and cannot reach these routes, and each breakdown
  // renders its own "nothing yet" explainer for the account that has words but
  // has reviewed none. That distinction is the content, not a state.
  return (
    <>
      <BottomSheetHeader title={title} subtitle={subtitle} />
      <BottomSheetStateHandler isLoading={isLoading} isError={isError}>
        <ChartComponent studyWords={studyWords} />
      </BottomSheetStateHandler>
    </>
  );
}
