import { useCallback } from 'react';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { OnboardingStep } from '@/constants/onboarding';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { analytics } from '@/services/analytics';
import { simpleAudioService } from '@/services/audioPlayer';
import {
  enhancedAudioService,
  warmTrackCache,
  type AudioTrackArticle,
} from '@/services/audioPlaylist';
import { useAppSelector } from '@/store/hooks';
import type { ArticleId } from '@/types/branded.types';
import { isAudioBusy } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { selectionFeedback } from '@/utils/haptics';
import { markOnboardingStep } from '@/utils/onboardingStorage';

/**
 * In-article "Listen" control.
 * Starts this article's audio as a single-track playlist so lock-screen
 * controls activate and playback survives leaving the screen (podcast-style);
 * the global MiniPlayer is the ongoing control surface. The bilingual/Arabic
 * track choice follows the user's audio language preference, with automatic
 * Arabic-only fallback when no bilingual audio exists — so the control is
 * always available.
 */
export function useArticleListen(
  articleId: ArticleId | undefined,
  articleTitle?: string,
  /** The article the reader already has loaded. Passed through so the track can
   *  be built without refetching it (see generateEnhancedAudioTrack). */
  article?: AudioTrackArticle | null,
) {
  const { playing, isLoading, currentArticle } = useGlobalAudioState();
  const audioPreference = useAppSelector(state => state.settings.audioLanguagePreference);

  const isCurrentAudioForThisArticle = articleId !== undefined && currentArticle?.id === articleId;
  const isListeningToThisArticle = playing && isCurrentAudioForThisArticle;
  const isListenLoading = isLoading && isCurrentAudioForThisArticle;

  const handleToggleListen = useCallback(async () => {
    if (!articleId || isAudioBusy()) return;

    if (isListeningToThisArticle) {
      selectionFeedback();
      await simpleAudioService.stop();
      return;
    }

    try {
      selectionFeedback();
      const track = await enhancedAudioService.generateEnhancedAudioTrack(
        articleId,
        audioPreference,
        article,
      );
      // On failure the service already showed an error toast
      if (!track) return;

      const success = await simpleAudioService.playPlaylist([track]);
      if (success) {
        // Playback is live — now it's safe to pull the file down for next time
        // without stealing bandwidth from the stream that just started.
        warmTrackCache(track);
        void analytics.track(ANALYTICS_EVENTS.AUDIO_PLAYBACK_STARTED, {
          article_id: articleId,
          article_title: articleTitle ?? track.title,
          source: 'article_reader',
          playlist_total: 1,
        });
        void markOnboardingStep(OnboardingStep.LISTEN_AUDIO);
      }
    } catch (error) {
      void handleError(error);
    }
  }, [articleId, articleTitle, audioPreference, article, isListeningToThisArticle]);

  return {
    isListeningToThisArticle,
    isListenLoading,
    handleToggleListen,
  };
}
