import { EmptyState } from '@/components/common';
import { useCallback, useMemo } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { dismissAllThenNavigate } from '@/utils/sheetNavigation';

/**
 * Empty state for the Dictionary screen.
 * Includes a CTA that takes the user to Explore so they can start saving words.
 */
export function DictionaryEmptyState() {
  // The dictionary is a modal stack over the Practice tab. Leaving it for
  // another tab has to empty that stack first, or on iOS the dictionary stays
  // presented over the destination — see `dismissAllThenNavigate`.
  const handleBrowse = useCallback(() => {
    dismissAllThenNavigate(ROUTE_PATHS.EXPLORE_TAB);
  }, []);
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
