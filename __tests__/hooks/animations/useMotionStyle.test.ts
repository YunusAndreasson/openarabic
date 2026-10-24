/**
 * The Reduce Motion rule for Reanimated's CSS API: movement is gated, opacity
 * is not. The hook is the gate; what goes through it is each caller's call.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { renderHook } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { useMotionStyle } from '@/hooks/animations/useMotionStyle';

const MOVING = { transitionProperty: 'width' } as const;
const STILL = { opacity: 1 } as const;

describe('useMotionStyle', () => {
  test('hands back the moving style when motion is allowed', () => {
    const { result } = renderHook(() => useMotionStyle<object>(MOVING, STILL));

    expect(result.current).toBe(MOVING);
  });

  test('swaps in the reduced style when the learner asked for less motion', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);

    const { result } = renderHook(() => useMotionStyle<object>(MOVING, STILL));

    expect(result.current).toBe(STILL);
  });

  test('drops the style entirely when there is no reduced form', () => {
    jest.spyOn(Reanimated, 'useReducedMotion').mockReturnValue(true);

    const { result } = renderHook(() => useMotionStyle(MOVING));

    expect(result.current).toBeNull();
  });
});
