import { nowPlayingArticleId } from '@/hooks/audio/articleAudioStatus';
import { useAudioSelector } from '@/hooks/audio/useAudioSelector';
import type { ArticleId } from '@/types/branded.types';

/**
 * The article the audio player is on — playing, buffering or paused — or null.
 *
 * A primitive snapshot on purpose, for the same reason as
 * `useShouldShowMiniPlayer`: the transport channel fires for every review clip
 * too, and a list that read the whole GlobalAudioState context would re-render
 * on each of them. This re-renders its caller only when the article changes.
 */
export function useNowPlayingArticleId(): ArticleId | null {
  return useAudioSelector(nowPlayingArticleId);
}
