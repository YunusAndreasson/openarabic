import { useState } from 'react';

interface TutorialSteps {
  /** The step on screen, from 0. */
  step: number;
  isLast: boolean;
  /** Advance one step; never past the last. */
  next: () => void;
  /** Back to the first step. */
  reset: () => void;
  /**
   * Run the walkthrough's closing action — at most once per showing. Closing
   * flips `visible` through the parent, which only lands on a later render, so
   * a second tap before that commit would otherwise run it again (and push the
   * starter article twice).
   */
  finish: (action: () => void) => void;
}

/**
 * The step machine the first-run walkthroughs run on — WelcomeIntro and
 * ReviewGradesTutorial — restarting from the first step each time the
 * walkthrough is shown again.
 *
 * They used to carry a copy each, and the copies had drifted: only one clamped
 * `next`. When the JS thread is busy (a review session preparing), several taps
 * can batch into one render with a stale `isLast`, and an unbounded `step + 1`
 * walks past the last step into a fallback state that can never finish.
 */
export function useTutorialSteps(stepCount: number, visible: boolean): TutorialSteps {
  const lastStep = Math.max(0, stepCount - 1);
  const [step, setStep] = useState(0);
  // State, not a ref: it is reset during render below, and a ref written
  // during render is what the React Compiler rejects.
  const [finished, setFinished] = useState(false);

  // Restart on hidden → visible. The "store the previous prop in state"
  // pattern rather than an effect, which would paint the old step first.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setStep(0);
      setFinished(false);
    }
  }

  return {
    step,
    isLast: step >= lastStep,
    next: () => setStep(current => Math.min(current + 1, lastStep)),
    reset: () => setStep(0),
    finish: action => {
      if (finished) return;
      setFinished(true);
      action();
    },
  };
}
