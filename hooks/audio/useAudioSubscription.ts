import { useEffect, useState } from 'react';

import { useMountSafety } from '@/hooks/common/useMountSafety';
import type { AudioStatus } from '@/services/audioPlayer';
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
 * The same status, plus `currentTime` / `duration` ticks. One consumer: the
 * playback clock behind `AudioProgressContext`.
 */
export function useAudioProgressSubscription() {
  return useAudioStatusSubscription(true);
}

function useAudioStatusSubscription(withPosition: boolean) {
  const [status, setStatus] = useState<AudioStatus>(() => simpleAudioService.getStatus());
  const isMountedRef = useMountSafety();

  // Single subscription to audio service
  useEffect(() => {
    const unsubscribe = simpleAudioService.subscribe(
      newStatus => {
        if (!isMountedRef.current) return;

        // Dedup at the React boundary so identical-status events don't re-render.
        // The service already filters position ticks out of the transport
        // channel, so the position comparison below only ever runs for the
        // clock subscriber that asked for them.
        setStatus(prev => {
          if (!prev) return newStatus;

          const didChange =
            prev.playing !== newStatus.playing ||
            prev.isLoaded !== newStatus.isLoaded ||
            prev.isBuffering !== newStatus.isBuffering ||
            prev.playbackState !== newStatus.playbackState ||
            prev.didJustFinish !== newStatus.didJustFinish ||
            prev.error !== newStatus.error ||
            (withPosition &&
              (Math.abs(prev.currentTime - newStatus.currentTime) >= 0.1 ||
                Math.floor(prev.duration) !== Math.floor(newStatus.duration))) ||
            (prev.currentTrack?.id ?? null) !== (newStatus.currentTrack?.id ?? null);

          return didChange ? newStatus : prev;
        });
      },
      { position: withPosition },
    );

    return unsubscribe;
  }, [isMountedRef, withPosition]);

  return { status };
}
