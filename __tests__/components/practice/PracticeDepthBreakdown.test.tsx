/**
 * The sheet under the practice screen's "Reviews done" tile.
 *
 * What is worth guarding is not layout:
 *
 *  1. the two headline numbers say what they mean — the total is exact, the
 *     per-word average is marked as an average, and a zero is printed bare
 *     rather than as an approximation of nothing;
 *  2. there is no per-study-day average. It was divided by a study-day ledger
 *     that undercounts by a multiple, so it could be wrong by ten times;
 *  3. the copy reads the count for what it is — every grade, right or wrong —
 *     and never as mastery.
 */

import { describe, expect, test } from '@jest/globals';
import { render, type RenderResult } from '@testing-library/react-native';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { PracticeDepthBreakdown } from '@/components/practice/PracticeDepthBreakdown';
import { STRINGS } from '@/constants/strings';
import type { StudyWord } from '@/types/vocabulary.types';

const withReps = (id: number, reps: number): StudyWord =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: reps > 0 ? State.Review : State.New,
    fsrs_reps: reps,
  });

/** 24 reviews across 5 words: one deep, one solid, one few, one once, one none. */
const words = [withReps(1, 15), withReps(2, 6), withReps(3, 2), withReps(4, 1), withReps(5, 0)];

const average = (value: number): string => STRINGS.DEPTH_AVERAGE.replace('{count}', String(value));

/** The disclosure signifier, as the icon mock renders it. */
const CHEVRON = 'chevron-forward';

interface RenderedNode {
  children?: (RenderedNode | string)[] | null;
}

/**
 * Every string the tree renders, in painting order.
 *
 * `getAllByText` returns matches grouped per query, which cannot answer "in what
 * order does a reader meet these rows" — and row ORDER is the thing under test.
 */
function renderedTextInOrder(view: RenderResult): string[] {
  const out: string[] = [];

  const walk = (node: RenderedNode | string | null | undefined): void => {
    if (node == null) return;
    if (typeof node === 'string') {
      out.push(node);
      return;
    }
    node.children?.forEach(walk);
  };

  const tree = view.toJSON() as RenderedNode | RenderedNode[] | null;
  if (Array.isArray(tree)) tree.forEach(walk);
  else walk(tree);

  return out;
}

