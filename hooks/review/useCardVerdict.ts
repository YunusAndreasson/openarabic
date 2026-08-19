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
import { scheduleOnRN } from 'react-native-worklets';

import { VERDICT } from '@/constants/animation';
import type { WordConfidence } from '@/types/review.types';
import { commitFeedback, errorFeedback, lightFeedback } from '@/utils/haptics';

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
 * Which verdict a grade shows. Pure, and exported because the mapping IS the
 * decision — it is worth testing without a renderer or a UI thread in the way.
 *
 * `playVerdict` must go through this rather than indexing `TONE_FOR_CONFIDENCE`
 * itself — it used to, which left the tested mapping and the rendered one as two
 * separate paths that only happened to agree.
 */
export const resolveVerdictTone = (confidence: WordConfidence): VerdictTone =>
  TONE_FOR_CONFIDENCE[confidence];

/**
 * The outcome haptic, one per tone. Tiers 1–3 of the ladder in utils/haptics.
 *
 * Weighted the same way the rest of the session already weights its feedback: a
 * miss is heavier than a clean recall. `commitFeedback` rather than
 * `successFeedback` for a correct card — see utils/haptics for why a two-tap
 * notification texture is the wrong weight for something that fires nine times
 * in ten.
 *
 * ALMOST is `lightFeedback`, NOT `selectionFeedback`. Selection is tier 0 — the
 * texture every press in the session now uses to say "heard you, nothing has
 * been decided". A grade is a decision, and the faintest tick in the app cannot
 * be both the acknowledgement of a button and one of the three outcomes that
 * feed FSRS. Light is the smallest step that keeps "Guessed" above a press
 * without pretending it is as firm as a clean recall.
 */
const TONE_FEEDBACK: Partial<Record<VerdictTone, () => void>> = {
  [VERDICT_TONE.CORRECT]: commitFeedback,
  [VERDICT_TONE.ALMOST]: lightFeedback,
  [VERDICT_TONE.WRONG]: errorFeedback,
};

/**
 * The JS-side landing point of the animation's haptic reaction.
 *
 * `NONE` has no entry and no haptic — there is no outcome to report. Exported
 * so the tone → texture mapping can be tested directly: the reaction that calls
 * it lives on the UI thread, and a renderer cannot step a shared value across a
 * threshold to prove the edge.
 *
 * Takes `VerdictTone`, not a bare `number`. It used to take a number and cast
 * on the way in — the shared value it reads was itself `SharedValue<number>`,
 * so the closed union was widened at the worklet boundary and narrowed back by
 * assertion at the other end, which is exactly the handoff where a wrong value
 * would arrive. Typed through, a tone outside the four is a compile error at
 * whichever end invents it.
 */
export const fireVerdictFeedback = (tone: VerdictTone): void => {
  TONE_FEEDBACK[tone]?.();
};

