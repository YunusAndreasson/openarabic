import { useCallback } from 'react';

import { useMountSafety } from '@/hooks/common/useMountSafety';
import { simpleAudioService, type AudioPlayOptions } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';

import { useAudioSubscription } from './useAudioSubscription';

/**
 * Hook for simple audio player functionality
 */
export const useSimpleAudioPlayer = () => {
  const { status } = useAudioSubscription();
  const isMountedRef = useMountSafety();

  // Play function. `options` is forwarded verbatim so callers that need to tune
  // load/status behaviour for their lane (the review prompt caps its ready wait
  // and ticks status faster, because the microphone is gated on end-of-clip)
  // don't have to reach past this hook to the service.
  const play = useCallback(
    async (track: EnhancedAudioTrack, options?: AudioPlayOptions): Promise<boolean> => {
      if (!isMountedRef.current) return false;
      return await simpleAudioService.play(track, options);
    },
    [isMountedRef],
  );

  // Stop function
  const stop = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.stop();
  }, [isMountedRef]);

  // Seek function
  const seekTo = useCallback(
    async (position: number): Promise<void> => {
      if (!isMountedRef.current) return;
      await simpleAudioService.seekTo(position);
    },
    [isMountedRef],
  );

  // Pre-configure audio session function
  const preconfigureAudioSession = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;
    await simpleAudioService.preconfigureAudioSession();
  }, [isMountedRef]);

  // isLoading is derived (not stored): the service now mirrors expo-audio's
  // native AudioStatus, which exposes isLoaded + isBuffering. We gate on
  // currentTrack so the initial "nothing loaded yet" state isn't reported
  // as loading.
  const currentTrack = status?.currentTrack ?? null;
  const isLoaded = status?.isLoaded ?? false;
  const isBuffering = status?.isBuffering ?? false;
  const isLoading = currentTrack !== null && (!isLoaded || isBuffering);

  return {
    playing: status?.playing ?? false,
    isLoading,
    currentTime: status?.currentTime ?? 0,
    duration: status?.duration ?? 0,
    currentTrack,

    play,
    stop,
    seekTo,
    preconfigureAudioSession,

    status,
  };
};
