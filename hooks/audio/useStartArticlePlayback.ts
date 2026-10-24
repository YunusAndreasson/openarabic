import { useQueryClient } from '@tanstack/react-query';

import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { OnboardingStep } from '@/constants/onboarding';
import { analytics } from '@/services/analytics';
import { simpleAudioService, type SourceTrackedAudioTrack } from '@/services/audioPlayer';
import { warmTrackCache } from '@/services/audioPlaylist';
import { prefetchArticleWithImage } from '@/utils/audioUtils';
import { handleError } from '@/utils/errorHandling';
import { markOnboardingStep } from '@/utils/onboardingStorage';

/** Where article playback was started from, as analytics records it. */
export type ArticlePlaybackSource = 'article_reader' | 'header_button' | 'playlist_row';

export interface StartArticlePlaybackOptions {
  source: ArticlePlaybackSource;
  /** Begin at this track — a tapped playlist row — and play on from there. */
  startIndex?: number;
}

export type StartArticlePlayback = (
  tracks: readonly SourceTrackedAudioTrack[],
  options: StartArticlePlaybackOptions,
) => Promise<boolean>;

/**
 * The one way article audio starts: the reader's Listen, the playlist's Play
 * all, and a tapped playlist row.
 *
 * There used to be three hand-written copies, and they had drifted. Play all
 * passed no advance callback, so a queue it started never warmed the cache for
 * its later tracks; the row-tap fallback played a lone track outside a queue,
 * so it never got the lock screen — and without that Android stops backgrounded
 * playback after a few minutes. Now every start:
 *
 * - plays as a queue (a single article is a queue of one), so lock-screen
 *   controls activate and playback survives leaving the screen;
 * - on each advance, prefetches the next article and its artwork and warms the
 *   now-playing track's file — only ever the current one, since warming the
 *   whole queue is what used to saturate the connection;
 * - once playback is live, does the same for the first track, then records the
 *   start (with its `source`) and the onboarding step.
 *
 * Never rejects; resolves whether playback started.
 */
export function useStartArticlePlayback(): StartArticlePlayback {
  const queryClient = useQueryClient();

  return async (tracks, { source, startIndex = 0 }) => {
    const queue = tracks.slice(startIndex);
    const firstTrack = queue[0];
    if (!firstTrack) return false;

    const started = await simpleAudioService
      .playPlaylist(queue, nextTrack => {
        if (!nextTrack) return;
        prefetchArticleWithImage(nextTrack, queryClient);
        warmTrackCache(nextTrack);
      })
      .catch((error: unknown) => {
        void handleError(error);
        return false;
      });
    if (!started) return false;

    // Playback is live — now it's safe to pull the file down for next time
    // without stealing bandwidth from the stream that just started.
    prefetchArticleWithImage(firstTrack, queryClient);
    warmTrackCache(firstTrack);
    void markOnboardingStep(OnboardingStep.LISTEN_AUDIO);
    void analytics.track(ANALYTICS_EVENTS.AUDIO_PLAYBACK_STARTED, {
      article_id: firstTrack.articleId,
      article_title: firstTrack.title,
      source,
      playlist_position: startIndex + 1,
      playlist_total: tracks.length,
    });
    return true;
  };
}
