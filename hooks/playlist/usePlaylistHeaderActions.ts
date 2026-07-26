import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { useToast } from '@/components/providers';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { DEFAULT_TOAST_DURATION } from '@/constants/animation';
import { audioQueries } from '@/constants/queries';
import { useAuth } from '@/hooks/auth/useAuth';
import { analytics } from '@/services/analytics';
import { simpleAudioService } from '@/services/audioPlayer';
import { useAppSelector } from '@/store/hooks';
import type { EnhancedAudioTrack } from '@/types/audio.types';
import { ToastType } from '@/types/enums';
import { OnboardingStep } from '@/constants/onboarding';
import { isAudioBusy } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { shuffleArray } from '@/utils/list';
import { markOnboardingStep } from '@/utils/onboardingStorage';

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

  const handlePlayAll = useCallback(async () => {
    if (isLoading || isAudioBusy()) return;

    const tracks = getTracks();
    if (!tracks.length) {
      showToast(NO_ARTICLES_MESSAGE, DEFAULT_TOAST_DURATION, ToastType.INFO);
      return;
    }

    try {
      setIsLoading(true);
      selectionFeedback();

      analytics.track(ANALYTICS_EVENTS.AUDIO_PLAY_ALL_STARTED, {
        article_count: tracks.length,
        source: 'header_button',
        shuffle_enabled: audioShuffleEnabled,
      });

      const tracksToPlay = audioShuffleEnabled ? shuffleArray(tracks) : tracks;
      const success = await simpleAudioService.playPlaylist(tracksToPlay);
      if (success) {
        void markOnboardingStep(OnboardingStep.LISTEN_AUDIO);
      }
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, getTracks, showToast, audioShuffleEnabled]);

  return {
    handlePlayAll,
    isLoading,
  };
}
