import { memo } from 'react';

import { useAudioProgress, useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';

import { MiniPlayer } from './MiniPlayer';

export const GlobalMiniPlayer = memo(function GlobalMiniPlayer() {
  const globalAudioState = useGlobalAudioState();
  const { position, duration } = useAudioProgress();
  const shouldShow = useShouldShowMiniPlayer();

  if (!shouldShow || !globalAudioState.currentArticle) {
    return null;
  }

  return (
    <MiniPlayer
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
