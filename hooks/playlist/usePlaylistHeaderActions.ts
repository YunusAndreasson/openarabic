import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { audioQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { enhancedAudioService } from '@/services/audioPlaylist';
import { simpleAudioService } from '@/services/audioPlayer';
import { useAppSelector } from '@/store/hooks';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { AudioLanguage, ToastType } from '@/types/enums';
import { isAudioBusy } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { mediumFeedback, selectionFeedback } from '@/utils/haptics';
import { shuffleArray } from '@/utils/list';

const NO_ARTICLES_MESSAGE = 'No articles to play';

/**
 * Hook for playlist header actions (Play All button)
 * Uses cached data from React Query - relies on playlist screen to fetch data
 */
export function usePlaylistHeaderActions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);
  const audioShuffleEnabled = useAppSelector(state => state.settings.audioShuffleEnabled);

  // Get cached tracks from React Query
  const getCachedTracks = useCallback((): EnhancedAudioTrack[] => {
    if (!user?.id) return [];
    const cached = queryClient.getQueryData<EnhancedAudioTrack[]>(
      audioQueries.tracks(user.id, audioPreference).queryKey,
    );
    return cached ?? [];
  }, [user?.id, queryClient, audioPreference]);

  const handlePlayAll = useCallback(
    async (forceArabicOnly = false) => {
      if (isLoading || isAudioBusy()) return;

      const tracks = getCachedTracks();
      if (!tracks.length) {
        showToast(NO_ARTICLES_MESSAGE, DEFAULT_TOAST_DURATION, ToastType.INFO);
        return;
      }

      try {
        setIsLoading(true);
        selectionFeedback();

        // Track analytics
        analytics.track(ANALYTICS_EVENTS.AUDIO_PLAY_ALL_STARTED, {
          article_count: tracks.length,
          source: 'header_button',
          shuffle_enabled: audioShuffleEnabled,
        });

        // Get tracks with override preference if Arabic-only
        const effectivePreference = forceArabicOnly ? AudioLanguage.ARABIC_ONLY : audioPreference;
        const effectiveTracks =
          forceArabicOnly && user?.id
            ? await enhancedAudioService.getReadingListEnhancedTracks(user.id, effectivePreference)
            : tracks;

        // Shuffle if enabled
        const tracksToPlay = audioShuffleEnabled ? shuffleArray(effectiveTracks) : effectiveTracks;

        await simpleAudioService.playPlaylist(tracksToPlay);
      } catch (error) {
        handleError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, getCachedTracks, showToast, audioShuffleEnabled, audioPreference, user?.id],
  );

  const handlePlayAllArabicOnly = useCallback(async () => {
    mediumFeedback();
    showToast(STRINGS.PLAYING_ARABIC_ONLY_THIS_SESSION, DEFAULT_TOAST_DURATION, ToastType.INFO, 'bottom');
    await handlePlayAll(true);
  }, [handlePlayAll, showToast]);

  // Check if there are any tracks available
  const hasArticles = getCachedTracks().length > 0;

  return {
    handlePlayAll: () => handlePlayAll(false),
    handlePlayAllArabicOnly,
    isLoading,
    hasArticles,
  };
}
