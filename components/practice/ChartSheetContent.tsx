import { useMemo, type ComponentType } from 'react';

import { BottomSheetHeader } from '@/components/common';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';

interface ChartSheetContentProps {
  title: string;
  subtitle: string;
  ChartComponent: ComponentType<{ studyWords: StudyWord[] }>;
}

/**
 * Header + chart content for a chart sheet route screen presented via
 * Stack.Screen `presentation: 'formSheet'`.
 *
 * Plain flow, no scroll container: the charts have fixed heights and the sheet
 * fits itself to them. Wrapping this in a `ScrollView` is what blanked these
 * sheets on iOS — see `SheetScreen`.
 */
export function ChartSheetContent({ title, subtitle, ChartComponent }: ChartSheetContentProps) {
  const { user } = useAuth();

  // No `limit`. It reached only the DUE query, which nothing here reads, while
  // `allWords` — the list these charts are drawn from — ignores it and pages
  // through the whole table (getFSRSWords), precisely so a heavy account is not
  // silently charted from PostgREST's implicit first 1000 rows. So the cap
  // capped nothing and bought a third due-words cache entry, keyed on a limit no
  // other caller uses, fetched on every chart sheet and thrown away.
  const { allWords } = useFSRSQueries({ userId: user?.id });

  const studyWords = useMemo(() => allWords ?? [], [allWords]);

  return (
    <>
      <BottomSheetHeader title={title} subtitle={subtitle} />
      <ChartComponent studyWords={studyWords} />
    </>
  );
}
