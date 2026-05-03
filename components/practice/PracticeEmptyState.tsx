import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

/**
 * Empty state for the Practice screen.
 * Includes a CTA that takes the user to Explore so they can start saving words.
 */
export function PracticeEmptyState() {
  const router = useRouter();

  const handleBrowse = useCallback(() => {
    router.push({ pathname: ROUTE_PATHS.EXPLORE_TAB, params: { from: 'practice' } });
  }, [router]);

  return (
    <EmptyState
      icon="school-outline"
      title={STRINGS.STUDY_LIST_EMPTY_TITLE}
      hint={STRINGS.STUDY_LIST_EMPTY_HINT}
      action={{
        label: STRINGS.BROWSE_ARTICLES,
        onPress: handleBrowse,
        icon: 'compass-outline',
      }}
    />
  );
}
