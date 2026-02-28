import { memo } from 'react';

/**
 * Header buttons for Playlist tab — Edit mode only.
 * Primary "Play All" action moved to content area.
 */
export const PlaylistHeaderButtons = memo(function PlaylistHeaderButtons({
  EditModeComponent,
}: {
  EditModeComponent: React.ReactNode;
}) {
  return <>{EditModeComponent}</>;
});
