import { useMemo, type ComponentType } from 'react';

import { BottomSheetHeader } from '@/components/common';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';

interface ChartSheetContentProps {
  title: string;
  subtitle: string;
  ChartComponent: ComponentType<{ studyWords: StudyWord[] }>;
  filterWords?: (words: StudyWord[]) => StudyWord[];
  queryLimit?: number;
}

/**
 * Header + chart content for a chart sheet route screen presented via
 * Stack.Screen `presentation: 'formSheet'`.
 */
export function ChartSheetContent({
  title,
  subtitle,
  ChartComponent,
  filterWords,
  queryLimit = 1000,
}: ChartSheetContentProps) {
  const { user } = useAuth();

  const { allWords } = useFSRSQueries({
    userId: user?.id,
    limit: queryLimit,
  });

  const studyWords = useMemo(() => {
    const words = allWords ?? [];
    return filterWords ? filterWords(words) : words;
  }, [allWords, filterWords]);

  return (
    <>
      <BottomSheetHeader title={title} subtitle={subtitle} />
      <ChartComponent studyWords={studyWords} />
    </>
  );
}
