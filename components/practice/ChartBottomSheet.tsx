import { useMemo, type ComponentType, type Ref } from 'react';

import { GenericBottomSheet, type GenericBottomSheetHandle } from '@/components/common';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';

interface ChartBottomSheetProps {
  /** Bottom sheet title */
  title: string;
  /** Bottom sheet subtitle */
  subtitle: string;
  /** Chart component to render (receives studyWords prop) */
  ChartComponent: ComponentType<{ studyWords: StudyWord[] }>;
  /** Optional filter function to transform words before passing to chart */
  filterWords?: (words: StudyWord[]) => StudyWord[];
  /** Optional query limit for fetching words (default: 1000) */
  queryLimit?: number;
  /** Imperative handle — use a ref to call .present()/.dismiss() */
  ref?: Ref<GenericBottomSheetHandle>;
}

/**
 * Factory component for chart bottom sheets that follow the common pattern:
 * 1. Fetch user data with useAuth
 * 2. Fetch study words with useFSRSQueries
 * 3. Optionally filter/transform words
 * 4. Render chart in GenericBottomSheet
 *
 * Imperative — open via the forwarded ref.
 *
 * @example
 * ```tsx
 * const ref = useRef<GenericBottomSheetHandle>(null);
 * <Button onPress={() => ref.current?.present()} />
 * <ChartBottomSheet
 *   ref={ref}
 *   title={STRINGS.DUE_WORDS_FORECAST}
 *   subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
 *   ChartComponent={DueWordsPrognosisChart}
 *   filterWords={words => words.filter(w => w?.root_id != null)}
 * />
 * ```
 */
export function ChartBottomSheet({
  title,
  subtitle,
  ChartComponent,
  filterWords,
  queryLimit = 1000,
  ref,
}: ChartBottomSheetProps) {
  const { user } = useAuth();

  // Fetch study words for the current user
  const { allWords } = useFSRSQueries({
    userId: user?.id,
    limit: queryLimit,
  });

  // Apply optional filter transformation
  const studyWords = useMemo(() => {
    const words = allWords ?? [];
    return filterWords ? filterWords(words) : words;
  }, [allWords, filterWords]);

  return (
    <GenericBottomSheet ref={ref} title={title} subtitle={subtitle}>
      <ChartComponent studyWords={studyWords} />
    </GenericBottomSheet>
  );
}
