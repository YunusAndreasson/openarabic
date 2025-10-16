import { useCallback } from 'react';

import { useMountSafety } from '@/hooks/common/useMountSafety';
import { handleError } from '@/utils/errorHandling';
import { generateWordAudioTrack, type WordAudioData } from '@/utils/audioUtils';
import { lightFeedback } from '@/utils/haptics';

import { useSimpleAudioPlayer } from './useSimpleAudioPlayer';

// Re-export for convenience
export type { WordAudioData };

export interface UseWordAudioPlaybackOptions {
  /** Whether to show toast on error (default: false for inline playback) */
  showErrorToast?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Whether to provide haptic feedback (default: true) */
  enableHaptics?: boolean;
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
 *   enableHaptics: true,
 * });
 *
 * // Later...
 * await playWordAudio(word);
 * ```
 */
export function useWordAudioPlayback(options: UseWordAudioPlaybackOptions = {}) {
  const { showErrorToast = false, errorMessage, enableHaptics = true } = options;
  const isMountedRef = useMountSafety();
  const { play } = useSimpleAudioPlayer();

  const playWordAudio = useCallback(
    async (word: WordAudioData) => {
      if (!isMountedRef.current) return;

      // Haptic feedback
      if (enableHaptics) {
        lightFeedback();
      }

      try {
        // Generate audio track using shared utility
        const track = generateWordAudioTrack(word);

        if (!track) {
          return;
        }

        // Play audio through hook (proper layering)
        await play(track);
      } catch (error) {
        if (!isMountedRef.current) return;

        handleError(error instanceof Error ? error : new Error(String(error)), {
          showToast: showErrorToast,
          toastMessage: errorMessage || 'Word audio playback failed',
        });
      }
    },
    [showErrorToast, errorMessage, enableHaptics, isMountedRef, play]
  );

  return playWordAudio;
}
