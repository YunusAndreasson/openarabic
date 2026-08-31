import { useCallback, useRef, useSyncExternalStore } from 'react';

import { simpleAudioService } from '@/services/audioPlayer';

/**
 * Centralized audio service subscription hook
 * Prevents multiple subscriptions and memory leaks
 *
 * Transport only: started / stopped / loaded / buffering / finished / failed.
 * Play-head ticks do not reach this hook at all — the service filters them
 * (see TRANSPORT_KEYS in services/audioPlayer.ts), because the review lane runs
 * its player at a 100 ms status interval and every consumer of this hook used
 * to re-render ten times a second for the whole of every prompt.
 *
 * If you need the clock, use `useAudioProgressSubscription` instead, and mount
 * it as close to the thing drawing the play head as possible.
 */
export function useAudioSubscription() {
  return useAudioStatusSubscription(false);
}

/**
 * The same status, plus whole-second `currentTime` / `duration` ticks. The only
 * consumer is the MiniPlayer clock, which renders whole seconds and already
 * discards sub-second positions. Filtering at the subscription boundary avoids
 * a React commit for every native 500 ms status event (and every 100 ms review
 * event) without changing anything the player can display.
 */
export function useAudioProgressSubscription() {
  return useAudioStatusSubscription(true);
}

function useAudioStatusSubscription(withPosition: boolean) {
  const snapshotRef = useRef(simpleAudioService.getStatus());

  const subscribe = useCallback(
    (onStoreChange: () => void) =>
      simpleAudioService.subscribe(
        newStatus => {
          const previousStatus = snapshotRef.current;
          const didChange =
            previousStatus.playing !== newStatus.playing ||
            previousStatus.isLoaded !== newStatus.isLoaded ||
            previousStatus.isBuffering !== newStatus.isBuffering ||
            previousStatus.playbackState !== newStatus.playbackState ||
            previousStatus.didJustFinish !== newStatus.didJustFinish ||
            previousStatus.error !== newStatus.error ||
            (withPosition &&
              (Math.floor(previousStatus.currentTime) !== Math.floor(newStatus.currentTime) ||
                Math.floor(previousStatus.duration) !== Math.floor(newStatus.duration))) ||
            (previousStatus.currentTrack?.id ?? null) !== (newStatus.currentTrack?.id ?? null);

          if (!didChange) return;
          snapshotRef.current = newStatus;
          onStoreChange();
        },
        { position: withPosition },
      ),
    [withPosition],
  );

  const getSnapshot = useCallback(() => snapshotRef.current, []);
  const status = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return { status };
}
