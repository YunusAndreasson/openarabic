import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { usePlaylist, PlaylistItem, PlaylistOptions } from '../hooks/usePlaylist';
import { useColors } from '../hooks/useColors';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';
import { LAYOUT } from '../constants/layout';
import { AudioWave } from './AudioWave';

interface PlaylistPlayerProps {
  /**
   * Array of playlist items
   */
  items: PlaylistItem[];

  /**
   * Configuration options for the playlist
   */
  options?: PlaylistOptions;

  /**
   * Style for the container
   */
  style?: any;

  /**
   * Whether to show a compact version of the player
   * @default false
   */
  compact?: boolean;

  /**
   * Whether to show the title of the current item
   * @default true
   */
  showTitle?: boolean;

  /**
   * Function to get the title of an item
   * @default item => item.data?.title || 'Untitled'
   */
  getTitleFromItem?: (item: PlaylistItem) => string;
}

/**
 * A component for playing a playlist of audio files
 */
export function PlaylistPlayer({
  items,
  options,
  style,
  compact = false,
  showTitle = true,
  getTitleFromItem = item => item.data?.title || 'Untitled',
}: PlaylistPlayerProps) {
  const colors = useColors();

  // Use our playlist hook
  const playlist = usePlaylist(items, options);

  // Get the current item title
  const currentTitle = useMemo(() => {
    if (!playlist.currentItem) return '';
    return getTitleFromItem(playlist.currentItem);
  }, [playlist.currentItem, getTitleFromItem]);

  // Render a compact version if requested
  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={playlist.togglePlayPause}
          disabled={!items.length}
        >
          <Ionicons name={playlist.isPlaying ? 'pause' : 'play'} size={24} color={colors.tint} />
        </TouchableOpacity>

        {playlist.isPlaying && (
          <View style={styles.compactWaveContainer}>
            <AudioWave isPlaying={playlist.isPlaying} color={colors.tint} size="small" />
          </View>
        )}

        {showTitle && playlist.currentItem && (
          <ThemedText style={styles.compactTitle} numberOfLines={1} ellipsizeMode="tail">
            {currentTitle}
          </ThemedText>
        )}
      </View>
    );
  }

  // Render the full version
  return (
    <View style={[styles.container, style]}>
      {showTitle && playlist.currentItem && (
        <ThemedText style={styles.title} numberOfLines={1} ellipsizeMode="tail">
          {currentTitle}
        </ThemedText>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={playlist.playPrevious}
          disabled={!items.length || (!playlist.isPlaying && playlist.currentIndex <= 0)}
        >
          <Ionicons
            name="play-skip-back"
            size={24}
            color={
              !items.length || (!playlist.isPlaying && playlist.currentIndex <= 0)
                ? colors.icon
                : colors.tint
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={playlist.togglePlayPause}
          disabled={!items.length}
        >
          <Ionicons
            name={playlist.isPlaying ? 'pause-circle' : 'play-circle'}
            size={48}
            color={!items.length ? colors.icon : colors.tint}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={playlist.playNext}
          disabled={
            !items.length || (!playlist.isPlaying && playlist.currentIndex >= items.length - 1)
          }
        >
          <Ionicons
            name="play-skip-forward"
            size={24}
            color={
              !items.length || (!playlist.isPlaying && playlist.currentIndex >= items.length - 1)
                ? colors.icon
                : colors.tint
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={playlist.toggleShuffle}
          disabled={items.length <= 1}
        >
          <Ionicons
            name="shuffle"
            size={24}
            color={
              items.length <= 1
                ? colors.icon
                : playlist.isShuffleMode
                  ? colors.success
                  : colors.tint
            }
          />
        </TouchableOpacity>
      </View>

      {playlist.duration > 0 && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${playlist.progress * 100}%`,
                backgroundColor: playlist.isPlaying ? colors.tint : colors.text,
              },
            ]}
          />
        </View>
      )}

      {playlist.isPlaying && (
        <View style={styles.waveContainer}>
          <AudioWave isPlaying={playlist.isPlaying} color={colors.tint} size="medium" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.MEDIUM,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: LAYOUT.SPACING.SMALL,
  },
  controlButton: {
    padding: LAYOUT.SPACING.SMALL,
  },
  playPauseButton: {
    padding: LAYOUT.SPACING.SMALL,
  },
  progressContainer: {
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginTop: LAYOUT.SPACING.TINY,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 1,
  },
  waveContainer: {
    alignItems: 'center',
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BUTTON.BORDER_RADIUS.SMALL,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  compactWaveContainer: {
    marginHorizontal: LAYOUT.SPACING.SMALL,
  },
  compactTitle: {
    flex: 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
  },
});
