import { useCallback } from 'react';

import { useMountSafety } from '@/hooks/common/useMountSafety';
import { handleError } from '@/utils/errorHandling';
import { generateWordAudioTrack, type WordAudioData } from '@/utils/audioUtils';

import { useSimpleAudioPlayer } from './useSimpleAudioPlayer';

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
  const { play } = useSimpleAudioPlayer();

  const playWordAudio = useCallback(
    async (word: WordAudioData) => {
      if (!isMountedRef.current) return;

      try {
        // Generate audio track using shared utility (now async to use cached paths)
        const track = await generateWordAudioTrack(word);

        if (!track) {
          return;
        }

        // Play audio through hook (proper layering)
        await play(track);
      } catch (error) {
        if (!isMountedRef.current) return;

        void handleError(error, {
          showToast: showErrorToast,
          toastMessage: 'Word audio playback failed',
        });
      }
    },
    [showErrorToast, isMountedRef, play],
  );

  return playWordAudio;
}
