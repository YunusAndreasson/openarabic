import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAddCommonWords } from '@/hooks/practice/useAddCommonWords';

/**
 * Empty state for the Practice screen.
 * Primary CTA seeds the study list with common words for a one-tap first
 * session; secondary CTA takes the user to Explore to save words from reading.
 */
export function PracticeEmptyState() {
  const router = useRouter();
  const { addWords, isLoading, hasWordsAvailable } = useAddCommonWords();

  const handleBrowse = useCallback(() => {
    router.push({ pathname: ROUTE_PATHS.EXPLORE_TAB, params: { from: 'practice' } });
  }, [router]);

  return (
    <EmptyState
      icon="school-outline"
      title={STRINGS.STUDY_LIST_EMPTY_TITLE}
      hint={STRINGS.STUDY_LIST_EMPTY_HINT}
      action={{
        label: STRINGS.PRACTICE_EMPTY_SEED_CTA,
        onPress: addWords,
        icon: 'sparkles-outline',
        loading: isLoading,
        disabled: !hasWordsAvailable,
      }}
      secondaryAction={{
        label: STRINGS.BROWSE_ARTICLES,
        onPress: handleBrowse,
        icon: 'compass-outline',
      }}
    />
  );
}
