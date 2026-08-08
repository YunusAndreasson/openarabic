/**
 * Card verdict tests.
 *
 * What is and is not covered here, deliberately:
 *
 * The verdict's whole point is that the haptic fires from the ANIMATION's frame
 * — a `useAnimatedReaction` watching the level cross HAPTIC_AT on the way up —
 * rather than from JS alongside the animation start. That crossing cannot be
 * exercised in jest: the reanimated mock's `useAnimatedReaction` runs the
 * reaction once at render with `previous === current`, so no edge ever occurs,
 * and `withSequence` collapses to its last frame so the level never sweeps.
 *
 * So the reaction's PAYLOAD is tested directly (fireVerdictFeedback), the
 * mapping that decides it is tested pure (resolveVerdictTone), and the shared
 * values the animation lands on are asserted through the hook. What is left
 * unverified — that the buzz and the colour land on the same frame — needs
 * hardware, which no emulator provides.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { VERDICT } from '@/constants/animation';
import {
  fireVerdictFeedback,
  resolveVerdictTone,
  useCardVerdict,
  VERDICT_TONE,
} from '@/hooks/review/useCardVerdict';

/**
 * Plain functions, not jest.fn(). The global mock in jest.setup.js is built
 * from jest.fn()s, and this project runs with `resetMocks: true` — which strips
 * every mock's implementation before each test, leaving scheduleOnUI a no-op
 * that silently swallows the worklet. Every assertion below would then pass or
 * fail for a reason that has nothing to do with the verdict.
 */
jest.mock('react-native-worklets', () => ({
  scheduleOnUI: (callback: (...args: unknown[]) => void, ...args: unknown[]) => callback(...args),
  scheduleOnRN:
    (callback: (...args: unknown[]) => void) =>
    (...args: unknown[]) =>
      callback(...args),
}));

jest.mock('@/utils/haptics', () => ({
  commitFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

const haptics = jest.requireMock('@/utils/haptics') as {
  commitFeedback: jest.Mock;
  selectionFeedback: jest.Mock;
  errorFeedback: jest.Mock;
};

describe('resolveVerdictTone', () => {
  test('each grade has its own tone', () => {
    expect(resolveVerdictTone('known')).toBe(VERDICT_TONE.CORRECT);
    expect(resolveVerdictTone('vague')).toBe(VERDICT_TONE.ALMOST);
    expect(resolveVerdictTone('unknown')).toBe(VERDICT_TONE.WRONG);
  });
});

describe('fireVerdictFeedback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // A miss should feel heavier than a clean recall, the same way the session's
  // other feedback is weighted. If these ever collapse to one texture, three
  // different outcomes feel identical again.
  test('weights each outcome differently', () => {
    fireVerdictFeedback(VERDICT_TONE.CORRECT);
    expect(haptics.commitFeedback).toHaveBeenCalledTimes(1);
    expect(haptics.selectionFeedback).not.toHaveBeenCalled();
    expect(haptics.errorFeedback).not.toHaveBeenCalled();

    fireVerdictFeedback(VERDICT_TONE.ALMOST);
    expect(haptics.selectionFeedback).toHaveBeenCalledTimes(1);

    fireVerdictFeedback(VERDICT_TONE.WRONG);
    expect(haptics.errorFeedback).toHaveBeenCalledTimes(1);
  });

  // The reaction reads the tone off a shared value, so it can be called with
  // NONE if a verdict is cleared between the crossing and the JS hop.
  test('no outcome means no haptic', () => {
    fireVerdictFeedback(VERDICT_TONE.NONE);

    expect(haptics.commitFeedback).not.toHaveBeenCalled();
    expect(haptics.selectionFeedback).not.toHaveBeenCalled();
    expect(haptics.errorFeedback).not.toHaveBeenCalled();
  });
});

describe('useCardVerdict', () => {
  test('starts with nothing showing', () => {
    const { result } = renderHook(() => useCardVerdict());

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.NONE);
    expect(result.current.verdictLevel.get()).toBe(0);
    expect(result.current.verdictShake.get()).toBe(0);
  });

  test('a grade sets its tone', () => {
    const { result } = renderHook(() => useCardVerdict());

    act(() => result.current.playVerdict('known'));
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.CORRECT);

    act(() => result.current.playVerdict('vague'));
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.ALMOST);

    act(() => result.current.playVerdict('unknown'));
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.WRONG);
  });

  // The reanimated mock collapses withSequence to its final frame, which is
  // exactly the value each path is supposed to REST at — so this asserts the
  // thing that actually differs between a card that leaves and one that stays.
  test('a pass releases its verdict; a miss keeps one', () => {
    const { result } = renderHook(() => useCardVerdict());

    act(() => result.current.playVerdict('known'));
    expect(result.current.verdictLevel.get()).toBe(0);

    act(() => result.current.playVerdict('vague'));
    expect(result.current.verdictLevel.get()).toBe(0);

    // A forgotten card stays on screen for the restudy hold, so its ring has to
    // still be there while the learner studies it.
    act(() => result.current.playVerdict('unknown'));
    expect(result.current.verdictLevel.get()).toBe(VERDICT.RESIDUAL);
  });

  // No test for the shake's amplitude: it ends where it started, so under a
  // mock that collapses a sequence to its last frame both a miss and a pass
  // read 0 and the assertion would pass without proving anything.

  // The miss ring does not decay on its own, so nothing but the next card
  // clears it. Without this the word AFTER a forgotten one arrived already
  // marked red.
  test('resetVerdict clears a held miss', () => {
    const { result } = renderHook(() => useCardVerdict());

    act(() => result.current.playVerdict('unknown'));
    expect(result.current.verdictLevel.get()).toBe(VERDICT.RESIDUAL);

    act(() => result.current.resetVerdict());

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.NONE);
    expect(result.current.verdictLevel.get()).toBe(0);
    expect(result.current.verdictShake.get()).toBe(0);
  });
});
