import { useEffect, useRef, useState } from 'react';

import { TIMING_CONSTANTS } from '@/constants/animation';
import { useKeepScreenAwake } from '@/hooks/common/useKeepScreenAwake';

/**
 * Holds the reader's display on while the article is being read, and lets it
 * sleep once it is not.
 *
 * The reader used to hold the display for as long as it was open, so a phone put
 * down mid-article stayed lit until it was picked up again. Two signals now
 * stand in for "being read":
 *
 * - **Playback of this article.** A learner following the Arabic along with the
 *   audio may not touch the screen for the whole clip, and dimming the page out
 *   from under them is the complaint the lock was added for.
 * - **A reading window** of `TIMING_CONSTANTS.READER_KEEP_AWAKE_WINDOW` after the
 *   last touch. The window opens with the reader — the loading state included —
 *   and every touch reopens it.
 *
 * Returns the function to call on each touch. The timer lives in a ref and the
 * state only changes when the window closes or reopens, so a touch does not
 * re-render the reader.
 */
export function useReaderKeepAwake(isPlaying: boolean): () => void {
  const [isIdle, setIsIdle] = useState(false);
  const timer = useRef<{ id?: ReturnType<typeof setTimeout> }>({});

  useEffect(() => {
    const handle = timer.current;
    handle.id = setTimeout(() => setIsIdle(true), TIMING_CONSTANTS.READER_KEEP_AWAKE_WINDOW);
    return () => clearTimeout(handle.id);
  }, []);

  useKeepScreenAwake(isPlaying || !isIdle);

  return () => {
    clearTimeout(timer.current.id);
    timer.current.id = setTimeout(() => setIsIdle(true), TIMING_CONSTANTS.READER_KEEP_AWAKE_WINDOW);
    setIsIdle(false);
  };
}
