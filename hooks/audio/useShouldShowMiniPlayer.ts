import { useEffect, useRef, useState } from 'react';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { isArticleAudioActive } from '@/hooks/audio/articleAudioStatus';
import { useAudioSelector } from '@/hooks/audio/useAudioSelector';

/**
 * MiniPlayer visibility with mount/unmount stabilization.
 *
 * The mini player shows while an article track is loaded — playing, buffering
 * or paused (see `isArticleAudioActive`).
 *
 * Reading a primitive is important: the audio service still calls this
 * subscription for every transport transition, but React skips the render
 * when those transitions belong to a non-article track and the value remains
 * `false`. Reading the full GlobalAudioState context here used to re-render the
 * mounted Practice and Playlist tab trees for every review clip transition.
 *
 * Show immediately when an article track loads; hide with a short delay so a
 * track change inside a playlist doesn't cause UI flicker.
 */
export function useShouldShowMiniPlayer(): boolean {
  const rawShouldShow = useAudioSelector(isArticleAudioActive);

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
