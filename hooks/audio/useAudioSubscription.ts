import { useEffect, useState } from 'react';

import { useMountSafety } from '@/hooks/common/useMountSafety';
import type { AudioStatus } from '@/services/simpleAudioService';
import { simpleAudioService } from '@/services/simpleAudioService';

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

      setStatus(prev => {
        if (!prev) return newStatus;

        const didChange =
          prev.isPlaying !== newStatus.isPlaying ||
          prev.isLoading !== newStatus.isLoading ||
          Math.abs(prev.currentTime - newStatus.currentTime) >= 0.1 ||
          Math.floor(prev.duration) !== Math.floor(newStatus.duration) ||
          (prev.currentTrack?.id ?? null) !== (newStatus.currentTrack?.id ?? null);

        return didChange ? newStatus : prev;
      });
    });

    return unsubscribe;
  }, [isMountedRef]);

  return {
    status,
    isMounted: isMountedRef.current,
  };
}
