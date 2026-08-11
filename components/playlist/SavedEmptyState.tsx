import { EmptyState } from '@/components/common';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAddBeginnerArticles } from '@/hooks/playlist/useAddBeginnerArticles';

/**
 * Empty state for the Playlist screen.
 * Primary CTA seeds the playlist with beginner articles for a one-tap first
 * listen; secondary CTA takes the user to Explore to pick their own.
 */
export function SavedEmptyState() {
  const router = useRouter();
  const { addArticles, isLoading, hasArticlesAvailable } = useAddBeginnerArticles();

  const handleBrowse = useCallback(() => {
    router.push({ pathname: ROUTE_PATHS.EXPLORE_TAB, params: { from: 'playlist' } });
  }, [router]);

  return (
    <EmptyState
      icon="headset-outline"
      title={STRINGS.BOOKMARKS_EMPTY_TITLE}
      hint={STRINGS.BOOKMARKS_EMPTY_HINT}
      action={{
        label: STRINGS.PLAYLIST_EMPTY_SEED_CTA,
        onPress: addArticles,
        icon: 'sparkles-outline',
        loading: isLoading,
        disabled: !hasArticlesAvailable,
      }}
      secondaryAction={{
        label: STRINGS.BROWSE_ARTICLES,
        onPress: handleBrowse,
        icon: 'compass-outline',
      }}
    />
  );
}
