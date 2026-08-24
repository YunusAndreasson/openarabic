import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';

import { handleError } from '@/utils/errorHandling';

/**
 * Plays the transition sound between playlist tracks
 * Returns a promise that resolves when the sound finishes playing
 */
export async function playTransitionSound(): Promise<void> {
  let player: AudioPlayer | null = null;

  try {
    // Load and validate asset
    const [asset] = await Asset.loadAsync(require('@/assets/sounds/switch.mp3') as number);
    if (!asset?.localUri) return;

    // Create and start player
    player = createAudioPlayer(asset.localUri, {
      updateInterval: 100,
      keepAudioSessionActive: true,
    });

    // Ensure volume is set (in case it defaults to 0)
    player.volume = 1.0;
    player.play();

    // Wait for completion with timeout fallback
    await new Promise<void>(resolve => {
      let completed = false;
      let hasStartedPlaying = false;
      let subscription: { remove: () => void } | null = null;

      const complete = () => {
        if (completed) return;
        completed = true;
        subscription?.remove();
        resolve();
      };

      // Listen for playback completion
      if (player) {
        subscription = player.addListener(
          'playbackStatusUpdate',
          (status: { playing?: boolean }) => {
            // Track when playback starts
            if (status.playing) {
              hasStartedPlaying = true;
            }
            // Only complete after playback has started AND stopped
            if (hasStartedPlaying && !status.playing) {
              complete();
            }
          },
        );
      }

      // Fallback timeout for short UI sounds
      setTimeout(complete, 2000);
    });
  } catch (error) {
    // Transition sound is non-critical - silent failure
    void handleError(error, {
      showToast: false,
      captureSentry: false,
    });
  } finally {
    // Always cleanup player
    player?.remove();
  }
}
