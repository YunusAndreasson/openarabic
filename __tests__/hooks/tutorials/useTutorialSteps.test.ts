/**
 * useTutorialSteps: the step machine under WelcomeIntro and ReviewGradesTutorial.
 *
 * The two components used to carry a copy each, and only one clamped `next`:
 * taps batched into one render with a stale "is last" walked the other past its
 * last step into a state that could never finish.
 */

import { act, renderHook } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';

import { useTutorialSteps } from '@/hooks/tutorials/useTutorialSteps';

interface StepsProps {
  count: number;
  isVisible: boolean;
}

const renderSteps = (stepCount = 3, visible = true) =>
  renderHook(({ count, isVisible }: StepsProps) => useTutorialSteps(count, isVisible), {
    initialProps: { count: stepCount, isVisible: visible },
  });

describe('useTutorialSteps', () => {
  test('walks forward and knows the last step', () => {
    const { result } = renderSteps(3);
    expect(result.current.step).toBe(0);
    expect(result.current.isLast).toBe(false);

    act(() => result.current.next());
    act(() => result.current.next());

    expect(result.current.step).toBe(2);
    expect(result.current.isLast).toBe(true);
  });

  test('never walks past the last step, even when taps batch into one render', () => {
    const { result } = renderSteps(3);

    act(() => {
      // Four taps against one stale render.
      result.current.next();
      result.current.next();
      result.current.next();
      result.current.next();
    });

    expect(result.current.step).toBe(2);
  });

  test('starts over each time it is shown again', () => {
    const { result, rerender } = renderSteps(3);
    act(() => result.current.next());
    expect(result.current.step).toBe(1);

    rerender({ count: 3, isVisible: false });
    expect(result.current.step).toBe(1);

    rerender({ count: 3, isVisible: true });
    expect(result.current.step).toBe(0);
  });

  test('reset goes back to the first step', () => {
    const { result } = renderSteps(3);
    act(() => result.current.next());

    act(() => result.current.reset());

    expect(result.current.step).toBe(0);
  });

  test('finish runs its action once per showing', () => {
    const action = jest.fn();
    const { result, rerender } = renderSteps(1);

    act(() => result.current.finish(action));
    act(() => result.current.finish(action));
    expect(action).toHaveBeenCalledTimes(1);

    // Shown again: a new showing may finish again.
    rerender({ count: 1, isVisible: false });
    rerender({ count: 1, isVisible: true });
    act(() => result.current.finish(action));
    expect(action).toHaveBeenCalledTimes(2);
  });
});
