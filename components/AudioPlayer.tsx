import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { useAudioPlayer, AUDIO_STATES, AudioTrack } from '../hooks/useAudioPlayer';
import { useColors } from '../hooks/useColors';
import { LAYOUT } from '../constants/layout';
import Slider from '@react-native-community/slider';

type AudioPlayerProps = {
  tracks: AudioTrack[];
  initialTrackIndex?: number;
  onTrackChange?: (index: number) => void;
  showPlaylist?: boolean;
};

export function AudioPlayer({
  tracks,
  initialTrackIndex = 0,
  onTrackChange,
  showPlaylist = false,
}: AudioPlayerProps) {
  const colors = useColors();
  const {
    audioState,
    currentTrackIndex,
    progress,
    duration,
    loadAndPlayAudio,
    togglePlayPause,
    playTrack,
    startPlayback,
    stopPlayback,
    startShufflePlayback,
    playNextTrack,
    playPreviousTrack,
    seekToPosition,
  } = useAudioPlayer();

  // Format time in mm:ss
  const formatTime = (milliseconds: number) => {
    if (!milliseconds) return '00:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get current track
  const currentTrack = useMemo(() => {
    if (currentTrackIndex >= 0 && currentTrackIndex < tracks.length) {
      return tracks[currentTrackIndex];
    }
    return null;
  }, [tracks, currentTrackIndex]);

  // Start playback when component mounts
  useEffect(() => {
    if (tracks.length > 0 && initialTrackIndex >= 0 && initialTrackIndex < tracks.length) {
      startPlayback(tracks, initialTrackIndex);
    }

    return () => {
      stopPlayback();
    };
  }, []);

  // Notify when track changes
  useEffect(() => {
    if (onTrackChange && currentTrackIndex >= 0) {
      onTrackChange(currentTrackIndex);
    }
  }, [currentTrackIndex, onTrackChange]);

  // Handle next track
  const handleNextTrack = () => {
    playNextTrack(tracks);
  };

  // Handle previous track
  const handlePreviousTrack = () => {
    playPreviousTrack(tracks);
  };

  // Handle seek
  const handleSeek = (value: number) => {
    seekToPosition(value);
  };

  // Handle shuffle
  const handleShuffle = () => {
    startShufflePlayback(tracks);
  };

  // Render play/pause button based on audio state
  const renderPlayPauseButton = () => {
    if (audioState === AUDIO_STATES.LOADING) {
      return <ActivityIndicator size="large" color={colors.tint} />;
    }

    if (audioState === AUDIO_STATES.PLAYING) {
      return (
        <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
          <Ionicons name="pause" size={32} color={colors.tint} />
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={togglePlayPause} style={styles.controlButton}>
        <Ionicons name="play" size={32} color={colors.tint} />
      </TouchableOpacity>
    );
  };

  // Render playlist
  const renderPlaylist = () => {
    if (!showPlaylist) return null;

    return (
      <View style={styles.playlist}>
        <ThemedText style={styles.playlistTitle}>Playlist</ThemedText>
        {tracks.map((track, index) => (
          <TouchableOpacity
            key={track.id}
            style={[styles.playlistItem, currentTrackIndex === index && styles.playlistItemActive]}
            onPress={() => playTrack(tracks, index)}
          >
            <ThemedText
              style={[
                styles.playlistItemText,
                currentTrackIndex === index && styles.playlistItemTextActive,
              ]}
              numberOfLines={1}
            >
              {track.title}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Create styles with the colors
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderWidth: LAYOUT.BORDER.WIDTH.THIN,
          borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
          overflow: 'hidden',
          marginBottom: LAYOUT.SPACING.MEDIUM,
        },
        playerContent: {
          padding: LAYOUT.SPACING.MEDIUM,
        },
        trackInfo: {
          marginBottom: LAYOUT.SPACING.MEDIUM,
        },
        trackTitle: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.LARGE,
          fontWeight: '600',
          marginBottom: LAYOUT.SPACING.SMALL,
        },
        progressContainer: {
          flexDirection: 'row',
          alignItems: 'center',
        },
        progressBar: {
          flex: 1,
          height: 40,
        },
        timeText: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
          width: 50,
          textAlign: 'center',
        },
        controls: {
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        },
        controlButton: {
          padding: LAYOUT.SPACING.SMALL,
        },
        playlist: {
          borderTopWidth: LAYOUT.BORDER.WIDTH.THIN,
          padding: LAYOUT.SPACING.MEDIUM,
        },
        playlistTitle: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
          fontWeight: '600',
          marginBottom: LAYOUT.SPACING.SMALL,
        },
        playlistItem: {
          paddingVertical: LAYOUT.SPACING.SMALL,
          paddingHorizontal: LAYOUT.SPACING.MEDIUM,
          borderRadius: LAYOUT.BORDER_RADIUS.XSMALL,
          marginBottom: LAYOUT.SPACING.SMALL,
        },
        playlistItemActive: {
          backgroundColor: colors.textOverlay,
        },
        playlistItemText: {
          fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
        },
        playlistItemTextActive: {
          fontWeight: '600',
        },
      }),
    [colors]
  );

  return (
    <View style={[styles.container, { borderColor: colors.tabIconDefault }]}>
      <View style={styles.playerContent}>
        {/* Track info */}
        <View style={styles.trackInfo}>
          <ThemedText style={styles.trackTitle} numberOfLines={1}>
            {currentTrack?.title || 'No track selected'}
          </ThemedText>
          <View style={styles.progressContainer}>
            <ThemedText style={styles.timeText}>{formatTime(progress)}</ThemedText>
            <Slider
              style={styles.progressBar}
              minimumValue={0}
              maximumValue={duration || 1}
              value={progress}
              onSlidingComplete={handleSeek}
              minimumTrackTintColor={colors.tint}
              maximumTrackTintColor={colors.tabIconDefault}
              thumbTintColor={colors.tint}
            />
            <ThemedText style={styles.timeText}>{formatTime(duration)}</ThemedText>
          </View>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity onPress={handlePreviousTrack} style={styles.controlButton}>
            <Ionicons name="play-skip-back" size={24} color={colors.tint} />
          </TouchableOpacity>

          {renderPlayPauseButton()}

          <TouchableOpacity onPress={handleNextTrack} style={styles.controlButton}>
            <Ionicons name="play-skip-forward" size={24} color={colors.tint} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShuffle} style={styles.controlButton}>
            <Ionicons name="shuffle" size={24} color={colors.tint} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Playlist */}
      {renderPlaylist()}
    </View>
  );
}
