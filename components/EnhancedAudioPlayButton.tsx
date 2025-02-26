import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAudio } from '../hooks/useAudio';
import { useColors } from '../hooks/useColors';
import { ThemedButton } from './ThemedButton';
import { AudioWave } from './AudioWave';
import { LAYOUT } from '../constants/layout';

interface EnhancedAudioPlayButtonProps {
  /**
   * URL of the audio file to play
   */
  audioUrl: string;

  /**
   * Style for the container
   */
  style?: any;

  /**
   * Whether to show a compact version of the button
   * @default false
   */
  compact?: boolean;

  /**
   * Whether to loop the audio
   * @default false
   */
  loop?: boolean;

  /**
   * Callback when audio playback finishes
   */
  onPlaybackFinish?: () => void;

  /**
   * Callback when audio playback starts
   */
  onPlaybackStart?: () => void;

  /**
   * Callback when audio playback is paused
   */
  onPlaybackPause?: () => void;

  /**
   * Callback when an error occurs
   */
  onError?: (error: any) => void;
}

/**
 * An enhanced audio play button component that uses the useAudio hook
 */
export function EnhancedAudioPlayButton({
  audioUrl,
  style,
  compact = false,
  loop = false,
  onPlaybackFinish,
  onPlaybackStart,
  onPlaybackPause,
  onError,
}: EnhancedAudioPlayButtonProps) {
  const colors = useColors();

  // Use our custom audio hook
  const { isPlaying, isLoading, togglePlayPause, progress } = useAudio(audioUrl, {
    loopAudio: loop,
    onPlaybackFinish,
    onPlaybackStart,
    onPlaybackPause,
    onError,
  });

  // Memoize the button title to prevent unnecessary re-renders
  const buttonTitle = useMemo(() => (isPlaying ? 'Pause' : 'Play'), [isPlaying]);

  // Memoize the button icon to prevent unnecessary re-renders
  const buttonIcon = useMemo(() => (isPlaying ? undefined : 'play-circle'), [isPlaying]);

  // Memoize the button variant to prevent unnecessary re-renders
  const buttonVariant = useMemo(() => (isPlaying ? 'outlined' : 'filled'), [isPlaying]);

  // Render a compact version if requested
  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <ThemedButton
          variant={buttonVariant}
          icon={isPlaying ? 'pause' : 'play'}
          title=""
          onPress={togglePlayPause}
          disabled={isLoading}
          loading={isLoading}
          style={styles.compactButton}
        />
        {isPlaying && (
          <View style={styles.compactWaveContainer}>
            <AudioWave isPlaying={isPlaying} color={colors.tint} size="small" />
          </View>
        )}
      </View>
    );
  }

  // Render the full version
  return (
    <View style={[styles.container, style]}>
      <ThemedButton
        variant={buttonVariant}
        title={buttonTitle}
        icon={buttonIcon}
        iconComponent={
          isPlaying ? (
            <AudioWave isPlaying={isPlaying} color={colors.tint} size="medium" />
          ) : undefined
        }
        onPress={togglePlayPause}
        disabled={isLoading}
        loading={isLoading}
        style={styles.button}
      />
      {progress > 0 && (
        <View style={styles.progressContainer}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${progress * 100}%`,
                backgroundColor: isPlaying ? colors.tint : colors.text,
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: LAYOUT.SPACING.MEDIUM,
  },
  button: {
    width: '100%',
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
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactButton: {
    minWidth: 0,
    padding: 0,
  },
  compactWaveContainer: {
    marginLeft: LAYOUT.SPACING.TINY,
  },
});
