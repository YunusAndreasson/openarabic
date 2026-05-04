import { memo } from 'react';

import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useShouldShowMiniPlayer } from '@/hooks/audio/useShouldShowMiniPlayer';

import { MiniPlayer } from './MiniPlayer';

export const GlobalMiniPlayer = memo(function GlobalMiniPlayer() {
  const globalAudioState = useGlobalAudioState();
  const shouldShow = useShouldShowMiniPlayer();

  if (!shouldShow || !globalAudioState.currentArticle) {
    return null;
  }

  return (
    <MiniPlayer
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
