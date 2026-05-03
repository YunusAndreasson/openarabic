import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { EmptyState } from '@/components/common/EmptyState';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

/**
 * Empty state for the Playlist screen.
 * Includes a CTA that takes the user to Explore so they can start saving articles.
 */
export function SavedEmptyState() {
  const router = useRouter();

  const handleBrowse = useCallback(() => {
    router.push({ pathname: ROUTE_PATHS.EXPLORE_TAB, params: { from: 'playlist' } });
  }, [router]);

  return (
    <EmptyState
      icon="headset-outline"
      title={STRINGS.BOOKMARKS_EMPTY_TITLE}
      hint={STRINGS.BOOKMARKS_EMPTY_HINT}
      action={{
        label: STRINGS.BROWSE_ARTICLES,
        onPress: handleBrowse,
        icon: 'compass-outline',
      }}
    />
  );
}
