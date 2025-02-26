import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { useNavigation } from 'expo-router';

export interface AudioOptions {
  /**
   * Whether to enable haptic feedback when toggling playback
   * @default true
   */
  enableHaptics?: boolean;

  /**
   * Whether to play in silent mode on iOS
   * @default true
   */
  playsInSilentModeIOS?: boolean;

  /**
   * Haptic feedback style to use
   * @default Medium
   */
  hapticStyle?: Haptics.ImpactFeedbackStyle;

  /**
   * Whether to automatically unload the sound when component unmounts
   * @default true
   */
  autoUnload?: boolean;

  /**
   * Whether to automatically stop playback when navigating away
   * @default true
   */
  stopOnNavigation?: boolean;

  /**
   * Whether to automatically seek to start when reaching the end
   * @default false
   */
  loopAudio?: boolean;

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

export interface AudioStatus {
  isPlaying: boolean;
  isLoading: boolean;
  isBuffering: boolean;
  position: number;
  duration: number;
  didJustFinish: boolean;
  isLoaded: boolean;
  error: Error | null;
}

/**
 * A hook for managing audio playback in React Native
 *
 * @param audioUrl The URL of the audio file to play
 * @param options Configuration options for audio playback
 * @returns An object with audio control functions and status
 */
export function useAudio(audioUrl: string | null, options: AudioOptions = {}) {
  // Default options
  const {
    enableHaptics = true,
    playsInSilentModeIOS = true,
    hapticStyle = Haptics.ImpactFeedbackStyle.Medium,
    autoUnload = true,
    stopOnNavigation = true,
    loopAudio = false,
    onPlaybackFinish,
    onPlaybackStart,
    onPlaybackPause,
    onError,
  } = options;

  // State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const isMountedRef = useRef(true);
  const positionUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Navigation
  const navigation = useNavigation();

  /**
   * Trigger haptic feedback if enabled
   */
  const triggerHaptics = useCallback(() => {
    if (enableHaptics) {
      Haptics.impactAsync(hapticStyle).catch(() => {
        // Silently fail if haptics are not available
      });
    }
  }, [enableHaptics, hapticStyle]);

  /**
   * Handle playback status updates
   */
  const onPlaybackStatusUpdate = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) {
        // Sound has been unloaded or there was an error
        if (status.error && onError) {
          setError(new Error(status.error));
          onError(status.error);
        }
        return;
      }

      // Update state based on status
      setIsPlaying(status.isPlaying);
      setIsBuffering(status.isBuffering || false);

      if (status.positionMillis !== undefined) {
        setPosition(status.positionMillis);
      }

      if (status.durationMillis !== undefined) {
        setDuration(status.durationMillis);
      }

