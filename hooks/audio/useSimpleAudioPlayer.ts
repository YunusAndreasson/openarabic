import { useEffect, useState } from 'react';

import { AUDIO_STATES } from '@/constants/audio';
import { simpleAudioService, type AudioStatus } from '@/services/simpleAudioService';

/**
 * Simple audio hook - just listens to service status
 * No complex state management or reducers
 */
export function useSimpleAudioPlayer() {
  const [status, setStatus] = useState<AudioStatus>(() => simpleAudioService.getStatus());

  useEffect(() => {
    // Subscribe to status updates
    const unsubscribe = simpleAudioService.subscribe(setStatus);

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  // Map service status to hook interface
  return {
    audioState: status.isPlaying
      ? AUDIO_STATES.PLAYING
      : status.isLoading
      ? AUDIO_STATES.LOADING
      : AUDIO_STATES.IDLE,
    isLoading: status.isLoading,
    position: status.currentTime,
    duration: status.duration,
    metadata: {
      articleId: status.currentTrack?.articleId?.toString(),
      articleTitle: status.currentTrack?.title,
    },
    // Direct service methods
    play: simpleAudioService.play.bind(simpleAudioService),
    pause: simpleAudioService.pause.bind(simpleAudioService),
    stop: simpleAudioService.stop.bind(simpleAudioService),
  };
}
