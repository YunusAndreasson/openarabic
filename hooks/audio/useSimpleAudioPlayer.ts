import { useCallback, useEffect, useRef, useState } from 'react';

import type { AudioStatus } from '@/services/simpleAudioService';
import { simpleAudioService } from '@/services/simpleAudioService';
import type { EnhancedAudioTrack } from '@/types/audio.types';

/**
 * Hook for simple audio player functionality
 */
export const useSimpleAudioPlayer = () => {
  const [status, setStatus] = useState<AudioStatus>(() => simpleAudioService.getStatus());
  const isMountedRef = useRef(true);

  // Subscribe to status updates
  useEffect(() => {
    const unsubscribe = simpleAudioService.subscribe(newStatus => {
      if (isMountedRef.current) {
        setStatus(newStatus);
      }
    });

    return unsubscribe;
  }, []);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Play function
  const play = useCallback(async (track: EnhancedAudioTrack): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    return await simpleAudioService.play(track);
  }, []);

  // Pause function
  const pause = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.pause();
  }, []);

  // Stop function
  const stop = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.stop();
  }, []);

  return {
    // Status with safe defaults
    isPlaying: status?.isPlaying ?? false,
    isLoading: status?.isLoading ?? false,
    currentTime: status?.currentTime ?? 0,
    duration: status?.duration ?? 0,
    currentTrack: status?.currentTrack ?? null,

    // Actions
    play,
    pause,
    stop,

    // Full status object for advanced use cases
    status,
  };
};
