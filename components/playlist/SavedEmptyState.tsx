import { SeededContentEmptyState } from '@/components/common';

import { STRINGS } from '@/constants/strings';
import { useAddBeginnerArticles } from '@/hooks/playlist/useAddBeginnerArticles';

/**
 * Empty state for the Playlist screen.
 * Primary CTA seeds the playlist with beginner articles for a one-tap first
 * listen; secondary CTA takes the user to Explore to pick their own.
 */
export function SavedEmptyState() {
  const { addArticles, isLoading, hasArticlesAvailable } = useAddBeginnerArticles();

  return (
    <SeededContentEmptyState
      icon="headset-outline"
      title={STRINGS.BOOKMARKS_EMPTY_TITLE}
      hint={STRINGS.BOOKMARKS_EMPTY_HINT}
      seedLabel={STRINGS.PLAYLIST_EMPTY_SEED_CTA}
      onSeed={addArticles}
      isSeeding={isLoading}
      canSeed={hasArticlesAvailable}
    />
  );
}
