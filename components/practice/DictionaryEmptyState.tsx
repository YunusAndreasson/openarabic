import { EmptyState } from '@/components/common';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

/**
 * Empty state for the Dictionary screen.
 * Includes a CTA that takes the user to Explore so they can start saving words.
 */
export function DictionaryEmptyState() {
  const router = useRouter();

  const handleBrowse = useCallback(() => {
    router.navigate(ROUTE_PATHS.EXPLORE_TAB);
  }, [router]);
  const action = useMemo(
    () => ({
      label: STRINGS.BROWSE_ARTICLES,
      onPress: handleBrowse,
      icon: 'compass-outline' as const,
    }),
    [handleBrowse],
  );

  return (
    <EmptyState
      icon="book-outline"
      title={STRINGS.STUDY_LIST_EMPTY_TITLE}
      hint={STRINGS.STUDY_LIST_EMPTY_HINT}
      action={action}
    />
  );
}
