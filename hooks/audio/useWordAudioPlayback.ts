import { useCallback } from 'react';

import { STRINGS } from '@/constants/strings';
import { useMountSafety } from '@/hooks/common/useMountSafety';
import { simpleAudioService } from '@/services/audioPlayer';
import { handleError } from '@/utils/errorHandling';
import { generateWordAudioTrack, type WordAudioData } from '@/utils/audioUtils';

// Re-export for convenience
export type { WordAudioData };

export interface UseWordAudioPlaybackOptions {
  /** Whether to show toast on error (default: false for inline playback) */
  showErrorToast?: boolean;
}

/**
 * Hook for playing word audio with consistent behavior
 * Consolidates duplicate audio playback logic across components
 *
 * @param options - Configuration options for audio playback
 * @returns Function to play audio for a given word
 *
 * @example
 * ```typescript
 * const playWordAudio = useWordAudioPlayback({
 *   showErrorToast: false,
 * });
 *
 * // Later...
 * await playWordAudio(word);
 * ```
 */
export function useWordAudioPlayback(options: UseWordAudioPlaybackOptions = {}) {
  const { showErrorToast = false } = options;
  const isMountedRef = useMountSafety();

  // Commands only, so the service is called directly: subscribing to its
  // status through useSimpleAudioPlayer re-rendered every word row on every
  // transport change, for a value it never read.
  const playWordAudio = useCallback(
    async (word: WordAudioData) => {
      try {
        // Generate audio track using shared utility (now async to use cached paths)
        const track = await generateWordAudioTrack(word);

        if (!track) {
          return;
        }
        // The word may have left the screen while its audio resolved.
        if (!isMountedRef.current) return;

        await simpleAudioService.play(track);
      } catch (error) {
        if (!isMountedRef.current) return;

        void handleError(error, {
          showToast: showErrorToast,
          toastMessage: STRINGS.WORD_AUDIO_PLAY_FAILED,
        });
      }
    },
    [showErrorToast, isMountedRef],
  );

  return playWordAudio;
}
