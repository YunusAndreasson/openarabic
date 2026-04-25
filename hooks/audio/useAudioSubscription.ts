import { useEffect, useState } from 'react';

import { useMountSafety } from '@/hooks/common/useMountSafety';
import type { AudioStatus } from '@/services/audioPlayer';
import { simpleAudioService } from '@/services/audioPlayer';

/**
 * Centralized audio service subscription hook
 * Prevents multiple subscriptions and memory leaks
 */
export function useAudioSubscription() {
  const [status, setStatus] = useState<AudioStatus>(() => simpleAudioService.getStatus());
  const isMountedRef = useMountSafety();

  // Single subscription to audio service
  useEffect(() => {
    const unsubscribe = simpleAudioService.subscribe(newStatus => {
      if (!isMountedRef.current) return;

      // Dedup at the React boundary so identical-status events don't re-render.
      // The service no longer pre-throttles; native updateInterval (500ms) is the
      // only upstream cap.
      setStatus(prev => {
        if (!prev) return newStatus;

        const didChange =
          prev.playing !== newStatus.playing ||
          prev.isLoaded !== newStatus.isLoaded ||
          prev.isBuffering !== newStatus.isBuffering ||
          Math.abs(prev.currentTime - newStatus.currentTime) >= 0.1 ||
          Math.floor(prev.duration) !== Math.floor(newStatus.duration) ||
          (prev.currentTrack?.id ?? null) !== (newStatus.currentTrack?.id ?? null);

        return didChange ? newStatus : prev;
      });
    });

    return unsubscribe;
  }, [isMountedRef]);

  return { status };
}
