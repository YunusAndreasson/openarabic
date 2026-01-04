import { memo } from 'react';
import { StyleSheet } from 'react-native';

import { HeaderIconButton } from '@/components/ui/HeaderIconButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { usePlaylistHeaderActions } from '@/hooks/playlist/usePlaylistHeaderActions';

/**
 * Play All header button for Playlist tab
 * - Tap: Play all articles in playlist
 * - Long press: Play Arabic only (one-time override)
 * Uses native iOS glass effect via transparent background
 */
export const PlayAllButton = memo(function PlayAllButton({
  withMargin = false,
}: {
  withMargin?: boolean;
}) {
  const colors = useColors();
  const { handlePlayAll, handlePlayAllArabicOnly, isLoading, hasArticles } =
    usePlaylistHeaderActions();

  // Don't render if no articles
  if (!hasArticles) return null;

  return (
    <HeaderIconButton
      iconName="play-circle"
      onPress={handlePlayAll}
      onLongPress={handlePlayAllArabicOnly}
      iconColor={colors.tint}
      backgroundColor={colors.transparent}
      disabled={isLoading}
      testID="play-all-button"
      style={withMargin ? styles.withMargin : undefined}
    />
  );
});

/**
 * Combined header buttons for Playlist tab (Edit + Play)
 * Uses Fragment to let iOS render separate glass containers for each button
 */
export const PlaylistHeaderButtons = memo(function PlaylistHeaderButtons({
  EditModeComponent,
}: {
  EditModeComponent: React.ReactNode;
}) {
  return (
    <>
      {EditModeComponent}
      <PlayAllButton withMargin />
    </>
  );
});

const styles = StyleSheet.create({
  withMargin: {
    marginLeft: LAYOUT.SPACING.MEDIUM, // 12px gap between buttons
  },
});
