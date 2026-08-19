import { useQuery } from '@tanstack/react-query';
import { useMemo, type ComponentType } from 'react';

import { BottomSheetHeader, SheetScreen } from '@/components/common';
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
  const { data: allWords } = useQuery(gated(fsrsQueries.all, user?.id));

  const studyWords = useMemo(() => allWords ?? [], [allWords]);

  return (
    <>
      <BottomSheetHeader title={title} subtitle={subtitle} />
      <ChartComponent studyWords={studyWords} />
    </>
  );
}
