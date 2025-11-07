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
    const [asset] = await Asset.loadAsync(require('@/assets/sounds/switch.mp3'));
    if (!asset?.localUri) return;

    // Create and start player
    player = createAudioPlayer(asset.localUri, {
      updateInterval: 100,
      keepAudioSessionActive: true,
    });
    player.play();

    // Wait for completion with timeout fallback
    await new Promise<void>(resolve => {
      let completed = false;
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
            if (!status.playing) complete();
          },
        );
      }

      // Fallback timeout for short UI sounds
      setTimeout(complete, 2000);
    });
  } catch (error) {
    // Transition sound is non-critical - don't send to Sentry but log for debugging
    handleError(error as Error, {
      showToast: false,
      captureSentry: false,
    });
  } finally {
    // Always cleanup player
    player?.remove();
  }
}
