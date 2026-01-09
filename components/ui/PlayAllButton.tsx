import { memo } from 'react';

import { HeaderButtonGroup } from '@/components/ui/HeaderButtonGroup';
import { TransparentHeaderButton } from '@/components/ui/TransparentHeaderButton';
import { usePlaylistHeaderActions } from '@/hooks/playlist/usePlaylistHeaderActions';

/**
 * Play All header button for Playlist tab
 * - Tap: Play all articles in playlist
 * - Long press: Play Arabic only (one-time override)
 * Uses native iOS glass effect via transparent background
 */
export const PlayAllButton = memo(function PlayAllButton() {
  const { handlePlayAll, handlePlayAllArabicOnly, isLoading, hasArticles } =
    usePlaylistHeaderActions();

  // Don't render if no articles
  if (!hasArticles) return null;

  return (
    <TransparentHeaderButton
      iconName="play-circle"
      onPress={handlePlayAll}
      onLongPress={handlePlayAllArabicOnly}
      size="large"
      disabled={isLoading}
      testID="play-all-button"
    />
  );
});

/**
 * Combined header buttons for Playlist tab (Edit + Play)
 * Renders in shared iOS glass container with proper spacing
 */
export const PlaylistHeaderButtons = memo(function PlaylistHeaderButtons({
  EditModeComponent,
}: {
  EditModeComponent: React.ReactNode;
}) {
  return (
    <HeaderButtonGroup>
      {EditModeComponent}
      <PlayAllButton />
    </HeaderButtonGroup>
  );
});
