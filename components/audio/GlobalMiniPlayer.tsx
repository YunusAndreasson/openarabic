import { usePathname } from 'expo-router';
import { memo } from 'react';

import { ARTICLE_ROUTE_PREFIX } from '@/constants/routes';
import { useAudioProgress, useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';

import { MiniPlayer } from './MiniPlayer';
import type { MiniPlayerPlacement } from './MiniPlayer';

export interface GlobalMiniPlayerProps {
  /**
   * `root` — the app-wide overlay mounted next to the navigator in `app/_layout`.
   * `screen` — mounted by a screen that is presented as a native modal.
   */
  readonly placement?: MiniPlayerPlacement;
}

export const GlobalMiniPlayer = memo(function GlobalMiniPlayer({
  placement = 'root',
}: GlobalMiniPlayerProps) {
  const globalAudioState = useGlobalAudioState();
  const { position, duration } = useAudioProgress();
  const shouldShow = useShouldShowMiniPlayer();
  const pathname = usePathname();

  // The article reader is `presentation: 'modal'`, so on iOS it is a separate
  // view controller presented *above* the whole React root view. No zIndex can
  // lift the root overlay over it, and the glass surface would sample the
  // covered tab screen rather than what the user is looking at. The article
  // screen therefore mounts its own `placement="screen"` instance, and the root
  // one stands down so the two never overlap mid-dismiss.
  const hostedByArticleScreen = placement === 'root' && pathname.startsWith(ARTICLE_ROUTE_PREFIX);

  if (hostedByArticleScreen || !shouldShow || !globalAudioState.currentArticle) {
    return null;
  }

  return (
    <MiniPlayer
      placement={placement}
      article={globalAudioState.currentArticle}
      isTimerActive={globalAudioState.isTimerActive}
      position={position}
      duration={duration}
      queuePosition={globalAudioState.queuePosition}
      onPlayPause={globalAudioState.onPlayPause}
      onTimerPress={globalAudioState.onTimerPress}
    />
  );
});

GlobalMiniPlayer.displayName = 'GlobalMiniPlayer';
