import { SeededContentEmptyState } from '@/components/common';

import { STRINGS } from '@/constants/strings';
import { useAddCommonWords } from '@/hooks/practice/useAddCommonWords';

/**
 * Empty state for the Practice screen.
 * Primary CTA seeds the study list with common words for a one-tap first
 * session; secondary CTA takes the user to Explore to save words from reading.
 */
export function PracticeEmptyState() {
  const { addWords, isLoading, hasWordsAvailable } = useAddCommonWords();

  return (
    <SeededContentEmptyState
      icon="school-outline"
      title={STRINGS.STUDY_LIST_EMPTY_TITLE}
      hint={STRINGS.STUDY_LIST_EMPTY_HINT}
      seedLabel={STRINGS.PRACTICE_EMPTY_SEED_CTA}
      onSeed={addWords}
      isSeeding={isLoading}
      canSeed={hasWordsAvailable}
    />
  );
}
