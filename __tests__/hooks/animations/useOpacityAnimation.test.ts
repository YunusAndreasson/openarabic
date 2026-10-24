/**
 * The review screen's imperative fade.
 *
 * Pinned here: it is never reduced. A fade is not movement — the app's one
 * Reduce Motion rule — and under the system setting Reanimated jumped it to its
 * end and skipped its delay, so a graded card vanished on the frame it was
 * graded and took the verdict beat it was holding for with it.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { useOpacityAnimation } from '@/hooks/animations/useOpacityAnimation';

describe('useOpacityAnimation', () => {
  test('fades on ReduceMotion.Never', () => {
    const timing = jest.spyOn(Reanimated, 'withTiming');
    const { result } = renderHook(() => useOpacityAnimation({ duration: 180 }));

    act(() => result.current.fadeIn());

    expect(timing).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 180, reduceMotion: Reanimated.ReduceMotion.Never }),
      expect.any(Function),
    );
  });

  test('keeps its delay under Reduce Motion, so the verdict beat survives', () => {
    const delay = jest.spyOn(Reanimated, 'withDelay');
    const { result } = renderHook(() => useOpacityAnimation({ duration: 180 }));

    act(() => result.current.fadeOut(undefined, 140));

    expect(delay).toHaveBeenCalledWith(140, expect.anything(), Reanimated.ReduceMotion.Never);
  });
});
