import { useEffect, useMemo, useRef, useState } from 'react';

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

  const rawShouldShow = useMemo(
    () => Boolean(currentArticle) && (playing || audioState === 'loading'),
    [currentArticle, playing, audioState],
  );

  const [show, setShow] = useState(rawShouldShow);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (rawShouldShow) {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
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
