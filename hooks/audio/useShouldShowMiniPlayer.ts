import { useEffect, useRef, useState } from 'react';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';

/**
 * MiniPlayer visibility with mount/unmount stabilization.
 *
 * Show immediately when audio becomes active; hide with a short delay so rapid
 * play/pause toggles or transitions don't cause UI flicker.
 */
export function useShouldShowMiniPlayer(): boolean {
  const { currentArticle, playing, audioState } = useGlobalAudioState();

  const rawShouldShow = Boolean(currentArticle) && (playing || audioState === 'loading');

  const [show, setShow] = useState(rawShouldShow);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rawShouldShow) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      // Sync show immediately to true; this drives the visible state for the latched-hide cycle.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
    } else {
      hideTimeoutRef.current = setTimeout(() => {
        setShow(false);
      }, TIMING_CONSTANTS.MEDIUM_DELAY);
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [rawShouldShow]);

  return show;
}
