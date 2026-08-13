import { useCallback, useRef } from 'react';

import { PRESS_LOCK_WINDOW_MS } from '@/constants/animation';

/**
 * Ignore a repeat call within `windowMs` of the last one that got through.
 *
 * This replaced a state-based debounce, and the difference is the whole point:
 * the old hook parked its guard in `useState`, so both halves of a double-tap
 * read the pre-commit value and both fired — it looked like a guard and stopped
 * nothing. A ref is written synchronously, so the second press sees the first
 * press's lock no matter how close together they land.
 *
 * Two consequences fall out of that:
 *
 * - **No re-render.** The old hook flipped state true then false again 300ms
 *   later, costing two renders per press. That is also why `IconButton` used to
 *   dim for a third of a second after every tap: the same flag drove its
 *   disabled opacity.
 * - **No timer.** Storing a deadline rather than a boolean means nothing has to
 *   be scheduled, so there is no `setTimeout` to leak into an unmounted
 *   component and no cleanup effect to forget.
 *
 * The lock is per-instance: every control owns its own ref, so tapping quickly
 * between two different buttons is unaffected. It guards repeat presses of the
 * *same* control, which in this app is never a distinct intent.
 */
export function usePressLock<TArgs extends unknown[]>(
  handler: ((...args: TArgs) => void) | undefined,
  windowMs: number = PRESS_LOCK_WINDOW_MS,
): (...args: TArgs) => void {
  const lockedUntilRef = useRef(0);

  return useCallback(
    (...args: TArgs) => {
      const now = Date.now();
      if (now < lockedUntilRef.current) return;

      lockedUntilRef.current = now + windowMs;
      handler?.(...args);
    },
    [handler, windowMs],
  );
}
