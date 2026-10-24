import { useCallback } from 'react';

import { isArticleAudioPaused } from '@/hooks/audio/articleAudioStatus';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useStartArticlePlayback } from '@/hooks/audio/useStartArticlePlayback';
import { simpleAudioService } from '@/services/audioPlayer';
import { enhancedAudioService, type AudioTrackArticle } from '@/services/audioPlaylist';
import { useAppSelector } from '@/store/hooks';
import { selectAudioLanguage } from '@/store/settingsSlice';
import type { ArticleId } from '@/types/branded.types';
import { isAudioBusy } from '@/utils/audioUtils';

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
  /** Unused: the track carries the article's own title. */
  _articleTitle?: string,
  /** The article the reader already has loaded. Passed through so the track can
   *  be built without refetching it (see generateEnhancedAudioTrack). */
  article?: AudioTrackArticle | null,
) {
  const { playing, isLoading, currentArticle } = useGlobalAudioState();
  const audioPreference = useAppSelector(selectAudioLanguage);
  const startArticlePlayback = useStartArticlePlayback();

  const isCurrentAudioForThisArticle = articleId !== undefined && currentArticle?.id === articleId;
  const isListeningToThisArticle = playing && isCurrentAudioForThisArticle;
  const isListenLoading = isLoading && isCurrentAudioForThisArticle;

  const handleToggleListen = useCallback(async () => {
    if (!articleId || isAudioBusy()) return;

    // No haptic here: the reader's Listen button fires the press's own
    // selection tick, and one decision gets one haptic.
    if (isListeningToThisArticle) {
      await simpleAudioService.stop();
      return;
    }

    // Paused on this article (by the MiniPlayer, the lock screen or a call):
    // Listen carries on from where it stopped rather than starting over. A
    // resume that cannot carry on (the player went away underneath it) falls
    // through to a fresh start instead of leaving the tap dead.
    if (isCurrentAudioForThisArticle && isArticleAudioPaused(simpleAudioService.getStatus())) {
      if (await simpleAudioService.resume()) return;
    }

    const track = await enhancedAudioService.generateEnhancedAudioTrack(
      articleId,
      audioPreference,
      article,
    );
    // On failure the service already showed an error toast
    if (!track) return;

    await startArticlePlayback([track], { source: 'article_reader' });
  }, [
    articleId,
    audioPreference,
    article,
    isListeningToThisArticle,
    isCurrentAudioForThisArticle,
    startArticlePlayback,
  ]);

  return {
    isListeningToThisArticle,
    isListenLoading,
    handleToggleListen,
  };
}
