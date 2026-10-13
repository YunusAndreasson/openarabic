/**
 * The practice screen's figures hold still while the tab is covered, and play
 * their changes when it comes back.
 *
 * Without the hold, a review session's whole effect landed under the review
 * screen: the tab refetches while covered, so the numbers had changed before
 * the learner could see them change.
 */

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';

import { PRACTICE_REPLAY } from '@/constants/animation';
import { useHeldFigures, type FigureGroups } from '@/hooks/practice/useHeldFigures';

// A plain function, not a jest.fn: `resetMocks` would strip its implementation.
let mockIsFocused = true;
jest.mock('expo-router', () => ({
  useIsFocused: () => mockIsFocused,
}));

type Figures = FigureGroups<number, number, number>;

const BEFORE: Figures = { cost: 23, memory: 412, habit: 4 };
const AFTER: Figures = { cost: 0, memory: 431, habit: 5 };

interface Props {
  live: Figures;
  settled: boolean;
  /** Whether the cards are on screen. Defaults to true: most cases start there. */
  showing?: boolean;
}

const renderFigures = (initialProps: Props = { live: BEFORE, settled: true }) =>
  renderHook(({ live, settled, showing = true }: Props) => useHeldFigures(live, settled, showing), {
    initialProps,
  });

/**
 * One stage at a time. Each stage's timer is scheduled by an effect, and
 * effects only run when `act` flushes — so a single wait spanning two stages
 * would fire the first timer and never reach the second.
 */
const wait = (ms: number): void => {
  act(() => {
    jest.advanceTimersByTime(ms);
  });
};

/** From the return to the last group being released, stage by stage. */
const waitForFullRelease = (): void => {
  wait(PRACTICE_REPLAY.START_DELAY);
  wait(PRACTICE_REPLAY.BEAT);
  wait(PRACTICE_REPLAY.BEAT);
};

/** Cover the tab, let the figures change underneath it, and come back. */
const returnFromSession = (
  view: ReturnType<typeof renderFigures>,
  { settled }: { settled: boolean },
): void => {
  mockIsFocused = false;
  view.rerender({ live: BEFORE, settled: true });
  view.rerender({ live: AFTER, settled });
  mockIsFocused = true;
  view.rerender({ live: AFTER, settled });
};

describe('useHeldFigures', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockIsFocused = true;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('in view: a change passes straight through', () => {
    const view = renderFigures();

    view.rerender({ live: AFTER, settled: true });

    expect(view.result.current).toEqual(AFTER);
  });

  test('covered: keeps showing what was on screen when it was covered', () => {
    const view = renderFigures();

    mockIsFocused = false;
    view.rerender({ live: BEFORE, settled: true });
    view.rerender({ live: AFTER, settled: true });

    expect(view.result.current).toEqual(BEFORE);
  });

  test('back in view: still holding while the covering screen leaves', () => {
    const view = renderFigures();
    returnFromSession(view, { settled: true });

    wait(PRACTICE_REPLAY.START_DELAY - 1);

    expect(view.result.current).toEqual(BEFORE);
  });

  test('releases in reading order: due, then memory, then habit', () => {
    const view = renderFigures();
    returnFromSession(view, { settled: true });

    wait(PRACTICE_REPLAY.START_DELAY);
    expect(view.result.current).toEqual({ ...BEFORE, cost: AFTER.cost });

    wait(PRACTICE_REPLAY.BEAT);
    expect(view.result.current).toEqual({ ...AFTER, habit: BEFORE.habit });

    wait(PRACTICE_REPLAY.BEAT);
    expect(view.result.current).toEqual(AFTER);
  });

  test('waits for a refetch still in flight, then plays what it brought', () => {
    const view = renderFigures();
    returnFromSession(view, { settled: false });

    wait(PRACTICE_REPLAY.START_DELAY + 100);
    expect(view.result.current).toEqual(BEFORE);

    // The refetch lands with the session's real result.
    const landed: Figures = { cost: 1, memory: 430, habit: 5 };
    view.rerender({ live: landed, settled: true });

    expect(view.result.current).toEqual({ ...BEFORE, cost: landed.cost });
  });

  test('a refetch that never lands cannot keep stale figures on screen', () => {
    const view = renderFigures();
    returnFromSession(view, { settled: false });

    wait(PRACTICE_REPLAY.START_DELAY);
    wait(PRACTICE_REPLAY.MAX_WAIT - PRACTICE_REPLAY.START_DELAY - 1);
    expect(view.result.current).toEqual(BEFORE);

    wait(1);
    expect(view.result.current).toEqual({ ...BEFORE, cost: AFTER.cost });
  });

  test('covered again part-way through: holds exactly what had been released', () => {
    const view = renderFigures();
    returnFromSession(view, { settled: true });
    wait(PRACTICE_REPLAY.START_DELAY);

    mockIsFocused = false;
    view.rerender({ live: AFTER, settled: true });
    wait(PRACTICE_REPLAY.BEAT * 4);

    expect(view.result.current).toEqual({ ...BEFORE, cost: AFTER.cost });
  });

  test('figures nobody saw are not held: a first showing is not a return', () => {
    // Covered while the screen was still on its empty state, then a word is
    // saved elsewhere. Holding the placeholder zeros would put them in the
    // cards and count every number up from nothing.
    const empty: Figures = { cost: 0, memory: 0, habit: 0 };
    const view = renderFigures({ live: empty, settled: true, showing: false });

    mockIsFocused = false;
    view.rerender({ live: empty, settled: true, showing: false });
    mockIsFocused = true;
    view.rerender({ live: AFTER, settled: true, showing: true });

    expect(view.result.current).toEqual(AFTER);
  });

  test('once everything is released, later changes pass straight through', () => {
    const view = renderFigures();
    returnFromSession(view, { settled: true });
    waitForFullRelease();

    const later: Figures = { cost: 3, memory: 431, habit: 5 };
    view.rerender({ live: later, settled: true });

    expect(view.result.current).toEqual(later);
  });
});
