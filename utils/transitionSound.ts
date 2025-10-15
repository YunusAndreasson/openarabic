import { createAudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';

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

    // Create a dedicated audio player for the transition sound
    const transitionPlayer = createAudioPlayer(asset.localUri);

    // Play the sound
    await transitionPlayer.play?.();

    // Wait for the sound to finish playing
    // Poll the player status until it completes
    await new Promise<void>((resolve) => {
      const pollInterval = setInterval(() => {
        try {
          const isPlaying = transitionPlayer.playing || false;
          const currentTime = transitionPlayer.currentTime ?? 0;
          const duration = transitionPlayer.duration ?? 0;

          // Normalize to seconds if in milliseconds
          const currentTimeSeconds = currentTime > 600 ? currentTime / 1000 : currentTime;
          const durationSeconds = duration > 600 ? duration / 1000 : duration;

          // Check if playback has completed
          if (!isPlaying || (durationSeconds > 0 && currentTimeSeconds >= durationSeconds - 0.05)) {
            clearInterval(pollInterval);

            // Cleanup the transition player
            try {
              transitionPlayer.remove?.();
            } catch {
              // Ignore cleanup errors
            }

            resolve();
          }
        } catch {
          // If polling fails, resolve anyway to prevent blocking
          clearInterval(pollInterval);
          try {
            transitionPlayer.remove?.();
          } catch {
            // Ignore cleanup errors
          }
          resolve();
        }
      }, 100); // Poll every 100ms for smooth detection

      // Fallback timeout in case duration detection fails
      // Most UI sounds are < 1 second, so 2 seconds is a safe maximum
      setTimeout(() => {
        clearInterval(pollInterval);
        try {
          transitionPlayer.remove?.();
        } catch {
          // Ignore cleanup errors
        }
        resolve();
      }, 2000);
    });
  } catch (error) {
    // Silently fail - transition sound is non-critical
    console.warn('Failed to play transition sound:', error);
  }
}
