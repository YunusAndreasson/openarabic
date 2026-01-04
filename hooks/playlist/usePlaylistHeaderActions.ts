import { useQuery } from '@tanstack/react-query';
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
 * Subscribes to React Query cache - updates when playlist screen fetches data
 */
export function usePlaylistHeaderActions() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);
  const audioShuffleEnabled = useAppSelector(state => state.settings.audioShuffleEnabled);

  // Subscribe to cache updates - doesn't fetch, just watches for changes
  const { data: cachedTracks = [] } = useQuery({
    ...audioQueries.tracks(user?.id ?? '', audioPreference),
    enabled: !!user?.id,
    staleTime: Infinity, // Never refetch - just subscribe to cache
  });

  // Get tracks for playback (uses cached data)
  const getTracks = useCallback((): EnhancedAudioTrack[] => {
    return cachedTracks;
  }, [cachedTracks]);

  const handlePlayAll = useCallback(
    async (forceArabicOnly = false) => {
      if (isLoading || isAudioBusy()) return;

      const tracks = getTracks();
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
    [isLoading, getTracks, showToast, audioShuffleEnabled, audioPreference, user?.id],
  );

  const handlePlayAllArabicOnly = useCallback(async () => {
    mediumFeedback();
    showToast(STRINGS.PLAYING_ARABIC_ONLY_THIS_SESSION, DEFAULT_TOAST_DURATION, ToastType.INFO, 'bottom');
    await handlePlayAll(true);
  }, [handlePlayAll, showToast]);

  // Check if there are any tracks available (reactive to cache updates)
  const hasArticles = cachedTracks.length > 0;

  return {
    handlePlayAll: () => handlePlayAll(false),
    handlePlayAllArabicOnly,
    isLoading,
    hasArticles,
  };
}