      // Handle playback finish
      if (status.didJustFinish) {
        setIsPlaying(false);

        if (loopAudio && soundRef.current) {
          // If looping is enabled, seek to start and play again
          soundRef.current
            .setPositionAsync(0)
            .then(() => {
              soundRef.current?.playAsync();
            })
            .catch(err => {
              if (onError) onError(err);
              setError(err);
            });
        } else if (onPlaybackFinish) {
          onPlaybackFinish();
        }
      }
    },
    [loopAudio, onPlaybackFinish, onError]
  );

  /**
   * Load the audio file
   */
  const loadAudio = useCallback(async () => {
    if (!audioUrl) return null;

    try {
      setIsLoading(true);
      setError(null);

      // Unload any existing sound
      await unloadSound();

      // Configure audio mode for iOS
      if (Platform.OS === 'ios' && playsInSilentModeIOS) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS });
      }

      // Create a new sound instance
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      // Store in state and ref
      if (isMountedRef.current) {
        setSound(newSound);
        soundRef.current = newSound;
        setIsLoading(false);
      } else {
        // Component unmounted during loading
        await newSound.unloadAsync();
      }

      return newSound;
    } catch (err) {
      if (isMountedRef.current) {
        setIsLoading(false);
        setError(err instanceof Error ? err : new Error(String(err)));
        if (onError) onError(err);
      }
      return null;
    }
  }, [audioUrl, onPlaybackStatusUpdate, playsInSilentModeIOS, onError]);

  /**
   * Unload the sound and clean up resources
   */
  const unloadSound = useCallback(async () => {
    try {
      const currentSound = soundRef.current;
      if (currentSound) {
        // Stop position updates
        if (positionUpdateIntervalRef.current) {
          clearInterval(positionUpdateIntervalRef.current);
          positionUpdateIntervalRef.current = null;
        }

        // Stop and unload the sound
        await currentSound.stopAsync().catch(() => {});
        await currentSound.unloadAsync().catch(() => {});

        // Clear references
        soundRef.current = null;
        if (isMountedRef.current) {
          setSound(null);
          setIsPlaying(false);
        }
      }
    } catch (err) {
      if (onError) onError(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [onError]);

  /**
   * Play the audio
   */
  const play = useCallback(async () => {
    try {
      triggerHaptics();

      let currentSound = soundRef.current;

      // If no sound is loaded, load it first
      if (!currentSound) {
        currentSound = await loadAudio();
        if (!currentSound) return;
      }

      // Get current status
      const status = await currentSound.getStatusAsync();

      if (status.isLoaded) {
        // If at the end, seek to start
        if (
          status.positionMillis !== undefined &&
          status.durationMillis !== undefined &&
          status.positionMillis >= status.durationMillis - 100
        ) {
          await currentSound.setPositionAsync(0);
        }

        // Play the sound
        await currentSound.playAsync();
        if (onPlaybackStart) onPlaybackStart();
      } else {
        // Sound was unloaded, reload it
        const newSound = await loadAudio();
        if (newSound) {
          await newSound.playAsync();
          if (onPlaybackStart) onPlaybackStart();
        }
      }
    } catch (err) {
      if (onError) onError(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [loadAudio, triggerHaptics, onPlaybackStart, onError]);

  /**
   * Pause the audio
   */
  const pause = useCallback(async () => {
    try {
      triggerHaptics();

      const currentSound = soundRef.current;
      if (currentSound) {
        await currentSound.pauseAsync();
        if (onPlaybackPause) onPlaybackPause();
      }
    } catch (err) {
      if (onError) onError(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [triggerHaptics, onPlaybackPause, onError]);

  /**
   * Toggle between play and pause
   */
  const togglePlayPause = useCallback(async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [isPlaying, play, pause]);

  /**
   * Seek to a specific position in the audio
   */
  const seekTo = useCallback(
    async (positionMillis: number) => {
      try {
        const currentSound = soundRef.current;
        if (currentSound) {
          await currentSound.setPositionAsync(positionMillis);
          setPosition(positionMillis);
        }
      } catch (err) {
        if (onError) onError(err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    [onError]
  );

  /**
   * Stop playback and reset position
   */
  const stop = useCallback(async () => {
    try {
      const currentSound = soundRef.current;
      if (currentSound) {
        await currentSound.stopAsync();
        await currentSound.setPositionAsync(0);
        setPosition(0);
        setIsPlaying(false);
      }
    } catch (err) {
      if (onError) onError(err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [onError]);

  // Load audio when URL changes
  useEffect(() => {
    if (audioUrl) {
      loadAudio().catch(err => {
        if (onError) onError(err);
        setError(err instanceof Error ? err : new Error(String(err)));
      });
    }

    return () => {
      // Cleanup when URL changes
      unloadSound().catch(() => {});
    };
  }, [audioUrl, loadAudio, unloadSound, onError]);

  // Clean up on unmount
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      // Stop position updates
      if (positionUpdateIntervalRef.current) {
        clearInterval(positionUpdateIntervalRef.current);
      }

      // Unload sound if autoUnload is enabled
      if (autoUnload) {
        const currentSound = soundRef.current;
        if (currentSound) {
          currentSound.unloadAsync().catch(() => {});
          soundRef.current = null;
        }
      }
    };
  }, [autoUnload]);

  // Stop audio when navigating away
  useEffect(() => {
    if (!stopOnNavigation || !navigation) return;

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      const currentSound = soundRef.current;
      if (currentSound) {
        currentSound.stopAsync().catch(() => {});
      }
    });

    return unsubscribe;
  }, [navigation, stopOnNavigation]);

  // Return the hook API
  return {
    // Audio control functions
    play,
    pause,
    stop,
    togglePlayPause,
    seekTo,
    loadAudio,
    unloadSound,

    // Audio status
    isPlaying,
    isLoading,
    isBuffering,
    position,
    duration,
    error,

    // Progress helpers
    progress: duration > 0 ? position / duration : 0,

    // Sound instance (for advanced usage)
    sound,
  };
}
