import { useCallback } from 'react';

import {
  currentAudioTrack,
  isAudioLoading,
  isAudioPlaying,
} from '@/hooks/audio/articleAudioStatus';
import { useAudioSelector } from '@/hooks/audio/useAudioSelector';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { simpleAudioService, type AudioPlayOptions } from '@/services/audioPlayer';
import type { EnhancedAudioTrack } from '@/types/audio.types';

/**
 * Hook for simple audio player functionality.
 *
 * Transport state only — deliberately no `currentTime` / `duration`. This hook
 * reads the service's transport channel, which does not deliver play-head
 * ticks (see TRANSPORT_KEYS in services/audioPlayer.ts), so exposing a
 * position here would hand every caller a number that silently stops
 * advancing. The one consumer that needs a clock reads `useAudioProgress`.
 *
 * A caller that only issues commands should call `simpleAudioService`
 * directly: subscribing to the status it never reads re-renders it on every
 * transport change for nothing.
 */
export const useSimpleAudioPlayer = () => {
  const playing = useAudioSelector(isAudioPlaying);
  const isLoading = useAudioSelector(isAudioLoading);
  const currentTrack = useAudioSelector(currentAudioTrack);
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
  const stop = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return false;
    return await simpleAudioService.stop();
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

  return {
    playing,
    isLoading,
    currentTrack,

    play,
    stop,
    seekTo,
    preconfigureAudioSession,
  };
};