describe('PracticeDepthBreakdown', () => {
  test('the headline is the exact total, and the per-word average is marked as one', () => {
    const view = render(<PracticeDepthBreakdown studyWords={words} />);

    // 15 + 6 + 2 + 1 = 24 grades given. Exact, so printed bare.
    expect(view.getByText('24')).toBeTruthy();
    // 24 over all 5 saved words — including the one with no reviews, because
    // the rows below count it too. A mean, so it carries the marker that
    // distinguishes it from the exact count.
    expect(view.getByText(average(5))).toBeTruthy();
  });

  test('there is no per-study-day average', () => {
    // Its denominator undercounted by a multiple; `≈` could not make it true.
    const view = render(<PracticeDepthBreakdown studyWords={words} />);

    expect(view.queryByText(average(8))).toBeNull();
    // Two readouts: Total and Per word.
    expect(view.getByText(STRINGS.DEPTH_METRIC_TOTAL)).toBeTruthy();
    expect(view.getByText(STRINGS.DEPTH_METRIC_PER_WORD)).toBeTruthy();
  });

  test('a vocabulary with no reviews prints exact zeros, not approximations', () => {
    const view = render(<PracticeDepthBreakdown studyWords={[withReps(1, 0)]} />);

    // Per word divides by a real word, so its answer is an exact zero — printed
    // bare, matching the Total tile beside it rather than claiming to
    // approximate something.
    expect(view.queryByText(STRINGS.EMPTY_METRIC)).toBeNull();
    expect(view.queryByText(average(0))).toBeNull();
    expect(view.queryByText('NaN')).toBeNull();
    expect(view.getByText(STRINGS.DEPTH_EMPTY)).toBeTruthy();
  });

  test('a real average below a half says so, rather than rounding to zero', () => {
    // One review across three saved words. `≈0` beside a Total of `1` reads as
    // a contradiction, and this is the first-week account the sheet should be
    // least discouraging to.
    const view = render(
      <PracticeDepthBreakdown studyWords={[withReps(1, 1), withReps(2, 0), withReps(3, 0)]} />,
    );

    expect(view.getByText(STRINGS.DEPTH_AVERAGE_UNDER_ONE)).toBeTruthy();
    expect(view.queryByText(average(0))).toBeNull();
    expect(view.queryByText(STRINGS.EMPTY_METRIC)).toBeNull();
  });

  test('the copy reads a review count as grades given, never as mastery', () => {
    // `fsrs_reps` counts Again as well as Good, so a word forgotten again and
    // again sits in the deepest band. Nothing on this sheet may call that band
    // easy, reliable or "drilled".
    const view = render(<PracticeDepthBreakdown studyWords={words} />);
    const text = renderedTextInOrder(view).join(' ').toLowerCase();

    for (const claim of ['reliabl', 'drilled', 'ask least', 'bedding in', 'mastered', 'easy']) {
      expect(text).not.toContain(claim);
    }
    expect(view.getByText(STRINGS.DEPTH_EXPLAINER)).toBeTruthy();
  });

  test('"per word" counts every saved word, not only the practised ones', () => {
    // The bug: dividing by reviewed words alone printed "≈12 per word" directly
    // above a row saying 3 of the 4 words had never been reviewed.
    const view = render(
      <PracticeDepthBreakdown
        studyWords={[withReps(1, 12), withReps(2, 0), withReps(3, 0), withReps(4, 0)]}
      />,
    );

    expect(view.getByText(average(3))).toBeTruthy();
    expect(view.queryByText(average(12))).toBeNull();
  });

  test('every band is named, and each carries its own count', () => {
    const view = render(<PracticeDepthBreakdown studyWords={words} />);

    for (const label of [
      STRINGS.DEPTH_BAND_DEEP,
      STRINGS.DEPTH_BAND_SOLID,
      STRINGS.DEPTH_BAND_FEW,
      STRINGS.DEPTH_BAND_ONCE,
      STRINGS.DEPTH_BAND_NONE,
    ]) {
      expect(view.getByText(label)).toBeTruthy();
    }

    // One word in each of the five bands.
    expect(view.getAllByText('1')).toHaveLength(5);
    expect(view.getByText(STRINGS.DEPTH_EXPLAINER)).toBeTruthy();
  });

  test('bands ascend, and the row with no practice behind it comes last', () => {
    // One rule for both breakdown sheets: ascending, residual last. The memory
    // sheet's order is fixed by the constellation it details — HORIZON_BAND_KEYS
    // is the left-to-right order of that chart's log-time axis — so this list is
    // the one that follows. It used to run most-drilled first, which put two
    // identical-looking BreakdownRow lists in front of the learner reading in
    // opposite directions.
    //
    // Asserted against literal labels rather than DEPTH_BAND_KEYS: the hook
    // builds its bands BY mapping that constant, so an assertion that references
    // it passes whichever way the constant is pointing.
    const view = render(<PracticeDepthBreakdown studyWords={words} />);

    const order = renderedTextInOrder(view).filter(text =>
      (
        [
          STRINGS.DEPTH_BAND_ONCE,
          STRINGS.DEPTH_BAND_FEW,
          STRINGS.DEPTH_BAND_SOLID,
          STRINGS.DEPTH_BAND_DEEP,
          STRINGS.DEPTH_BAND_NONE,
        ] as string[]
      ).includes(text),
    );

    expect(order).toEqual([
      STRINGS.DEPTH_BAND_ONCE,
      STRINGS.DEPTH_BAND_FEW,
      STRINGS.DEPTH_BAND_SOLID,
      STRINGS.DEPTH_BAND_DEEP,
      STRINGS.DEPTH_BAND_NONE,
    ]);
  });

  test('the two headline tiles are readouts, so neither claims a disclosure', () => {
    // These are the same `MetricCard` at the same size as the pressable tiles on
    // the practice screen. Every band row below them that has words is a link and
    // carries a chevron; the tiles are not, so they must not.
    const view = render(<PracticeDepthBreakdown studyWords={words} />);

    // Five bands, one word in each, so five linked rows — and nothing else.
    expect(view.getAllByText(CHEVRON)).toHaveLength(5);
  });

  test('a band with words leads somewhere; an empty band does not claim to', () => {
    // Nothing has been reviewed 10+ times here, so that row must not be a link.
    const view = render(<PracticeDepthBreakdown studyWords={[withReps(1, 3)]} />);

    const linked = view.getByLabelText(
      STRINGS.BREAKDOWN_ROW_A11Y.replace('{band}', STRINGS.DEPTH_BAND_FEW)
        .replace('{count}', '1')
        .replace('{clause}', STRINGS.DEPTH_BAND_HINT_FEW),
    );
    expect(linked).toBeTruthy();

    const empty = view.getByLabelText(
      STRINGS.BREAKDOWN_ROW_A11Y_EMPTY.replace('{band}', STRINGS.DEPTH_BAND_DEEP).replace(
        '{clause}',
        STRINGS.DEPTH_BAND_HINT_DEEP,
      ),
    );
    expect(empty).toBeTruthy();
  });
});
