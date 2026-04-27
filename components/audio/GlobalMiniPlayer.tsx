import { memo } from 'react';

import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';

import { MiniPlayer } from './MiniPlayer';

interface GlobalMiniPlayerProps {
  /**
   * When true, render without the floating absolute-positioned wrapper —
   * suited for embedding inside `NativeTabs.BottomAccessory` (iOS 26+).
   */
  embedded?: boolean;
}

export const GlobalMiniPlayer = memo(function GlobalMiniPlayer({
  embedded = false,
}: GlobalMiniPlayerProps) {
  const globalAudioState = useGlobalAudioState();
  const shouldShow = useShouldShowMiniPlayer();

  if (!shouldShow || !globalAudioState.currentArticle) {
    return null;
  }

  return (
    <MiniPlayer
      embedded={embedded}
      article={globalAudioState.currentArticle}
      isTimerActive={globalAudioState.isTimerActive}
      position={globalAudioState.position}
      duration={globalAudioState.duration}
      queuePosition={globalAudioState.queuePosition}
      onPlayPause={globalAudioState.onPlayPause}
      onTimerPress={globalAudioState.onTimerPress}
    />
  );
});

GlobalMiniPlayer.displayName = 'GlobalMiniPlayer';
