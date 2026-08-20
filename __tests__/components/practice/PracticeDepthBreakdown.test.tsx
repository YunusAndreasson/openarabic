/**
 * The sheet under the practice screen's "Reviews done" tile.
 *
 * Two things are worth guarding, and neither is about layout:
 *
 *  1. the three headline numbers say what they mean — the total is exact, the
 *     two averages are marked as averages, and an average with no denominator
 *     is the empty metric rather than a division by zero rendered as NaN or 0;
 *  2. a pending or failed streak fetch shows "—", not a per-day average
 *     computed against zero study days. That is the same rule the streak tile
 *     on the screen above already follows, and for the same reason.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { State } from 'ts-fsrs';

import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { rootId } from '@/__tests__/helpers/ids';
import { PracticeDepthBreakdown } from '@/components/practice/PracticeDepthBreakdown';
import { STRINGS } from '@/constants/strings';
import type { StudyStreak } from '@/services/studyStreak';
import type { StudyWord } from '@/types/vocabulary.types';

/**
 * The `mock` prefix is what lets babel-plugin-jest-hoist reference this from
 * inside the factory below, which is hoisted above every other statement in the
 * file. A plain closure over a mutable object — no `require` of this file from
 * inside itself, which would tie the mock to the file's own path and break the
 * moment it is renamed.
 */
const mockStreak: { streak: StudyStreak | null } = { streak: null };

jest.mock('@/hooks/practice/useStudyStreak', () => ({
  useStudyStreak: () => mockStreak,
}));

const setStreak = (totalReadingDays: number | null): void => {
  mockStreak.streak =
    totalReadingDays === null
      ? null
      : {
          currentStreak: 1,
          longestStreak: 1,
          lastReadingDate: new Date(),
          totalReadingDays,
        };
};

const withReps = (id: number, reps: number): StudyWord =>
  createTestWord({
    root_id: rootId(id),
    fsrs_state: reps > 0 ? State.Review : State.New,
    fsrs_reps: reps,
  });

/** 24 reviews across 5 words: one deep, one solid, one few, one once, one none. */
const words = [withReps(1, 15), withReps(2, 6), withReps(3, 2), withReps(4, 1), withReps(5, 0)];

const average = (value: number): string => STRINGS.DEPTH_AVERAGE.replace('{count}', String(value));

describe('PracticeDepthBreakdown', () => {
  test('the headline is the exact total, and the two averages are marked as such', () => {
    setStreak(3);
    const view = render(<PracticeDepthBreakdown studyWords={words} />);

    // 15 + 6 + 2 + 1 = 24 grades given. Exact, so printed bare.
    expect(view.getByText('24')).toBeTruthy();
    // 24 over 3 study days, and 24 over all 5 saved words — including the one
    // with no reviews, because the rows below count it too. Both are means, so
    // both carry the marker that distinguishes them from the exact count.
    expect(view.getByText(average(8))).toBeTruthy();
    expect(view.getByText(average(5))).toBeTruthy();
  });

  test('an unread streak shows the empty metric, never an average over zero days', () => {
    setStreak(null);
    const view = render(<PracticeDepthBreakdown studyWords={words} />);

    expect(view.getByText(STRINGS.EMPTY_METRIC)).toBeTruthy();
    // The exact numbers are unaffected by a failed streak fetch.
    expect(view.getByText('24')).toBeTruthy();
    expect(view.getByText(average(5))).toBeTruthy();
  });

  test('a vocabulary with no reviews divides by nothing and says so', () => {
    setStreak(0);
    const view = render(<PracticeDepthBreakdown studyWords={[withReps(1, 0)]} />);

    // Per study day has no denominator at all and says so. Per word divides by a
    // real word, so its answer is an exact zero — printed bare, matching the
    // Total tile beside it rather than claiming to approximate something.
    expect(view.getAllByText(STRINGS.EMPTY_METRIC)).toHaveLength(1);
    expect(view.queryByText(average(0))).toBeNull();
    expect(view.queryByText('NaN')).toBeNull();
    expect(view.getByText(STRINGS.DEPTH_EMPTY)).toBeTruthy();
  });

  test('a real average below a half says so, rather than rounding to zero', () => {
    // One review across three study days. `≈0` beside a Total of `1` reads as a
    // contradiction, and this is the first-week account the sheet should be
    // least discouraging to.
    setStreak(3);
    const view = render(
      <PracticeDepthBreakdown studyWords={[withReps(1, 1), withReps(2, 0), withReps(3, 0)]} />,
    );

    // Both averages are real and both are under a half: 1 ÷ 3 days, 1 ÷ 3 words.
    expect(view.getAllByText(STRINGS.DEPTH_AVERAGE_UNDER_ONE)).toHaveLength(2);
    expect(view.queryByText(average(0))).toBeNull();
    expect(view.queryByText(STRINGS.EMPTY_METRIC)).toBeNull();
  });

  test('"per word" counts every saved word, not only the practised ones', () => {
    // The bug: dividing by reviewed words alone printed "≈12 per word" directly
    // above a row saying 3 of the 4 words had never been reviewed.
    setStreak(2);
    const view = render(
      <PracticeDepthBreakdown
        studyWords={[withReps(1, 12), withReps(2, 0), withReps(3, 0), withReps(4, 0)]}
      />,
    );

    expect(view.getByText(average(3))).toBeTruthy();
    expect(view.queryByText(average(12))).toBeNull();
  });

  test('every band is named, and each carries its own count', () => {
    setStreak(4);
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

  test('a band with words leads somewhere; an empty band does not claim to', () => {
    setStreak(4);
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
