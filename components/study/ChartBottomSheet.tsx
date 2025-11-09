import { memo, useMemo, type ComponentType } from 'react';

import { GenericBottomSheet } from '@/components/common';
import { useAuth } from '@/hooks/auth/useAuth';
import { useFSRSQueries } from '@/hooks/vocabulary/useFSRSQueries';
import type { StudyWord } from '@/types/vocabulary.types';

interface ChartBottomSheetProps {
  /** Controls bottom sheet visibility */
  isVisible: boolean;
  /** Callback when sheet is dismissed */
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
 * Factory component for chart bottom sheets that follow the common pattern:
 * 1. Fetch user data with useAuth
 * 2. Fetch study words with useFSRSQueries
 * 3. Optionally filter/transform words
 * 4. Render chart in GenericBottomSheet
 *
 * This eliminates ~90 lines of duplication across 3+ chart bottom sheet components.
 *
 * @example
 * ```tsx
 * export const DueWordsBottomSheet = memo<BottomSheetProps>(({ isVisible, onClose }) => (
 *   <ChartBottomSheet
 *     isVisible={isVisible}
 *     onClose={onClose}
 *     title={STRINGS.DUE_WORDS_FORECAST}
 *     subtitle={STRINGS.DUE_WORDS_FORECAST_SUBTITLE}
 *     ChartComponent={DueWordsPrognosisChart}
 *     filterWords={words => words.filter(w => w?.root_id != null)}
 *     queryLimit={1000}
 *   />
 * ));
 * ```
 */
export const ChartBottomSheet = memo<ChartBottomSheetProps>(
  ({ isVisible, onClose, title, subtitle, ChartComponent, filterWords, queryLimit = 1000 }) => {
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
      <GenericBottomSheet isVisible={isVisible} onClose={onClose} title={title} subtitle={subtitle}>
        <ChartComponent studyWords={studyWords} />
      </GenericBottomSheet>
    );
  },
);

ChartBottomSheet.displayName = 'ChartBottomSheet';
