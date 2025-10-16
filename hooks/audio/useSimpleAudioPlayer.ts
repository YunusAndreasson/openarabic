import { useCallback } from 'react';

import { useMountSafety } from '@/hooks/common/useMountSafety';
import { simpleAudioService } from '@/services/simpleAudioService';
import type { EnhancedAudioTrack } from '@/types/audio.types';

import { useAudioSubscription } from './useAudioSubscription';

/**
 * Hook for simple audio player functionality
 */
export const useSimpleAudioPlayer = () => {
  const { status } = useAudioSubscription();
  const isMountedRef = useMountSafety();

  // Play function
  const play = useCallback(
    async (track: EnhancedAudioTrack): Promise<boolean> => {
      if (!isMountedRef.current) return false;
      return await simpleAudioService.play(track);
    },
    [isMountedRef]
  );

  // Pause function
  const pause = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.pause();
  }, [isMountedRef]);

  // Resume function
  const resume = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.resume();
  }, [isMountedRef]);

  // Stop function
  const stop = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.stop();
  }, [isMountedRef]);

  // Pre-configure audio session function
  const preconfigureAudioSession = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.preconfigureAudioSession();
  }, [isMountedRef]);

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
    resume,
    stop,
    preconfigureAudioSession,

    // Full status object for advanced use cases
    status,
  };
};
