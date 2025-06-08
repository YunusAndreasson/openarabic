import { useAudioPlayer } from './useAudioPlayer';

/**
 * Hook that provides an isolated audio player instance
 * This prevents conflicts when multiple screens try to use audio simultaneously
 */
export function useAudioPlayerInstance() {
  return useAudioPlayer();
}
