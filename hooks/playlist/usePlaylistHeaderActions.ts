import { useCallback, useState } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';
import { useStartArticlePlayback } from '@/hooks/audio/useStartArticlePlayback';
import { useSortedEnhancedTracks } from '@/hooks/playlist/useSortedEnhancedTracks';
import { analytics } from '@/services/analytics';
import { useAppSelector } from '@/store/hooks';
import { ToastType } from '@/types/enums';
import { isAudioBusy } from '@/utils/audioUtils';
import { selectionFeedback } from '@/utils/haptics';
import { shuffleArray } from '@/utils/list';

/**
 * Hook for playlist header actions (Play All button).
 *
 * Plays the tracks in the order the screen below shows them (see
 * useSortedEnhancedTracks), through the same start path as the rest of the app.
 */
export function usePlaylistHeaderActions() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const audioShuffleEnabled = useAppSelector(state => state.settings.audioShuffleEnabled);
  const { sortedEnhancedTracks } = useSortedEnhancedTracks();
  const startArticlePlayback = useStartArticlePlayback();

  const handlePlayAll = useCallback(async () => {
    if (isLoading || isAudioBusy()) return;

    if (!sortedEnhancedTracks.length) {
      showToast(STRINGS.PLAY_ALL_NOTHING_TO_PLAY, DEFAULT_TOAST_DURATION, ToastType.INFO);
      return;
    }

    setIsLoading(true);
    selectionFeedback();

    void analytics.track(ANALYTICS_EVENTS.AUDIO_PLAY_ALL_STARTED, {
      article_count: sortedEnhancedTracks.length,
      source: 'header_button',
      shuffle_enabled: audioShuffleEnabled,
    });

    const tracksToPlay = audioShuffleEnabled
      ? shuffleArray(sortedEnhancedTracks)
      : sortedEnhancedTracks;
    // Never rejects, so the spinner always comes back down.
    await startArticlePlayback(tracksToPlay, { source: 'header_button' });
    setIsLoading(false);
  }, [isLoading, sortedEnhancedTracks, showToast, audioShuffleEnabled, startArticlePlayback]);

  return {
    handlePlayAll,
    isLoading,
  };
}
