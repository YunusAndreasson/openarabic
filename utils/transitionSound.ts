import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { handleError } from '@/utils/errorHandling';

// The bundled asset itself. expo-audio resolves a module id on its own, so a
// transition no longer waits on an Asset.loadAsync round trip every time.
const TRANSITION_SOUND = require('@/assets/sounds/switch.mp3') as number;

// Fallback for a short UI sound whose finish event never arrives: the queue
// waits on this, so it must not wait forever.
const TRANSITION_SOUND_MAX_MS = 2000;

/**
 * Plays the transition sound between playlist tracks
 * Returns a promise that resolves when the sound finishes playing
 */
export async function playTransitionSound(): Promise<void> {
  let player: AudioPlayer | null = null;
  let subscription: { remove: () => void } | null = null;
  let fallback: ReturnType<typeof setTimeout> | undefined;

  try {
    player = createAudioPlayer(TRANSITION_SOUND, {
      updateInterval: 100,
      keepAudioSessionActive: true,
    });

    // Finished means the native end-of-clip event, not a `playing` flip from
    // true to false — a flip also happens on an interruption, and is missed
    // entirely when the first status update already reads not-playing.
    const { promise: finished, resolve } = Promise.withResolvers<undefined>();
    subscription = player.addListener('playbackStatusUpdate', status => {
      if (status.didJustFinish) resolve(undefined);
    });
    fallback = setTimeout(() => resolve(undefined), TRANSITION_SOUND_MAX_MS);

    // Ensure volume is set (in case it defaults to 0)
    player.volume = 1.0;
    player.play();

    await finished;
  } catch (error) {
    // Transition sound is non-critical - silent failure
    void handleError(error, {
      showToast: false,
      captureSentry: false,
    });
  } finally {
    // However it settled, nothing of this sound outlives it.
    clearTimeout(fallback);
    subscription?.remove();
    player?.remove();
  }
}
