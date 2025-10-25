import { createAudioPlayer, type AudioPlayer, type AudioPlayerOptions } from 'expo-audio';
import { Asset } from 'expo-asset';

// Event constant for playback status updates
const PLAYBACK_STATUS_UPDATE = 'playbackStatusUpdate';

/**
 * Plays the transition sound between playlist tracks
 * Returns a promise that resolves when the sound finishes playing
 */
export async function playTransitionSound(): Promise<void> {
  try {
    // Load the transition sound asset
    const assets = await Asset.loadAsync(require('@/assets/sounds/switch.wav'));
    const asset = assets[0];

    if (!asset?.localUri) {
      console.warn('Transition sound asset not loaded');
      return;
    }

    // Create a dedicated audio player for the transition sound with optimized options
    const playerOptions: AudioPlayerOptions = {
      updateInterval: 100, // More frequent updates for short sound effects
      keepAudioSessionActive: true, // Don't deactivate session after this short sound
    };
    const transitionPlayer: AudioPlayer = createAudioPlayer(asset.localUri, playerOptions);

    // Play the sound
    transitionPlayer.play();

    // Wait for the sound to finish playing using native event subscription
    await new Promise<void>(resolve => {
      let resolved = false;
      let eventSubscription: { remove: () => void } | null = null;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;

        // Remove event subscription
        if (eventSubscription) {
          eventSubscription.remove();
          eventSubscription = null;
        }

        // Cleanup the transition player
        try {
          transitionPlayer.remove();
        } catch {
          // Ignore cleanup errors
        }

        resolve();
      };

      // Subscribe to playback status updates
      eventSubscription = transitionPlayer.addListener(PLAYBACK_STATUS_UPDATE, (status: any) => {
        try {
          const isPlaying = status.playing ?? false;
          const currentTime = status.currentTime ?? 0;
          const duration = status.duration ?? 0;

          // Check if playback has completed
          if (!isPlaying || (duration > 0 && currentTime >= duration - 0.05)) {
            cleanup();
          }
        } catch {
          // If event handling fails, cleanup anyway to prevent blocking
          cleanup();
        }
      });

      // Fallback timeout in case duration detection fails
      // Most UI sounds are < 1 second, so 2 seconds is a safe maximum
      setTimeout(() => {
        cleanup();
      }, 2000);
    });
  } catch (error) {
    // Silently fail - transition sound is non-critical
    console.warn('Failed to play transition sound:', error);
  }
}
