/**
 * Card verdict tests.
 *
 * What is and is not covered here, deliberately:
 *
 * The verdict's whole point is that the haptic fires from the ANIMATION's frame
 * — a `useAnimatedReaction` watching the level cross HAPTIC_AT on the way up —
 * rather than from JS alongside the animation start. That crossing cannot be
 * exercised in jest: the reanimated mock's `useAnimatedReaction` re-runs only
 * after a React commit, which a shared value written by the animation never
 * causes, and `withSequence` collapses to its last frame so the level never
 * sweeps.
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
import * as Reanimated from 'react-native-reanimated';

import { VERDICT } from '@/constants/animation';
import {
  fireVerdictFeedback,
  resolveVerdictTone,
  useCardVerdict,
  VERDICT_TONE,
} from '@/hooks/review/useCardVerdict';

jest.mock('@/utils/haptics', () => ({
  commitFeedback: jest.fn(),
  lightFeedback: jest.fn(),
  // Not used by any verdict any more, and mocked precisely so the test below
  // can prove that.
  selectionFeedback: jest.fn(),
  errorFeedback: jest.fn(),
}));

const haptics = jest.requireMock('@/utils/haptics') as {
  commitFeedback: jest.Mock;
  lightFeedback: jest.Mock;
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

  // A clean recall and a scraped one must not feel the same: "Barely" is held
  // lightly, "Knew it" firmly.
  test('weights a pass by how clean it was', () => {
    fireVerdictFeedback(VERDICT_TONE.CORRECT);
    expect(haptics.commitFeedback).toHaveBeenCalledTimes(1);
    expect(haptics.lightFeedback).not.toHaveBeenCalled();
    expect(haptics.errorFeedback).not.toHaveBeenCalled();

    fireVerdictFeedback(VERDICT_TONE.ALMOST);
    expect(haptics.lightFeedback).toHaveBeenCalledTimes(1);
  });

  // "Forgot" is the learner's own honest report. It commits like any other
  // decision; the Error texture would score it against them, which pushes
  // self-grading toward "Barely" — the bias FSRS can least afford.
  test('a miss the learner reported commits without the error texture', () => {
    fireVerdictFeedback(VERDICT_TONE.WRONG);

    expect(haptics.commitFeedback).toHaveBeenCalledTimes(1);
    expect(haptics.errorFeedback).not.toHaveBeenCalled();
  });

  // The recognizer hearing another word is the app's verdict, handed down
  // unasked — the one miss that still buzzes as an error.
  test('a miss the recognizer judged buzzes as an error', () => {
    fireVerdictFeedback(VERDICT_TONE.WRONG, true);

    expect(haptics.errorFeedback).toHaveBeenCalledTimes(1);
    expect(haptics.commitFeedback).not.toHaveBeenCalled();
  });

  // The judge only changes what a MISS feels like; a pass is a pass.
  test('the judge does not change how a pass feels', () => {
    fireVerdictFeedback(VERDICT_TONE.CORRECT, true);

    expect(haptics.commitFeedback).toHaveBeenCalledTimes(1);
    expect(haptics.errorFeedback).not.toHaveBeenCalled();
  });

  // Selection is tier 0 in utils/haptics — what every press in the session now
  // fires. An outcome that used it would feel exactly like tapping Continue,
  // which is the inversion this ladder exists to prevent.
  test('no outcome uses the tier-0 press texture', () => {
    fireVerdictFeedback(VERDICT_TONE.CORRECT);
    fireVerdictFeedback(VERDICT_TONE.ALMOST);
    fireVerdictFeedback(VERDICT_TONE.WRONG);
    fireVerdictFeedback(VERDICT_TONE.WRONG, true);

    expect(haptics.selectionFeedback).not.toHaveBeenCalled();
  });

  // The reaction reads the tone off a shared value, so it can be called with
  // NONE if a verdict is cleared between the crossing and the JS hop.
  test('no outcome means no haptic', () => {
    fireVerdictFeedback(VERDICT_TONE.NONE);

    expect(haptics.commitFeedback).not.toHaveBeenCalled();
    expect(haptics.lightFeedback).not.toHaveBeenCalled();
    expect(haptics.selectionFeedback).not.toHaveBeenCalled();
    expect(haptics.errorFeedback).not.toHaveBeenCalled();
  });
});

describe('useCardVerdict', () => {
  test('starts with nothing showing', () => {
    const { result } = renderHook(() => useCardVerdict());

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.NONE);
    expect(result.current.verdictLevel.get()).toBe(0);
    expect(result.current.verdictShakePhase.get()).toBe(0);
  });

  test('a grade sets its tone', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('known', 'card-1'));
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.CORRECT);

    act(() => result.current.playVerdict('vague', 'card-1'));
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.ALMOST);

    act(() => result.current.playVerdict('unknown', 'card-1'));
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.WRONG);
  });

  // The reanimated mock collapses withSequence to its final frame, which is
  // exactly the value each path is supposed to REST at — so this asserts the
  // thing that actually differs between a card that leaves and one that stays.
  test('a pass releases its verdict; a miss keeps one', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('known', 'card-1'));
    expect(result.current.verdictLevel.get()).toBe(0);

    act(() => result.current.playVerdict('vague', 'card-1'));
    expect(result.current.verdictLevel.get()).toBe(0);

    // A forgotten card stays on screen for the restudy hold, so its ring has to
    // still be there while the learner studies it.
    act(() => result.current.playVerdict('unknown', 'card-1'));
    expect(result.current.verdictLevel.get()).toBe(VERDICT.RESIDUAL);
  });

  // The wince used to be a withSequence between fixed offsets that ended where
  // it started, so under a mock that collapses a sequence to its last frame a
  // miss and a pass both read 0 and there was nothing to assert. As a 0 → 1
  // phase there is: the mock collapses the timing to its target, so a wince
  // rests at 1 (a fully spent wobble) and everything else at 0 (never started).
  test('only a miss the recognizer judged runs the wince', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('unknown', 'card-1', 'recognizer'));
    expect(result.current.verdictShakePhase.get()).toBe(1);

    act(() => result.current.playVerdict('known', 'card-1'));
    expect(result.current.verdictShakePhase.get()).toBe(0);

    act(() => result.current.playVerdict('vague', 'card-1'));
    expect(result.current.verdictShakePhase.get()).toBe(0);
  });

  // A grade-bar "Forgot" keeps its ring — and holds it for the restudy — but
  // the card does not flinch at an honest answer.
  test('a miss the learner reported holds its ring without the wince', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('unknown', 'card-1'));

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.WRONG);
    expect(result.current.verdictLevel.get()).toBe(VERDICT.RESIDUAL);
    expect(result.current.verdictShakePhase.get()).toBe(0);
  });

  // The voice path marks a mishear wrong the moment it is heard, and "No, I
  // missed it" then grades the same outcome. Replaying would shake a card that
  // is already red and buzz one conclusion twice.
  test('an outcome already showing is not replayed', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('unknown', 'card-1', 'recognizer'));
    // Prove the second call is a no-op by moving the value first: a replay
    // would drive it back to RESIDUAL, a suppressed one leaves it alone. The
    // second call is the learner agreeing ("Missed it"), which is the same
    // outcome however it was reached.
    act(() => result.current.verdictLevel.set(0.5));
    act(() => result.current.playVerdict('unknown', 'card-1'));

    expect(result.current.verdictLevel.get()).toBe(0.5);
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.WRONG);
  });

  // "I knew it" on the voice panel overturns the recognizer, and the card has
  // to follow: red goes green and the card leaves. This is the one place a
  // verdict legitimately replaces another mid-card.
  test('a different outcome replaces the one showing', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('unknown', 'card-1', 'recognizer'));
    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.WRONG);

    act(() => result.current.playVerdict('known', 'card-1'));

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.CORRECT);
    // The pass decays away as the card leaves, unlike the miss it replaced.
    expect(result.current.verdictLevel.get()).toBe(0);
  });

  // The miss ring does not decay on its own, so nothing but the next card
  // clears it. Without this the word AFTER a forgotten one arrived already
  // marked red.
  test('resetVerdict clears a held miss', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('unknown', 'card-1', 'recognizer'));
    expect(result.current.verdictLevel.get()).toBe(VERDICT.RESIDUAL);

    act(() => result.current.resetVerdict('card-2'));

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.NONE);
    expect(result.current.verdictLevel.get()).toBe(0);
    expect(result.current.verdictShakePhase.get()).toBe(0);
  });

  // The staleness guard this proves: a playVerdict call is only ever safe to
  // apply if it still names the card that is actually current. On device this
  // matters when a background/foreground gap reorders a queued verdict behind
  // the next card's own reset — observed as a later, ungraded card coming up
  // ringed and labelled for a grade it was never given. That specific timing
  // isn't reproducible under the reanimated mock's synchronous scheduleOnUI
  // (see the jest.mock above), so this test exercises the guard's LOGIC
  // directly: call the reset for a later card, then attempt to paint the
  // earlier one.
  test('a verdict queued for a card that has since been left behind does not paint', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    // The card advances (a new word mounts) BEFORE the queued playVerdict for
    // card-1 is drained — the exact ordering a background/foreground gap
    // produces, simulated here by simply calling resetVerdict first.
    act(() => result.current.resetVerdict('card-2'));
    act(() => result.current.playVerdict('known', 'card-1'));

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.NONE);
    expect(result.current.verdictLevel.get()).toBe(0);
  });

  // The normal, same-tick case must still work: a grade for the card that is
  // ACTUALLY current is never treated as stale.
  test('a verdict for the current card still paints', () => {
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('known', 'card-1'));

    expect(result.current.verdictTone.get()).toBe(VERDICT_TONE.CORRECT);
  });
});

// With the OS setting on, Reanimated's withSequence plays only its last step and
// withDelay drops its delay, so a level left on the system setting went 0 → 0
// for a pass and 0 → RESIDUAL for a miss — it never crossed HAPTIC_AT, and a
// Reduce Motion learner got neither the ring nor the grade haptic. The mock
// collapses every sequence to its last step whatever it is told, so what is
// pinned here is the opt-out itself.
describe('useCardVerdict under Reduce Motion', () => {
  test('both verdict levels opt out, because the ring is an opacity change', () => {
    const sequence = jest.spyOn(Reanimated, 'withSequence');
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('known', 'card-1'));
    act(() => result.current.playVerdict('unknown', 'card-1'));

    expect(sequence).toHaveBeenCalledTimes(2);
    for (const call of sequence.mock.calls) {
      expect(call[0]).toBe(Reanimated.ReduceMotion.Never);
    }
  });

  test('the wince keeps the system setting, because it is real movement', () => {
    const timing = jest.spyOn(Reanimated, 'withTiming');
    const { result } = renderHook(() => useCardVerdict());
    act(() => result.current.resetVerdict('card-1'));

    act(() => result.current.playVerdict('unknown', 'card-1', 'recognizer'));

    expect(timing).toHaveBeenCalledWith(1, VERDICT.SHAKE.SWEEP);
    expect(VERDICT.SHAKE.SWEEP).not.toHaveProperty('reduceMotion');
  });
});
