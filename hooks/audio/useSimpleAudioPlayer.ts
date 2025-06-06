import { Audio } from 'expo-av';
import { useState, useCallback } from 'react';

import { handleError } from '@/utils/errorHandling';

/**
 * A simple hook for playing individual audio files
 */
export function useSimpleAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);

  /**
   * Play audio from a URL
   */
  const playAudio = useCallback(
    async (audioUrl: string | null): Promise<Audio.Sound | undefined> => {
      if (!audioUrl) return;

      try {
        // Configure audio mode
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });

        // Load and play the sound
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl }, { shouldPlay: true });

        setIsPlaying(true);

        // Set up completion handler
        sound.setOnPlaybackStatusUpdate(status => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
            sound.unloadAsync().catch(error => {
              handleError(error instanceof Error ? error : new Error('Failed to unload audio'));
            });
          }
        });

        // Start playback
        await sound.playAsync();

        return sound;
      } catch (error) {
        setIsPlaying(false);
        handleError(error instanceof Error ? error : new Error('Failed to play audio'));
        return undefined;
      }
    },
    []
  );

  return {
    isPlaying,
    playAudio,
  };
}
