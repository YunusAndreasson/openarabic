import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

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
export const PlayAllButton = memo(function PlayAllButton() {
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
      size="large"
      iconColor={colors.tint}
      backgroundColor={colors.transparent}
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
    <View style={styles.container}>
      {EditModeComponent}
      <PlayAllButton />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL, // 8px gap between buttons
  },
});