export interface CardVerdictResult {
  /** Which verdict is showing — read on the UI thread to pick a colour. */
  verdictTone: SharedValue<VerdictTone>;
  /** 0..1 strength. Drives the ring's opacity, the wash, the pop and the wince. */
  verdictLevel: SharedValue<number>;
  /**
   * 0..1 phase of the miss wobble — NOT an offset in points.
   *
   * The consumer shapes it (`AMPLITUDE · e^(−DAMPING·p) · sin(2π·CYCLES·p)`),
   * which is what lets one linear driver produce both the translation and the
   * counter-rotation from the same envelope. Stays at 0 for every other tone,
   * and 0 is the resting value in the shaped form too — `sin(0) = 0` — so a
   * reset needs no special case.
   */
  verdictShakePhase: SharedValue<number>;
  /**
   * Play the verdict for a grade that has just been committed.
   *
   * `cardKey` identifies the card this verdict belongs to — see the note on
   * `activeKey` below for why a call with no key to check would be unsafe.
   */
  playVerdict: (confidence: WordConfidence, cardKey: string) => void;
  /** Clear the verdict and mark `cardKey` as the card now on screen — call
   *  when the card changes. */
  resetVerdict: (cardKey: string) => void;
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
 * it belongs with the other shared-value work — the same split the card
 * already documents.
 */
export const useCardVerdict = (): CardVerdictResult => {
  const verdictTone = useSharedValue<VerdictTone>(VERDICT_TONE.NONE);
  const verdictLevel = useSharedValue(0);
  const verdictShakePhase = useSharedValue(0);
  /**
   * The card the ring currently belongs to, as told by the last `resetVerdict`
   * (the card component re-syncs this on every card change). `playVerdict`
   * checks its own `cardKey` against this before painting, so a call for a
   * card that isn't current any more is a no-op rather than a wrong paint.
   *
   * `playVerdict`/`resetVerdict` call straight through to their worklets (no
   * `scheduleOnUI`). This check is what every other cross-thread/async
   * handoff in this file's neighbours already carries (useReview's
   * `lastProcessedWordId`, VoiceGradingProvider's `windowSeqRef`) and is
   * cheap insurance against any reordering — but it is NOT what closes the
   * card-comes-up-ringed-for-a-grade-it-never-got bug a background/foreground
   * gap can cause. That bug traces to Reanimated not repainting a native view
   * to match a shared value it mutated while the OS had suspended the UI
   * thread's frame loop — the value reads back correct (confirmed with
   * logging, from both a worklet and the JS thread) even while the screen
   * still shows the stale paint. No amount of re-cancelling or re-setting
   * from here fixes a paint a correct value isn't triggering; see
   * `remountEpoch` in app/review.tsx, which forces a fresh component instance
   * on every foreground return instead.
   */
  const activeKey = useSharedValue<string | null>(null);

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
    (tone: VerdictTone, cardKey: string) => {
      'worklet';
      // Stale: the card this verdict was meant for is no longer the one on
      // screen (see activeKey above). A no-op, not a defensive clamp — there is
      // nothing left on screen this outcome is about.
      if (cardKey !== activeKey.get()) {
        return;
      }

      // A verdict already on the card is not replayed. The voice path marks a
      // mishear wrong the moment it is heard, and the learner's "No, I missed
      // it" then grades the same outcome — replaying would shake a card that is
      // already red and buzz the same conclusion twice. Only tones that HOLD
      // can hit this (a pass decays to zero), which is exactly the case that
      // needs it.
      if (verdictTone.get() === tone && verdictLevel.get() > 0) {
        return;
      }

      cancelAnimation(verdictLevel);
      cancelAnimation(verdictShakePhase);
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
        // A wince, not a tantrum. One linear sweep of the phase; the shape is
        // the consumer's damped sine, so there are no reversal corners for the
        // eye to catch on. This rides its own shared value on its own layer
        // rather than joining the card's translateX, so the wince composes with
        // the left exit a restudy continue starts instead of fighting it for the
        // value.
        //
        // The sweep is linear (see VERDICT.SHAKE.SWEEP) — the envelope owns the
        // deceleration, so easing the phase too would slow the first swing.
        verdictShakePhase.set(0);
        verdictShakePhase.set(withTiming(1, VERDICT.SHAKE.SWEEP));
        return;
      }

      // Correct and Almost both leave. Hold at full strength for the rest of
      // the beat, then release on CARD_EXIT's own duration so the verdict and
      // the card's departure land on the same frame.
      verdictShakePhase.set(0);
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
    [verdictTone, verdictLevel, verdictShakePhase, activeKey],
  );

  const clearVerdict = useCallback(
    (cardKey: string) => {
      'worklet';
      // Claim the card FIRST — a same-tick `animateVerdict` for this same key
      // (a fresh grade on the card that just mounted) must still see itself as
      // current, not raced out by its own reset.
      activeKey.set(cardKey);
      // Cancel before assigning. Writing over a RUNNING animation cancels it and
      // invokes its completion callback, which is how this file's neighbours have
      // recursed before; cancelling first leaves nothing to re-enter.
      cancelAnimation(verdictLevel);
      cancelAnimation(verdictShakePhase);
      verdictLevel.set(0);
      verdictShakePhase.set(0);
      verdictTone.set(VERDICT_TONE.NONE);
    },
    [verdictTone, verdictLevel, verdictShakePhase, activeKey],
  );

  const playVerdict = useCallback(
    (confidence: WordConfidence, cardKey: string) => {
      animateVerdict(resolveVerdictTone(confidence), cardKey);
    },
    [animateVerdict],
  );

  const resetVerdict = useCallback(
    (cardKey: string) => {
      clearVerdict(cardKey);
    },
    [clearVerdict],
  );

  return { verdictTone, verdictLevel, verdictShakePhase, playVerdict, resetVerdict };
};
