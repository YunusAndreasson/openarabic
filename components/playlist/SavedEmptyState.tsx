import { EmptyState } from '@/components/common/EmptyState';
import { STRINGS } from '@/constants/strings';

/**
 * Empty state for the Playlist screen.
 */
export function SavedEmptyState() {
  return (
    <EmptyState
      icon="albums-outline"
      title={STRINGS.BOOKMARKS_EMPTY_TITLE}
      hint={STRINGS.BOOKMARKS_EMPTY_HINT}
    />
  );
}
