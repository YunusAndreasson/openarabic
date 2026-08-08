import { useCallback } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import {
  cancelAnimation,
  useAnimatedReaction,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';

import { VERDICT } from '@/constants/animation';
import type { WordConfidence } from '@/types/review.types';
import { commitFeedback, errorFeedback, selectionFeedback } from '@/utils/haptics';

/**
 * Which verdict the card is showing, as a number the UI thread can read.
 *
 * Discrete rather than a signed scalar because the three tones are unrelated
 * hues (success / warning / error). A single -1..1 value would have to
 * interpolate BETWEEN them, so a card mid-decay would pass through colours that
 * mean other grades.
 */
export const VERDICT_TONE = {
  NONE: 0,
  CORRECT: 1,
  ALMOST: 2,
  WRONG: 3,
} as const;

export type VerdictTone = (typeof VERDICT_TONE)[keyof typeof VERDICT_TONE];

const TONE_FOR_CONFIDENCE: Record<WordConfidence, VerdictTone> = {
  known: VERDICT_TONE.CORRECT,
  vague: VERDICT_TONE.ALMOST,
  unknown: VERDICT_TONE.WRONG,
};

/**
 * Which verdict a grade shows. Pure, and exported for the same reason
 * `resolveDetentTone` is: the mapping is the decision, and it is worth testing
 * without a renderer or a UI thread in the way.
 */
export const resolveVerdictTone = (confidence: WordConfidence): VerdictTone =>
  TONE_FOR_CONFIDENCE[confidence];

/**
 * The outcome haptic, one per tone.
 *
 * Weighted the same way the rest of the session already weights its feedback: a
 * miss is heavier than a clean recall. `commitFeedback` rather than
 * `successFeedback` for a correct card — see utils/haptics for why a two-tap
 * notification texture is the wrong weight for something that fires nine times
 * in ten.
 */
const TONE_FEEDBACK: Partial<Record<VerdictTone, () => void>> = {
  [VERDICT_TONE.CORRECT]: commitFeedback,
  [VERDICT_TONE.ALMOST]: selectionFeedback,
  [VERDICT_TONE.WRONG]: errorFeedback,
};

/**
 * The JS-side landing point of the animation's haptic reaction.
 *
 * Takes a plain number because it is called across the worklet boundary with
 * whatever the shared value holds. `NONE` has no entry and no haptic — there is
 * no outcome to report. Exported so the tone → texture mapping can be tested
 * directly: the reaction that calls it lives on the UI thread, and a renderer
 * cannot step a shared value across a threshold to prove the edge.
 */
export const fireVerdictFeedback = (tone: number): void => {
  TONE_FEEDBACK[tone as VerdictTone]?.();
};

export interface CardVerdictResult {
  /** Which verdict is showing — read on the UI thread to pick a colour. */
  verdictTone: SharedValue<number>;
  /** 0..1 strength. Drives the ring's opacity, the wash, and the pop. */
  verdictLevel: SharedValue<number>;
  /** Horizontal offset in points for the miss shake. Zero for every other tone. */
  verdictShake: SharedValue<number>;
  /** Play the verdict for a grade that has just been committed. */
  playVerdict: (confidence: WordConfidence) => void;
  /** Clear the verdict — call when the card changes. */
  resetVerdict: () => void;
}

/**
 * The verdict a graded review card shows before it leaves.
 *
 * Owns three shared values and the haptic that goes with them. It is a hook
 * rather than inline state on the card because the haptic has to be fired from
 * the animation's own frame, and that reaction has to live next to the value it
 * watches.
 *
 * Deliberately NOT on Reanimated's CSS API, unlike the card's flip and its
 * entrance. Those are state-driven and replay on mount, which is the case the
 * docs put in the CSS column. A verdict is fired at an arbitrary moment from a
 * grade callback with no state change and no remount to hang keyframes on, so
 * it belongs with the gesture work on shared values — the same split the card
 * already documents.
 */
export const useCardVerdict = (): CardVerdictResult => {
  const verdictTone = useSharedValue<number>(VERDICT_TONE.NONE);
  const verdictLevel = useSharedValue(0);
  const verdictShake = useSharedValue(0);

  /**
   * The outcome haptic, fired on the frame the verdict crosses most of its
   * strength — roughly 55ms into the 90ms ignite, so the buzz and the colour
   * are one event.
   *
   * Rising edge only. The decay back through the same level on the way out is
   * not a second outcome, and neither is the reset to zero on a card change. A
   * miss settling to RESIDUAL (below the threshold) correctly re-arms it for
   * the next card.
   */
  useAnimatedReaction(
    () => {
      'worklet';
      return verdictLevel.get() >= VERDICT.HAPTIC_AT;
    },
    (isPeak, wasPeak) => {
      'worklet';
      if (isPeak && wasPeak === false) {
        scheduleOnRN(fireVerdictFeedback, verdictTone.get());
      }
    },
  );

  const animateVerdict = useCallback(
    (tone: number) => {
      'worklet';
      cancelAnimation(verdictLevel);
      cancelAnimation(verdictShake);
      // Ignite from zero, always. The haptic hangs off a RISING crossing of
      // HAPTIC_AT, so a verdict starting from a level already above it would
      // animate and stay silent. Cancelling leaves the value wherever it was,
      // which after a miss is RESIDUAL and after an interrupted ignite could be
      // anything — 90ms from zero is imperceptible next to losing the buzz.
      verdictLevel.set(0);
      verdictTone.set(tone);

      if (tone === VERDICT_TONE.WRONG) {
        // A miss holds. The card is not leaving — it stays for the restudy hold
        // — so the ring settles to a low steady red instead of decaying away,
        // and reads as "this is the one you missed" for as long as you study it.
        verdictLevel.set(
          withSequence(withTiming(1, VERDICT.IGNITE), withTiming(VERDICT.RESIDUAL, VERDICT.SETTLE)),
        );
        // A wince, not a tantrum: three decaying beats and done. This rides its
        // own shared value on its own layer rather than joining the drag's
        // translateX, so a swipe-left shake composes with the spring home
        // instead of fighting it for the same value.
        const { AMPLITUDE, STEP } = VERDICT.SHAKE;
        const step = { duration: STEP };
        verdictShake.set(
          withSequence(
            withTiming(AMPLITUDE, step),
            withTiming(-AMPLITUDE * 0.8, step),
            withTiming(AMPLITUDE * 0.4, step),
            withTiming(0, step),
          ),
        );
        return;
      }

      // Correct and Almost both leave. Hold at full strength for the rest of
      // the beat, then release on CARD_EXIT's own duration so the verdict and
      // the card's departure land on the same frame.
      verdictShake.set(0);
      verdictLevel.set(
        withSequence(
          withTiming(1, VERDICT.IGNITE),
          withDelay(
            Math.max(0, VERDICT.BEAT - VERDICT.IGNITE.duration),
            withTiming(0, VERDICT.DECAY),
          ),
        ),
      );
    },
    [verdictTone, verdictLevel, verdictShake],
  );

  const clearVerdict = useCallback(() => {
    'worklet';
    // Cancel before assigning. Writing over a RUNNING animation cancels it and
    // invokes its completion callback, which is how this file's neighbours have
    // recursed before; cancelling first leaves nothing to re-enter.
    cancelAnimation(verdictLevel);
    cancelAnimation(verdictShake);
    verdictLevel.set(0);
    verdictShake.set(0);
    verdictTone.set(VERDICT_TONE.NONE);
  }, [verdictTone, verdictLevel, verdictShake]);

  const playVerdict = useCallback(
    (confidence: WordConfidence) => {
      scheduleOnUI(animateVerdict, TONE_FOR_CONFIDENCE[confidence]);
    },
    [animateVerdict],
  );

  const resetVerdict = useCallback(() => {
    scheduleOnUI(clearVerdict);
  }, [clearVerdict]);

  return { verdictTone, verdictLevel, verdictShake, playVerdict, resetVerdict };
};
