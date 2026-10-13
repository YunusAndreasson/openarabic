import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import { PRACTICE_REPLAY } from '@/constants/animation';

/**
 * The practice screen's figures, in the three groups they are read in: what is
 * due, what memory holds, and the habit numbers.
 */
export interface FigureGroups<Cost, Memory, Habit> {
  cost: Cost;
  memory: Memory;
  habit: Habit;
}

/**
 * Where the screen is in showing a change:
 *
 * - `present`: in view and up to date — the live figures pass straight through.
 * - `away`: covered. Whatever was on screen when it was covered stays there.
 * - `arriving`: back in view, giving the screen that covered it time to leave.
 * - `settling`: waiting on a refetch still in flight, up to a cap.
 * - `cost`, `memory`: the first, then the first two groups have been released.
 */
type Stage = 'present' | 'away' | 'arriving' | 'settling' | 'cost' | 'memory';

interface Hold<Figures> {
  isFocused: boolean;
  stage: Stage;
  /** The figures on screen when the tab was covered. */
  held: Figures;
  /**
   * Whether `held` was ever actually on screen. Only figures the learner saw
   * are worth holding: a snapshot taken while the screen was still loading, or
   * showing its empty state, is a set of placeholder zeros, and holding those
   * would count every card up from nothing the first time it appeared.
   */
  wasShown: boolean;
}

function compose<Cost, Memory, Habit>(
  stage: Stage,
  held: FigureGroups<Cost, Memory, Habit>,
  live: FigureGroups<Cost, Memory, Habit>,
): FigureGroups<Cost, Memory, Habit> {
  switch (stage) {
    case 'present':
      return live;
    case 'cost':
      return { cost: live.cost, memory: held.memory, habit: held.habit };
    case 'memory':
      return { cost: live.cost, memory: live.memory, habit: held.habit };
    default:
      return held;
  }
}

/**
 * Holds the practice screen's figures still while the tab is covered, and plays
 * their changes when it comes back into view.
 *
 * The tab stays mounted under the review screen and refetches there — the
 * completion screen invalidates the word queries the moment it mounts. So every
 * number had already changed by the time the learner tapped Continue, and the
 * screen they returned to showed the result of a session without any of it
 * having visibly happened. Each figure animates its own changes; they were
 * simply animating to an empty room.
 *
 * So: while the tab is out of view, it shows what it showed when it was
 * covered. Back in view, it lets the covering screen leave, waits for a refetch
 * still in flight (bounded — a slow network must not leave stale numbers up),
 * and then releases the three groups a beat apart, top to bottom: what was due,
 * what memory did with it, the habit numbers.
 *
 * Deliberately not told about review sessions. The rule is "changes play when
 * you are looking", which is also right for coming back from another tab or a
 * sheet, and it needs nothing from the session to hold.
 *
 * @param live the current figures.
 * @param isSettled false while a refetch that could change them is in flight.
 * @param isShowing whether the cards are on screen with real figures in them —
 *   false behind the loading, empty and error states.
 */
export function useHeldFigures<Cost, Memory, Habit>(
  live: FigureGroups<Cost, Memory, Habit>,
  isSettled: boolean,
  isShowing: boolean,
): FigureGroups<Cost, Memory, Habit> {
  const isFocused = useIsFocused();
  const reduceMotion = useReducedMotion();

  const [hold, setHold] = useState<Hold<FigureGroups<Cost, Memory, Habit>>>(() => ({
    isFocused,
    stage: 'present',
    held: live,
    wasShown: false,
  }));

  // Adjusted during render, not in an effect: an effect would let one frame of
  // the new figures through before the hold caught them.
  if (hold.isFocused !== isFocused) {
    if (isFocused) {
      // Nothing to play unless there is something the learner saw to play it
      // from. This tab can mount, and even be covered, before its words have
      // loaded; coming into view then is a first showing, not a return.
      setHold({ ...hold, isFocused, stage: hold.wasShown ? 'arriving' : 'present' });
    } else {
      setHold({
        isFocused,
        stage: 'away',
        // Covered part-way through a release: keep exactly what was on screen.
        held: compose(hold.stage, hold.held, live),
        wasShown: isShowing,
      });
    }
  } else if (hold.stage === 'settling' && isSettled) {
    // Nothing in the beats moves under reduced motion, so there is nothing to
    // space out: everything lands at once.
    setHold({ ...hold, stage: reduceMotion ? 'present' : 'cost' });
  }

  const { stage } = hold;

  useEffect(() => {
    const advance = (from: Stage, to: Stage, delay: number): (() => void) => {
      const timer = setTimeout(() => {
        // Guarded on the stage it was scheduled from: the tab may have been
        // covered again in the meantime.
        setHold(current => (current.stage === from ? { ...current, stage: to } : current));
      }, delay);
      return () => clearTimeout(timer);
    };

    switch (stage) {
      case 'arriving':
        return advance('arriving', 'settling', PRACTICE_REPLAY.START_DELAY);
      case 'settling':
        return advance(
          'settling',
          reduceMotion ? 'present' : 'cost',
          PRACTICE_REPLAY.MAX_WAIT - PRACTICE_REPLAY.START_DELAY,
        );
      case 'cost':
        return advance('cost', 'memory', PRACTICE_REPLAY.BEAT);
      case 'memory':
        return advance('memory', 'present', PRACTICE_REPLAY.BEAT);
      default:
        return undefined;
    }
  }, [stage, reduceMotion]);

  return compose(hold.stage, hold.held, live);
}
