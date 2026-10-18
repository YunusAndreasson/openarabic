import { useSyncExternalStore } from 'react';

import { isArticleAudioActive } from '@/hooks/audio/articleAudioStatus';
import { simpleAudioService } from '@/services/audioPlayer';
import type { ArticleId } from '@/types/branded.types';

function subscribeToAudioTransport(onStoreChange: () => void): () => void {
  return simpleAudioService.subscribe(() => onStoreChange());
}

function getNowPlayingArticleId(): ArticleId | null {
  const status = simpleAudioService.getStatus();
  return isArticleAudioActive(status) ? (status.currentTrack?.articleId ?? null) : null;
}

/**
 * The article the audio player is on — playing, buffering or paused — or null.
 *
 * A primitive snapshot on purpose, for the same reason as
 * `useShouldShowMiniPlayer`: the transport channel fires for every review clip
 * too, and a list that read the whole GlobalAudioState context would re-render
 * on each of them. This re-renders its caller only when the article changes.
 */
export function useNowPlayingArticleId(): ArticleId | null {
  return useSyncExternalStore(
    subscribeToAudioTransport,
    getNowPlayingArticleId,
    getNowPlayingArticleId,
  );
}
