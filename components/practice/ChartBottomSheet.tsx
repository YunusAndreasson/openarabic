import { useMemo, type ComponentType } from 'react';

import { GenericBottomSheet } from '@/components/common';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';

interface ChartBottomSheetProps {
  /** Controls visibility */
  isVisible: boolean;
  /** Fired when the sheet finishes dismissing */
  onClose: () => void;
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
}

/**
 * Factory component for chart bottom sheets:
 * 1. Fetch user data with useAuth
 * 2. Fetch study words with useFSRSQueries
 * 3. Optionally filter/transform words
 * 4. Render chart in GenericBottomSheet
 *
 * State-driven — parent owns the `isVisible` boolean.
 */
export function ChartBottomSheet({
  isVisible,
  onClose,
  title,
  subtitle,
  ChartComponent,
  filterWords,
  queryLimit = 1000,
}: ChartBottomSheetProps) {
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
    <GenericBottomSheet isVisible={isVisible} onClose={onClose} title={title} subtitle={subtitle}>
      <ChartComponent studyWords={studyWords} />
    </GenericBottomSheet>
  );
}
